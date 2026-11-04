/**
 * dsh-account-balance — host half.
 *
 * Fetches a user-configured HTTP endpoint on the host (so CORS and secrets stay
 * out of the browser), extracts one value from the JSON response and exposes a
 * tiny JSON API under `/dsh-account-balance/api` for the sidebar footer widget.
 *
 * The plugin deliberately has no runtime dependency besides Node built-ins: it
 * is mounted straight from the profile's node_modules.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

export const name = 'dsh-account-balance'
export const inject = ['webServer']

const ROUTE = '/dsh-account-balance'
const API = ROUTE + '/api'
const REFRESH_INTERVAL_MS = 5 * 60 * 1000
const FETCH_TIMEOUT_MS = 15_000
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024

const DEFAULT_CONFIG = Object.freeze({
  enabled: true,
  url: '{{baseUrl}}/credits',
  baseUrl: '',
  apiKey: '',
  headers: [{ name: 'Authorization', value: 'Bearer {{apiKey}}' }],
  jsonPath: 'data.total_usage',
})

function dshHome() {
  const fromEnv = process.env.DSH_HOME?.trim()
  return fromEnv ? fromEnv : join(homedir(), '.dsh')
}

const CONFIG_DIR = join(dshHome(), 'dsh-account-balance')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

let configCache
let configLoading
let lastResult = null
let inflight = null
let refreshSeq = 0
let timer = null

/* ------------------------------------------------------------------------- */
/* value helpers                                                             */
/* ------------------------------------------------------------------------- */

/** Replace `{{name}}` placeholders; unknown variables become an empty string. */
export function applyVars(text, vars) {
  return String(text).replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key] ?? '') : '',
  )
}

/** Whether a template still references a given variable. */
export function usesVar(text, key) {
  return new RegExp('\\{\\{\\s*' + key + '\\s*\\}\\}').test(String(text))
}

/** Turn `data.balance`, `data["a.b"][0].x` or `$.data.balance` into keys. */
export function pathTokens(path) {
  const raw = String(path ?? '').trim()
  if (raw === '' || raw === '$') return []
  let text = raw.startsWith('$.') ? raw.slice(2) : raw.startsWith('$') ? raw.slice(1) : raw
  const tokens = []
  let index = 0
  while (index < text.length) {
    const char = text[index]
    if (char === '.') {
      index += 1
      continue
    }
    if (char === '[') {
      const end = text.indexOf(']', index)
      if (end < 0) {
        tokens.push(text.slice(index + 1))
        break
      }
      let inside = text.slice(index + 1, end).trim()
      if (
        inside.length >= 2 &&
        ((inside[0] === '"' && inside[inside.length - 1] === '"') ||
          (inside[0] === "'" && inside[inside.length - 1] === "'"))
      ) {
        inside = inside.slice(1, -1)
      }
      if (inside !== '') tokens.push(inside)
      index = end + 1
      continue
    }
    let end = index
    while (end < text.length && text[end] !== '.' && text[end] !== '[') end += 1
    tokens.push(text.slice(index, end))
    index = end
  }
  return tokens
}

/** Resolve a dotted path; returns undefined when any step is missing. */
export function resolvePath(root, path) {
  let current = root
  for (const key of pathTokens(path)) {
    if (current === null || current === undefined) return undefined
    if (Object.prototype.hasOwnProperty.call(Object(current), key)) {
      current = current[key]
      continue
    }
    return undefined
  }
  return current
}

/** Compact human-readable form of the extracted value. */
export function formatValue(value) {
  if (value === null) return 'null'
  if (value === undefined) return ''
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value)
    return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value)
  }
  if (typeof value === 'string') return value
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  try {
    const text = JSON.stringify(value)
    return text.length > 400 ? text.slice(0, 400) + '…' : text
  } catch {
    return String(value)
  }
}

/* ------------------------------------------------------------------------- */
/* config                                                                    */
/* ------------------------------------------------------------------------- */

function asText(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function normalizeHeaders(raw, fallback) {
  if (!Array.isArray(raw)) return fallback.map((h) => ({ ...h }))
  const rows = []
  for (const item of raw.slice(0, 30)) {
    if (item === null || typeof item !== 'object') continue
    const headerName = asText(item.name ?? item.key).slice(0, 200)
    const headerValue = asText(item.value).slice(0, 8192)
    if (headerName.trim() === '') continue
    rows.push({ name: headerName, value: headerValue })
  }
  return rows
}

/** Coerce untrusted request JSON into the stored config shape. */
export function normalizeConfig(raw, base = DEFAULT_CONFIG) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const pick = (key, max, fallback) => asText(source[key], fallback).slice(0, max)
  return {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : base.enabled,
    url: pick('url', 2048, base.url),
    baseUrl: pick('baseUrl', 2048, base.baseUrl),
    apiKey: pick('apiKey', 8192, base.apiKey),
    headers: normalizeHeaders(source.headers, base.headers),
    jsonPath: pick('jsonPath', 300, base.jsonPath),
  }
}

/** Seed a first-run key from a conventional environment variable. */
function defaultConfig() {
  const seeded = {
    ...DEFAULT_CONFIG,
    headers: DEFAULT_CONFIG.headers.map((h) => ({ ...h })),
  }
  const fromEnv =
    process.env.DSH_BALANCE_API_KEY?.trim() || process.env.CC_SWITCH_DSH_QIU?.trim() || ''
  if (fromEnv && seeded.apiKey === '') seeded.apiKey = fromEnv
  return seeded
}

async function writeConfig(config) {
  await mkdir(CONFIG_DIR, { recursive: true })
  const tmp = CONFIG_FILE + '.tmp-' + process.pid
  await writeFile(tmp, JSON.stringify(config, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 })
  await rename(tmp, CONFIG_FILE)
}

async function loadConfig() {
  try {
    const text = await readFile(CONFIG_FILE, 'utf8')
    const parsed = JSON.parse(text)
    return normalizeConfig(parsed, defaultConfig())
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      const seeded = defaultConfig()
      try {
        await writeConfig(seeded)
      } catch {
        /* read-only home: keep the in-memory default */
      }
      return seeded
    }
    // A broken file must not brick the plugin; fall back to defaults and keep
    // the original untouched so the user can inspect it.
    return defaultConfig()
  }
}

async function getConfig() {
  if (configCache !== undefined) return configCache
  if (configLoading === undefined) {
    configLoading = loadConfig()
      .then((config) => {
        configCache = config
        return config
      })
      .finally(() => {
        configLoading = undefined
      })
  }
  return configLoading
}

async function putConfig(next) {
  configCache = next
  await writeConfig(next)
  return next
}

/* ------------------------------------------------------------------------- */
/* fetching                                                                  */
/* ------------------------------------------------------------------------- */

function configProblem(config) {
  if (!config.enabled) return '已停用'
  if (config.url.trim() === '') return '请填写 URL'
  const templates = [config.url, ...config.headers.map((h) => h.name), ...config.headers.map((h) => h.value)]
  if (templates.some((text) => usesVar(text, 'apiKey')) && config.apiKey.trim() === '') {
    return '请填写 API Key'
  }
  return ''
}

function resultError(message) {
  return {
    ok: false,
    error: String(message).slice(0, 600),
    updatedAt: new Date().toISOString(),
  }
}

async function fetchBalance(config) {
  const problem = configProblem(config)
  if (problem !== '') return resultError(problem)

  const vars = { baseUrl: config.baseUrl, apiKey: config.apiKey }
  const url = applyVars(config.url, vars).trim()
  if (!/^https?:\/\//i.test(url)) return resultError('URL 必须以 http:// 或 https:// 开头')

  const headers = {}
  for (const row of config.headers) {
    const headerName = applyVars(row.name, vars).trim()
    if (headerName === '') continue
    headers[headerName] = applyVars(row.value, vars)
  }

  const startedAt = Date.now()
  let response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return resultError('请求失败：' + reason)
  }

  let text
  try {
    text = await response.text()
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return resultError('读取响应失败：' + reason)
  }
  if (text.length > MAX_RESPONSE_BYTES) return resultError('响应超过 2 MiB，已放弃解析')

  if (!response.ok) {
    const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 180)
    return resultError('HTTP ' + response.status + (snippet ? '：' + snippet : ''))
  }

  let body
  try {
    body = JSON.parse(text)
  } catch {
    return resultError('响应不是合法 JSON')
  }

  const value = resolvePath(body, config.jsonPath)
  if (value === undefined) {
    return resultError(config.jsonPath.trim() === '' ? '已拿到响应，但未填写结果 JSON 键' : '响应中找不到 ' + config.jsonPath)
  }

  const display = formatValue(value)
  return {
    ok: true,
    display,
    kind: typeof value,
    jsonPath: config.jsonPath,
    status: response.status,
    durationMs: Date.now() - startedAt,
    updatedAt: new Date().toISOString(),
  }
}

function refresh(force = false) {
  if (inflight !== null && !force) return inflight
  // A config save while a fetch is in flight must not let the old response
  // overwrite the new result (or repopulate a disabled widget). Each run gets
  // a sequence number; only the newest run may publish its result.
  const seq = ++refreshSeq
  const pending = (async () => {
    const config = await getConfig()
    if (!config.enabled) {
      if (seq === refreshSeq) {
        lastResult = { ok: false, error: '已停用', updatedAt: new Date().toISOString() }
      }
      return lastResult
    }
    const result = await fetchBalance(config)
    if (seq !== refreshSeq) return lastResult
    lastResult = result
    return result
  })().finally(() => {
    if (inflight === pending) inflight = null
  })
  inflight = pending
  return pending
}

async function statePayload() {
  const config = await getConfig()
  if (lastResult === null) {
    const problem = configProblem(config)
    if (problem !== '') lastResult = resultError(problem)
    else void refresh()
  }
  return {
    config,
    result: lastResult,
    pending: inflight !== null,
    refreshIntervalSec: Math.round(REFRESH_INTERVAL_MS / 1000),
  }
}

/* ------------------------------------------------------------------------- */
/* HTTP route                                                                */
/* ------------------------------------------------------------------------- */

function sendJson(response, status, body) {
  if (response.writableEnded || response.destroyed) return
  const payload = JSON.stringify(body)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(payload),
  })
  response.end(payload)
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    request.on('data', (chunk) => {
      size += chunk.length
      if (size > 1024 * 1024) {
        reject(new Error('request body too large'))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    request.on('error', reject)
  })
}

/**
 * The route has no cookie auth of its own, so it relies on the browser's
 * same-origin fence: cross-site fetches are rejected before any body is read.
 * Non-browser local clients (curl, tests) send neither header and stay usable.
 */
function trustedRequest(request) {
  if (request.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = request.headers.origin
  if (origin === undefined || origin === '') return true
  try {
    return new URL(origin).host === request.headers.host
  } catch {
    return false
  }
}

function isJsonRequest(request) {
  const type = request.headers['content-type'] ?? ''
  return type.toLowerCase().includes('application/json')
}

async function handle(request, response) {
  if (!trustedRequest(request)) {
    sendJson(response, 403, { ok: false, error: 'cross-origin request rejected' })
    return
  }
  const url = new URL(request.url ?? '/', 'http://localhost')
  if (url.pathname !== API && !url.pathname.startsWith(API + '/')) {
    sendJson(response, 404, { ok: false, error: 'not found' })
    return
  }
  const action = url.pathname.slice(API.length + 1)
  const method = (request.method ?? 'GET').toUpperCase()

  try {
    if (action === 'state' && method === 'GET') {
      sendJson(response, 200, { ok: true, state: await statePayload() })
      return
    }

    if (method === 'POST' && !isJsonRequest(request)) {
      sendJson(response, 415, { ok: false, error: 'content-type must be application/json' })
      return
    }

    if (action === 'refresh' && method === 'POST') {
      const result = await refresh()
      sendJson(response, 200, { ok: true, state: { ...(await statePayload()), result } })
      return
    }

    if (action === 'config' && method === 'POST') {
      const raw = await readBody(request)
      let parsed
      try {
        parsed = raw.trim() === '' ? {} : JSON.parse(raw)
      } catch {
        sendJson(response, 400, { ok: false, error: '无效的 JSON' })
        return
      }
      const current = await getConfig()
      const next = normalizeConfig(parsed, current)
      await putConfig(next)
      lastResult = null
      // Invalidate any in-flight fetch that still carries the previous config.
      refreshSeq += 1
      if (next.enabled) void refresh(true)
      sendJson(response, 200, { ok: true, state: await statePayload() })
      return
    }

    if (action === 'reset' && method === 'POST') {
      const next = defaultConfig()
      await putConfig(next)
      lastResult = null
      // Invalidate any in-flight fetch that still carries the previous config.
      refreshSeq += 1
      if (next.enabled) void refresh(true)
      sendJson(response, 200, { ok: true, state: await statePayload() })
      return
    }

    sendJson(response, 405, { ok: false, error: 'method not allowed' })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    sendJson(response, 500, { ok: false, error: message.slice(0, 600) })
  }
}

/* ------------------------------------------------------------------------- */
/* plugin                                                                    */
/* ------------------------------------------------------------------------- */

export function apply(ctx) {
  const log = (level, message) => {
    try {
      const logger = ctx.logger
      if (logger && typeof logger[level] === 'function') logger[level](message)
    } catch {
      /* logging must never break the plugin */
    }
  }

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'prefix',
        path: ROUTE,
        handler: async (request, response) => {
          try {
            await handle(request, response)
          } catch (error) {
            log('warn', '[dsh-account-balance] route failed: ' + (error instanceof Error ? error.message : String(error)))
            sendJson(response, 500, { ok: false, error: 'internal error' })
          }
        },
      }),
    'dsh-account-balance: api route',
  )

  ctx.effect(() => {
    const tick = async () => {
      try {
        const config = await getConfig()
        if (config.enabled && configProblem(config) === '' && inflight === null) await refresh()
      } catch (error) {
        log('warn', '[dsh-account-balance] auto refresh failed: ' + (error instanceof Error ? error.message : String(error)))
      }
    }
    timer = setInterval(tick, REFRESH_INTERVAL_MS)
    timer.unref?.()
    return () => {
      if (timer !== null) clearInterval(timer)
      timer = null
    }
  }, 'dsh-account-balance: auto refresh')
}
