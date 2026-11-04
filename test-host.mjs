import assert from 'node:assert/strict'
import http from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const home = await mkdtemp(join(tmpdir(), 'dsh-balance-test-'))
process.env.DSH_HOME = home
delete process.env.DSH_BALANCE_API_KEY
delete process.env.CC_SWITCH_DSH_QIU

let seenAuth = ''
const target = http.createServer(async (req, res) => {
  seenAuth = req.headers.authorization || ''
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (url.searchParams.get('delay') === '1') {
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }
  const balance = url.searchParams.get('v') === null ? 2.79 : Number(url.searchParams.get('v'))
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify({ data: { balance, nested: { list: [{ total: '42.5' }] } } }))
})
await new Promise((resolve) => target.listen(0, '127.0.0.1', resolve))
const targetPort = target.address().port

const mod = await import('./lib/index.js')

assert.equal(mod.applyVars('Bearer {{apiKey}} @ {{baseUrl}}', { apiKey: 'k', baseUrl: 'u' }), 'Bearer k @ u')
assert.deepEqual(mod.pathTokens('$.data.items[0]["a.b"].x'), ['data', 'items', '0', 'a.b', 'x'])
assert.equal(mod.resolvePath({ data: { items: [{ 'a.b': { x: 7 } }] } }, 'data.items[0]["a.b"].x'), 7)
assert.equal(mod.formatValue(2.79), '2.79')
assert.equal(mod.resolvePath({}, 'a.b'), undefined)

let route
const ctx = {
  logger: { warn: () => {}, info: () => {} },
  effect(fn) {
    return fn()
  },
  webServer: {
    register(candidate) {
      route = candidate
      return () => {}
    },
  },
}
mod.apply(ctx)
assert.equal(route.kind, 'prefix')
assert.equal(route.path, '/dsh-account-balance')

const app = http.createServer((req, res) => void route.handler(req, res))
await new Promise((resolve) => app.listen(0, '127.0.0.1', resolve))
const appPort = app.address().port
const base = `http://127.0.0.1:${appPort}/dsh-account-balance/api`

async function call(path, method = 'GET', body) {
  const response = await fetch(base + path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  return response.json()
}

async function waitForResult() {
  for (let i = 0; i < 50; i++) {
    const payload = await call('/state')
    if (payload.state.result && !payload.state.pending) return payload.state
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error('timed out waiting for result')
}

let payload = await call('/state')
assert.equal(payload.ok, true)
assert.equal(payload.state.config.jsonPath, 'data.total_usage')
let state = await waitForResult()
assert.equal(state.result.ok, false)
assert.match(state.result.error, /API Key/)

// Save a working config pointed at the mock server.
payload = await call('/config', 'POST', {
  enabled: true,
  url: `http://127.0.0.1:${targetPort}/api/me`,
  baseUrl: '',
  apiKey: 'secret-key',
  headers: [{ name: 'Authorization', value: 'Bearer {{apiKey}}' }],
  jsonPath: 'data.balance',
})
assert.equal(payload.ok, true)
state = await waitForResult()
assert.equal(state.result.ok, true, JSON.stringify(state.result))
assert.equal(state.result.display, '2.79')
assert.equal(seenAuth, 'Bearer secret-key')

// Array + bracket path.
payload = await call('/config', 'POST', {
  enabled: true,
  url: `http://127.0.0.1:${targetPort}/api/me`,
  baseUrl: '',
  apiKey: '',
  headers: [],
  jsonPath: 'data.nested.list[0].total',
})
state = await waitForResult()
assert.equal(state.result.ok, true, JSON.stringify(state.result))
assert.equal(state.result.display, '42.5')

// Missing path reports a readable error instead of a fake 0.
payload = await call('/config', 'POST', {
  enabled: true,
  url: `http://127.0.0.1:${targetPort}/api/me`,
  baseUrl: '',
  apiKey: '',
  headers: [],
  jsonPath: 'data.missing',
})
state = await waitForResult()
assert.equal(state.result.ok, false)
assert.match(state.result.error, /data\.missing/)

// Disabled config clears the value and skips the network.
payload = await call('/config', 'POST', {
  enabled: false,
  url: `http://127.0.0.1:${targetPort}/api/me`,
  baseUrl: '',
  apiKey: '',
  headers: [],
  jsonPath: 'data.balance',
})
assert.equal(payload.state.config.enabled, false)
assert.equal(payload.state.result.ok, false)
assert.match(payload.state.result.error, /已停用/)

// Reset returns to the shipped defaults.
payload = await call('/reset', 'POST', {})
assert.equal(payload.ok, true)
assert.equal(payload.state.config.url, '{{baseUrl}}/credits')
assert.equal(payload.state.config.jsonPath, 'data.total_usage')

// Bad JSON body.
const bad = await fetch(base + '/config', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: '{',
})
assert.equal(bad.status, 400)

// A cross-site browser request is rejected before it can rewrite the config.
const crossSite = await fetch(base + '/config', {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: 'http://evil.example' },
  body: JSON.stringify({ url: 'http://evil.example/steal' }),
})
assert.equal(crossSite.status, 403)

// Simple cross-site form posts cannot satisfy the JSON content type.
const formPost = await fetch(base + '/config', {
  method: 'POST',
  headers: { 'content-type': 'text/plain' },
  body: 'x',
})
assert.equal(formPost.status, 415)

// Manual refresh uses the same JSON contract as the widget.
await call('/config', 'POST', {
  enabled: true,
  url: `http://127.0.0.1:${targetPort}/api/me`,
  baseUrl: '',
  apiKey: '',
  headers: [],
  jsonPath: 'data.balance',
})
const refreshed = await call('/refresh', 'POST', {})
assert.equal(refreshed.ok, true)
assert.equal(refreshed.state.result.ok, true)

// Saving a new config while an older fetch is still in flight must let the
// new config win, and the late old response must not overwrite it.
await call('/config', 'POST', {
  enabled: true,
  url: `http://127.0.0.1:${targetPort}/api/me?delay=1&v=1`,
  baseUrl: '',
  apiKey: '',
  headers: [],
  jsonPath: 'data.balance',
})
await call('/config', 'POST', {
  enabled: true,
  url: `http://127.0.0.1:${targetPort}/api/me?v=2`,
  baseUrl: '',
  apiKey: '',
  headers: [],
  jsonPath: 'data.balance',
})
state = await waitForResult()
assert.equal(state.result.display, '2', JSON.stringify(state.result))
await new Promise((resolve) => setTimeout(resolve, 1800))
state = (await call('/state')).state
assert.equal(state.result.display, '2', 'a late response from the old config overwrote the new one')

await new Promise((resolve) => app.close(resolve))
await new Promise((resolve) => target.close(resolve))
await rm(home, { recursive: true, force: true })
console.log('host integration test passed')
