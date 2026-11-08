/**
 * dsh-account-balance — browser half.
 *
 * A plain `window.__ModuleLoader__` bundle (no build step): it registers one
 * row into the native sidebar's `sidebar.footer.action` slot, directly above
 * the account row, and opens a small configuration panel when clicked.
 */
;(() => {
  window.__ModuleLoader__.load({
    id: 'dsh-account-balance',
    factory: (require) => {
      const module = { exports: {} }
      const React = require('react')
      const ReactDOM = require('react-dom')
      const h = React.createElement

      const API = '/dsh-account-balance/api'
      const CSS_ID = 'dsh-account-balance/styles'
      const PANEL_WIDTH = 380

      /* ------------------------------------------------------------------ */
      /* styles                                                              */
      /* ------------------------------------------------------------------ */

      const CSS = `
.dsab-wrap{position:relative;display:flex;align-items:center;width:100%;min-width:0;margin:2px 0}
.dsab-row{display:flex;align-items:center;gap:8px;width:100%;min-width:0;height:34px;padding:0 28px 0 8px;border:0;border-radius:var(--dsw-radius-md,8px);background:transparent;color:var(--dsw-alias-label-primary,#1f2329);font:inherit;font-size:13px;line-height:1;text-align:left;cursor:pointer;box-sizing:border-box;transition:background .12s ease}
.dsab-row:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12))}
.dsab-row:focus-visible{outline:2px solid var(--dsw-focus-ring-color,#4d6bfe);outline-offset:1px}
.dsab-wrap[data-compact="true"] .dsab-row{width:34px;height:34px;padding:0;justify-content:center}
.dsab-wrap[data-compact="true"]{justify-content:center}
.dsab-glyph{display:inline-flex;align-items:center;justify-content:center;flex:none;width:18px;height:18px;color:var(--dsw-alias-label-secondary,#646a73)}
.dsab-label{flex:none;color:var(--dsw-alias-label-secondary,#646a73);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsab-value{margin-left:auto;font-variant-numeric:tabular-nums;font-weight:600;letter-spacing:-.01em;color:var(--dsw-alias-label-primary,#1f2329);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsab-wrap[data-error="true"] .dsab-value{color:var(--dsw-alias-state-business-primary,#e5484d)}
.dsab-wrap[data-muted="true"] .dsab-value{color:var(--dsw-alias-label-tertiary,#8f959e);font-weight:500}
.dsab-refresh{position:absolute;right:4px;top:50%;transform:translateY(-50%);display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary,#8f959e);cursor:pointer;opacity:0;transition:opacity .12s ease,background .12s ease}
.dsab-wrap:hover .dsab-refresh,.dsab-refresh:focus-visible{opacity:1}
.dsab-refresh:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));color:var(--dsw-alias-label-primary,#1f2329)}
.dsab-refresh:disabled{cursor:default}
.dsab-spin{animation:dsab-spin .9s linear infinite;transform-origin:50% 50%}
@keyframes dsab-spin{to{transform:rotate(360deg)}}

.dsab-overlay{position:fixed;inset:0;z-index:2147483000;background:transparent}
.dsab-panel{position:fixed;z-index:2147483001;box-sizing:border-box;display:flex;flex-direction:column;max-height:calc(100vh - 24px);margin:0;padding:16px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.22));border-radius:14px;background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-base,#fff));color:var(--dsw-alias-label-primary,#1f2329);box-shadow:var(--dsw-elevation-panel,0 16px 48px rgba(0,0,0,.18));font-family:var(--dsw-font-family,inherit);font-size:13px;line-height:1.45;overflow:auto;overscroll-behavior:contain}
.dsab-panel::backdrop{background:transparent}
.dsab-head{display:flex;align-items:flex-start;gap:12px}
.dsab-head-text{flex:1;min-width:0}
.dsab-title{font-size:15px;font-weight:600;letter-spacing:-.01em}
.dsab-desc{margin-top:3px;font-size:12px;color:var(--dsw-alias-label-secondary,#646a73)}
.dsab-switch{position:relative;display:inline-flex;flex:none;width:40px;height:22px;margin-top:2px}
.dsab-switch input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer;z-index:1}
.dsab-switch span{position:absolute;inset:0;border-radius:999px;background:var(--dsw-alias-border-l3,rgba(127,127,127,.3));transition:background .16s ease}
.dsab-switch span::after{content:"";position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .16s ease}
.dsab-switch input:checked + span{background:var(--dsw-alias-button-primary-fill,#4d6bfe)}
.dsab-switch input:checked + span::after{transform:translateX(18px)}
.dsab-switch input:focus-visible + span{outline:2px solid var(--dsw-focus-ring-color,#4d6bfe);outline-offset:2px}
.dsab-close{display:inline-flex;align-items:center;justify-content:center;flex:none;width:24px;height:24px;margin:1px 0 0 2px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary,#8f959e);font-size:18px;line-height:1;cursor:pointer}
.dsab-close:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));color:var(--dsw-alias-label-primary,#1f2329)}

.dsab-result{display:flex;align-items:flex-start;gap:10px;margin:14px 0 4px;padding:10px 12px;border-radius:10px;background:var(--dsw-alias-settings-card-fill,rgba(127,127,127,.07))}
.dsab-result-body{flex:1;min-width:0}
.dsab-result-label{font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--dsw-alias-label-caption,#8f959e)}
.dsab-result-value{margin-top:1px;font-size:22px;font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums;word-break:break-all}
.dsab-result-meta{margin-top:3px;font-size:11.5px;color:var(--dsw-alias-label-tertiary,#8f959e)}
.dsab-error{margin:8px 0 0;font-size:12px;color:var(--dsw-alias-state-business-primary,#e5484d);word-break:break-word}

.dsab-field{display:flex;flex-direction:column;gap:5px;margin-top:12px}
.dsab-field-label{font-size:12px;color:var(--dsw-alias-label-secondary,#646a73)}
.dsab-input{width:100%;box-sizing:border-box;height:36px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.26));border-radius:8px;background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-base,#fff));color:var(--dsw-alias-label-primary,#1f2329);font:inherit;font-size:13px;outline:none;transition:border-color .12s ease}
.dsab-input:focus{border-color:var(--dsw-alias-brand-primary,#4d6bfe)}
.dsab-input::placeholder{color:var(--dsw-alias-label-tertiary,#a0a5ad)}
.dsab-hint{font-size:11.5px;color:var(--dsw-alias-label-tertiary,#8f959e)}
.dsab-note{margin-top:10px;font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-tertiary,#8f959e)}
.dsab-note code{padding:0 4px;border-radius:4px;background:var(--dsw-alias-settings-card-fill,rgba(127,127,127,.08));font-family:var(--dsw-font-family-mono,ui-monospace,monospace);font-size:11px}

.dsab-profilebar{display:flex;align-items:center;gap:7px;margin-top:14px}
.dsab-profile-select{flex:1;min-width:0;height:34px;padding:0 8px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.26));border-radius:8px;background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-base,#fff));color:var(--dsw-alias-label-primary,#1f2329);font:inherit;font-size:12.5px}
.dsab-profile-btn{height:34px;padding:0 9px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.26));border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,#646a73);font:inherit;font-size:12px;cursor:pointer}
.dsab-profile-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));color:var(--dsw-alias-label-primary,#1f2329)}
.dsab-section{display:flex;align-items:center;gap:8px;margin-top:14px;font-size:12px;color:var(--dsw-alias-label-secondary,#646a73)}
.dsab-header-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.35fr) 26px;gap:6px;margin-top:6px}
.dsab-header-row .dsab-input{height:34px}
.dsab-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:26px;height:34px;padding:0;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-tertiary,#8f959e);cursor:pointer}
.dsab-icon-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));color:var(--dsw-alias-label-primary,#1f2329)}
.dsab-add{display:inline-flex;align-items:center;gap:5px;margin-top:7px;padding:4px 6px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-brand-primary,#4d6bfe);font:inherit;font-size:12px;cursor:pointer}
.dsab-add:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12))}

.dsab-foot{position:sticky;bottom:-16px;z-index:2;display:flex;align-items:center;gap:8px;margin:16px -16px -16px;padding:12px 16px 16px;border-top:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.16));background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-base,#fff))}
.dsab-spacer{flex:1}
.dsab-btn{height:32px;padding:0 12px;border:1px solid transparent;border-radius:8px;font:inherit;font-size:12.5px;cursor:pointer}
.dsab-btn:disabled{opacity:.55;cursor:default}
.dsab-btn-ghost{border-color:transparent;background:transparent;color:var(--dsw-alias-label-secondary,#646a73)}
.dsab-btn-ghost:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12))}
.dsab-btn-primary{background:var(--dsw-alias-button-primary-fill,#4d6bfe);color:var(--dsw-alias-label-primary-foreground,#fff);font-weight:500}
.dsab-btn-primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover,#3f5be0)}
.dsab-msg{margin-left:2px;font-size:11.5px;color:var(--dsw-alias-label-tertiary,#8f959e)}
`

      if (typeof document !== 'undefined' && document.querySelector('style[data-dsh-plugin-css="' + CSS_ID + '"]') === null) {
        const tag = document.createElement('style')
        tag.dataset.dshPluginCss = CSS_ID
        tag.dataset.plugin = 'dsh-account-balance'
        tag.textContent = CSS
        document.head.appendChild(tag)
      }

      /* ------------------------------------------------------------------ */
      /* store                                                               */
      /* ------------------------------------------------------------------ */

      const store = {
        state: null,
        error: '',
        loading: true,
        busy: false,
        pending: false,
      }
      const listeners = new Set()

      function setStore(patch) {
        Object.assign(store, patch)
        for (const listener of [...listeners]) {
          try {
            listener()
          } catch {
            /* a broken listener must not break the widget */
          }
        }
      }

      function useStore() {
        const [, force] = React.useReducer((n) => n + 1, 0)
        React.useEffect(() => {
          listeners.add(force)
          return () => listeners.delete(force)
        }, [])
        return store
      }

      async function request(path, body) {
        const init = { cache: 'no-store' }
        if (body !== undefined) {
          init.method = 'POST'
          init.headers = { 'content-type': 'application/json' }
          init.body = JSON.stringify(body)
        }
        const response = await fetch(API + path, init)
        let payload
        try {
          payload = await response.json()
        } catch {
          throw new Error('HTTP ' + response.status)
        }
        if (!response.ok || payload.ok === false) {
          throw new Error(payload && payload.error ? payload.error : 'HTTP ' + response.status)
        }
        return payload.state
      }

      async function load(silent) {
        if (!silent) setStore({ loading: true })
        try {
          const state = await request('/state')
          setStore({ state, error: '', loading: false, pending: Boolean(state.pending) })
        } catch (error) {
          setStore({ error: error instanceof Error ? error.message : String(error), loading: false })
        }
      }

      async function refresh() {
        setStore({ busy: true })
        try {
          const state = await request('/refresh', {})
          setStore({ state, error: '', pending: Boolean(state.pending) })
        } catch (error) {
          setStore({ error: error instanceof Error ? error.message : String(error) })
        } finally {
          setStore({ busy: false })
        }
      }

      /* ------------------------------------------------------------------ */
      /* icons                                                               */
      /* ------------------------------------------------------------------ */

      function WalletIcon({ size = 18 }) {
        return h(
          'svg',
          { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
          h('path', {
            d: 'M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v10.5a1.5 1.5 0 0 1-1.5 1.5h-12A2.5 2.5 0 0 1 4 16.5v-9Z',
            stroke: 'currentColor',
            strokeWidth: 1.6,
            strokeLinejoin: 'round',
          }),
          h('path', { d: 'M4 8h13', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
          h('circle', { cx: 16.5, cy: 13.5, r: 1.1, fill: 'currentColor' }),
        )
      }

      function RefreshIcon({ size = 14 }) {
        return h(
          'svg',
          { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
          h('path', {
            d: 'M20 12a8 8 0 1 1-2.34-5.66',
            stroke: 'currentColor',
            strokeWidth: 1.8,
            strokeLinecap: 'round',
          }),
          h('path', { d: 'M20 4v5h-5', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        )
      }

      function TrashIcon({ size = 14 }) {
        return h(
          'svg',
          { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
          h('path', { d: 'M5 7h14', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' }),
          h('path', { d: 'M9 7V5h6v2', stroke: 'currentColor', strokeWidth: 1.7, strokeLinejoin: 'round' }),
          h('path', { d: 'M7 7l.8 12h8.4L17 7', stroke: 'currentColor', strokeWidth: 1.7, strokeLinejoin: 'round' }),
        )
      }

      /* ------------------------------------------------------------------ */
      /* helpers                                                             */
      /* ------------------------------------------------------------------ */

      function toDraft(config) {
        const source = config || {}
        return {
          enabled: source.enabled !== false,
          url: typeof source.url === 'string' ? source.url : '',
          baseUrl: typeof source.baseUrl === 'string' ? source.baseUrl : '',
          apiKey: typeof source.apiKey === 'string' ? source.apiKey : '',
          jsonPath: typeof source.jsonPath === 'string' ? source.jsonPath : '',
          headers: Array.isArray(source.headers)
            ? source.headers.map((row) => ({ name: String(row && row.name ? row.name : ''), value: String(row && row.value ? row.value : '') }))
            : [],
        }
      }

      function timeLabel(iso) {
        if (typeof iso !== 'string' || iso === '') return ''
        const date = new Date(iso)
        if (Number.isNaN(date.getTime())) return ''
        return date.toLocaleTimeString('zh-CN', { hour12: false })
      }

      function statusText(state) {
        const result = state && state.result
        if (!result) return state && state.pending ? '正在读取…' : '尚未读取'
        if (!result.ok) return result.error || '读取失败'
        const parts = []
        if (result.updatedAt) parts.push('更新于 ' + timeLabel(result.updatedAt))
        if (typeof result.durationMs === 'number') parts.push(result.durationMs + ' ms')
        if (typeof result.status === 'number') parts.push('HTTP ' + result.status)
        return parts.join(' · ')
      }

      /* ------------------------------------------------------------------ */
      /* panel                                                               */
      /* ------------------------------------------------------------------ */

      function ConfigPanel(props) {
        const { draft, setDraft, state, saving, onClose, onSave, onReset, error, onRefresh, busy, onProfileAction } = props
        const result = state && state.result
        const panelRef = React.useRef(null)
        const [position, setPosition] = React.useState({ left: 8, bottom: 8 })
        const [showKey, setShowKey] = React.useState(false)

        React.useLayoutEffect(() => {
          const anchor = props.anchor
          if (!anchor) return
          const rect = anchor.getBoundingClientRect()
          const margin = 8
          const width = Math.min(PANEL_WIDTH, window.innerWidth - margin * 2)
          const left = Math.max(margin, Math.min(rect.right + 10, window.innerWidth - width - margin))
          setPosition({ left, bottom: 12, width, maxHeight: window.innerHeight - 24 })
        }, [props.anchor])

        React.useLayoutEffect(() => {
          const dialog = panelRef.current
          if (!dialog) return undefined
          if (typeof dialog.showModal === 'function' && !dialog.open) {
            try {
              dialog.showModal()
            } catch {
              dialog.setAttribute('open', '')
            }
          } else if (!dialog.open) {
            dialog.setAttribute('open', '')
          }
          return () => {
            if (dialog.open) dialog.close()
          }
        }, [])

        React.useEffect(() => {
          const onKey = (event) => {
            if (event.key === 'Escape') onClose()
          }
          window.addEventListener('keydown', onKey)
          return () => window.removeEventListener('keydown', onKey)
        }, [onClose])

        const setField = (key, value) => setDraft({ ...draft, [key]: value })
        const setHeader = (index, key, value) => {
          const headers = draft.headers.map((row, i) => (i === index ? { ...row, [key]: value } : row))
          setDraft({ ...draft, headers })
        }
        const addHeader = () => setDraft({ ...draft, headers: [...draft.headers, { name: '', value: '' }] })
        const removeHeader = (index) => setDraft({ ...draft, headers: draft.headers.filter((_, i) => i !== index) })

        return ReactDOM.createPortal(
          h(
            'dialog',
            {
              ref: panelRef,
              className: 'dsab-panel',
              style: position,
              'aria-label': '账户余额设置',
              onCancel: (event) => {
                event.preventDefault()
                onClose()
              },
              onClick: (event) => {
                if (event.target !== event.currentTarget) return
                const rect = event.currentTarget.getBoundingClientRect()
                if (
                  event.clientX < rect.left ||
                  event.clientX > rect.right ||
                  event.clientY < rect.top ||
                  event.clientY > rect.bottom
                ) {
                  onClose()
                }
              },
            },
              h(
                'div',
                { className: 'dsab-head' },
                h(
                  'div',
                  { className: 'dsab-head-text' },
                  h('div', { className: 'dsab-title' }, '获取账户余额'),
                  h('div', { className: 'dsab-desc' }, '自定义 API 与请求头，解析 JSON 结果'),
                ),
                h(
                  'label',
                  { className: 'dsab-switch', title: draft.enabled ? '停用' : '启用' },
                  h('input', {
                    type: 'checkbox',
                    checked: draft.enabled,
                    onChange: (event) => setField('enabled', event.target.checked),
                  }),
                  h('span', null),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsab-close',
                    title: '关闭',
                    'aria-label': '关闭',
                    onClick: onClose,
                  },
                  '×',
                ),
              ),

              h(
                'div',
                { className: 'dsab-profilebar' },
                h(
                  'select',
                  {
                    className: 'dsab-profile-select',
                    value: state && state.activeProfileId ? state.activeProfileId : '',
                    onChange: (event) => onProfileAction('select', { id: event.target.value }),
                    'aria-label': '选择 API 配置',
                  },
                  state && Array.isArray(state.profiles)
                    ? state.profiles.map((profile) => h('option', { key: profile.id, value: profile.id }, profile.name))
                    : null,
                ),
                h('button', { type: 'button', className: 'dsab-profile-btn', onClick: () => onProfileAction('create') }, '新建'),
                h('button', { type: 'button', className: 'dsab-profile-btn', onClick: () => onProfileAction('rename') }, '重命名'),
                state && state.profiles && state.profiles.length > 1
                  ? h('button', { type: 'button', className: 'dsab-profile-btn', onClick: () => onProfileAction('delete') }, '删除')
                  : null,
              ),

              h(
                'div',
                { className: 'dsab-result' },
                h('span', { className: 'dsab-glyph', style: { marginTop: 4 } }, h(WalletIcon, { size: 18 })),
                h(
                  'div',
                  { className: 'dsab-result-body' },
                  h('div', { className: 'dsab-result-label' }, '当前结果'),
                  h(
                    'div',
                    { className: 'dsab-result-value' },
                    result && result.ok ? result.display || '—' : state && state.pending ? '…' : '—',
                  ),
                  h('div', { className: 'dsab-result-meta' }, statusText(state)),
                  result && !result.ok && result.error
                    ? h('div', { className: 'dsab-error' }, result.error)
                    : null,
                  !result && state && state.pending ? h('div', { className: 'dsab-hint' }, '正在请求接口…') : null,
                ),
              ),

              h(
                'label',
                { className: 'dsab-field' },
                h('span', { className: 'dsab-field-label' }, 'URL'),
                h('input', {
                  className: 'dsab-input',
                  value: draft.url,
                  spellCheck: false,
                  placeholder: 'https://example.com/api/me',
                  onChange: (event) => setField('url', event.target.value),
                }),
              ),

              h(
                'div',
                { className: 'dsab-section' },
                h('span', null, '请求头'),
                h('span', { className: 'dsab-spacer' }),
              ),
              draft.headers.map((row, index) =>
                h(
                  'div',
                  { className: 'dsab-header-row', key: 'header-' + index },
                  h('input', {
                    className: 'dsab-input',
                    value: row.name,
                    spellCheck: false,
                    placeholder: 'Header 名称',
                    onChange: (event) => setHeader(index, 'name', event.target.value),
                  }),
                  h('input', {
                    className: 'dsab-input',
                    value: row.value,
                    spellCheck: false,
                    placeholder: 'Header 值',
                    onChange: (event) => setHeader(index, 'value', event.target.value),
                  }),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'dsab-icon-btn',
                      title: '删除此 Header',
                      'aria-label': '删除此 Header',
                      onClick: () => removeHeader(index),
                    },
                    h(TrashIcon, { size: 15 }),
                  ),
                ),
              ),
              h(
                'button',
                { type: 'button', className: 'dsab-add', onClick: addHeader },
                h('span', { style: { fontSize: 15, lineHeight: 1 } }, '＋'),
                '添加 Header',
              ),

              h(
                'label',
                { className: 'dsab-field' },
                h('span', { className: 'dsab-field-label' }, '结果 JSON 键'),
                h('input', {
                  className: 'dsab-input',
                  value: draft.jsonPath,
                  spellCheck: false,
                  placeholder: 'data.balance',
                  onChange: (event) => setField('jsonPath', event.target.value),
                }),
                h('span', { className: 'dsab-hint' }, '支持 data.balance、data.items[0].total 或 $.data.balance'),
              ),

              h(
                'label',
                { className: 'dsab-field' },
                h('span', { className: 'dsab-field-label' }, 'Base URL 变量'),
                h('input', {
                  className: 'dsab-input',
                  value: draft.baseUrl,
                  spellCheck: false,
                  placeholder: 'https://vulcanapi.com',
                  onChange: (event) => setField('baseUrl', event.target.value),
                }),
              ),

              h(
                'label',
                { className: 'dsab-field' },
                h('span', { className: 'dsab-field-label' }, 'API Key 变量'),
                h(
                  'div',
                  { style: { display: 'flex', gap: 6 } },
                  h('input', {
                    className: 'dsab-input',
                    type: showKey ? 'text' : 'password',
                    value: draft.apiKey,
                    spellCheck: false,
                    autoComplete: 'off',
                    placeholder: 'sk-…',
                    onChange: (event) => setField('apiKey', event.target.value),
                  }),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'dsab-btn dsab-btn-ghost',
                      style: { flex: 'none', padding: '0 8px' },
                      onClick: () => setShowKey((value) => !value),
                    },
                    showKey ? '隐藏' : '显示',
                  ),
                ),
              ),

              h(
                'div',
                { className: 'dsab-note' },
                '可在 URL 与 Header 值中使用变量 ',
                h('code', null, '{{baseUrl}}'),
                ' 和 ',
                h('code', null, '{{apiKey}}'),
                '。密钥只保存在本机。',
              ),

              error ? h('div', { className: 'dsab-error' }, error) : null,

              h(
                'div',
                { className: 'dsab-foot' },
                h('button', { type: 'button', className: 'dsab-btn dsab-btn-ghost', onClick: onReset }, '重置为默认'),
                h('span', { className: 'dsab-spacer' }),
                h(
                  'button',
                  { type: 'button', className: 'dsab-btn dsab-btn-ghost', onClick: onRefresh, disabled: busy },
                  busy ? '刷新中…' : '刷新',
                ),
                h(
                  'button',
                  { type: 'button', className: 'dsab-btn dsab-btn-primary', onClick: onSave, disabled: saving || !state || !state.config },
                  saving ? '保存中…' : '保存并刷新',
                ),
              ),
          ),
          document.body,
        )
      }

      /* ------------------------------------------------------------------ */
      /* footer widget                                                       */
      /* ------------------------------------------------------------------ */

      function FooterWidget(props) {
        const snapshot = useStore()
        const [open, setOpen] = React.useState(false)
        const [draft, setDraft] = React.useState(() => toDraft(null))
        const [saving, setSaving] = React.useState(false)
        const [saveError, setSaveError] = React.useState('')
        const anchorRef = React.useRef(null)
        const dirtyRef = React.useRef(false)
        const wide = props.wide !== false

        const editDraft = React.useCallback((next) => {
          dirtyRef.current = true
          setDraft(next)
        }, [])

        React.useEffect(() => {
          void load(false)
          const timer = window.setInterval(() => {
            if (document.visibilityState !== 'hidden') void load(true)
          }, 20000)
          return () => window.clearInterval(timer)
        }, [])

        // A pending host-side fetch resolves within a couple of seconds; poll
        // faster only while one is actually in flight.
        React.useEffect(() => {
          if (!snapshot.pending) return undefined
          const timer = window.setInterval(() => {
            if (document.visibilityState !== 'hidden') void load(true)
          }, 1500)
          return () => window.clearInterval(timer)
        }, [snapshot.pending])

        React.useEffect(() => {
          if (!open) {
            dirtyRef.current = false
            return
          }
          // The panel can be opened before the first /state response arrives.
          // Seed as soon as the config is available, but never overwrite what
          // the user has already typed.
          if (snapshot.state && snapshot.state.config && !dirtyRef.current) {
            setDraft(toDraft(snapshot.state.config))
            setSaveError('')
          }
        }, [open, snapshot.state])

        const result = snapshot.state && snapshot.state.result
        const hasValue = Boolean(result && result.ok)
        const isError = Boolean(result && !result.ok && result.error)
        const compact = !wide
        const valueText = hasValue ? result.display || '—' : snapshot.state && snapshot.state.pending ? '…' : '—'
        const title =
          '账户余额 ' +
          (hasValue ? result.display : isError ? result.error : snapshot.state && snapshot.state.pending ? '读取中…' : '未读取') +
          (hasValue && result.updatedAt ? ' · ' + timeLabel(result.updatedAt) : '')

        async function save() {
          if (!snapshot.state || !snapshot.state.config) {
            setSaveError('配置尚未加载完成，请稍后再保存')
            return
          }
          setSaving(true)
          setSaveError('')
          try {
            const state = await request('/config', draft)
            setStore({ state, error: '', pending: Boolean(state.pending) })
            dirtyRef.current = false
            setDraft(toDraft(state.config))
          } catch (error) {
            setSaveError(error instanceof Error ? error.message : String(error))
          } finally {
            setSaving(false)
          }
        }

        async function profileAction(action, extra = {}) {
          let payload = { action, ...extra }
          if (action === 'rename') {
            const current = snapshot.state?.profiles?.find((item) => item.id === snapshot.state.activeProfileId)
            const name = window.prompt('请输入 API 配置名称', current?.name || 'API')
            if (!name) return
            payload.name = name
          }
          if (action === 'delete' && !window.confirm('删除当前 API 配置？')) return
          try {
            setSaving(true)
            const state = await request('/profile', payload)
            setStore({ state, error: '', pending: Boolean(state.pending) })
            dirtyRef.current = false
            setDraft(toDraft(state.config))
          } catch (error) {
            setSaveError(error instanceof Error ? error.message : String(error))
          } finally {
            setSaving(false)
          }
        }

        async function reset() {
          if (!window.confirm('恢复默认配置？当前的 URL、Header、API Key 都会被替换。')) return
          setSaving(true)
          setSaveError('')
          try {
            const state = await request('/reset', {})
            setStore({ state, error: '', pending: Boolean(state.pending) })
            dirtyRef.current = false
            setDraft(toDraft(state.config))
          } catch (error) {
            setSaveError(error instanceof Error ? error.message : String(error))
          } finally {
            setSaving(false)
          }
        }

        return h(
          React.Fragment,
          null,
          h(
            'div',
            {
              ref: anchorRef,
              className: 'dsab-wrap',
              'data-compact': compact ? 'true' : 'false',
              'data-error': isError ? 'true' : 'false',
              'data-muted': !hasValue && !isError ? 'true' : 'false',
            },
            h(
              'button',
              {
                type: 'button',
                className: 'dsab-row',
                title,
                'aria-label': title,
                onClick: () => setOpen((value) => !value),
              },
              h('span', { className: 'dsab-glyph' }, h(WalletIcon, { size: 18 })),
              wide ? h('span', { className: 'dsab-label' }, '账户余额') : null,
              wide ? h('span', { className: 'dsab-value' }, valueText) : null,
            ),
            wide
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsab-refresh',
                    title: '刷新余额',
                    'aria-label': '刷新余额',
                    disabled: snapshot.busy,
                    onClick: (event) => {
                      event.stopPropagation()
                      void refresh()
                    },
                  },
                  h('span', { className: snapshot.busy ? 'dsab-spin' : '' }, h(RefreshIcon, { size: 13 })),
                )
              : null,
          ),
          open
            ? h(ConfigPanel, {
                anchor: anchorRef.current,
                draft,
                setDraft: editDraft,
                state: snapshot.state,
                saving,
                busy: snapshot.busy,
                error: saveError || snapshot.error,
                onClose: () => setOpen(false),
                onSave: save,
                onReset: reset,
                onRefresh: () => void refresh(),
                onProfileAction: profileAction,
              })
            : null,
        )
      }

      /* ------------------------------------------------------------------ */
      /* plugin                                                              */
      /* ------------------------------------------------------------------ */

      function apply(ctx) {
        ctx.slots.inject('sidebar.footer.action', function* () {
          yield ctx.slots.register(
            { name: 'sidebar.footer.action', id: 'dsh-account-balance', order: 20 },
            FooterWidget,
          )
        })
      }

      module.exports = { name: 'dsh-account-balance', inject: ['slots'], apply }
      return module.exports
    },
  })
})()
