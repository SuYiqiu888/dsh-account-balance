# dsh-account-balance

在 DeepSeek Harness 左侧栏的**用户名上方**加一行「账户余额」，点击即可配置任意 HTTP 接口、请求头和结果 JSON 键。解析出的值直接显示在左下角，不需要打开新页面。

## 功能

- **自定义请求**：URL、任意数量的 Header（名称 + 值），GET 请求由 Host 半侧发出，不受浏览器 CORS 限制。
- **变量替换**：URL 与 Header 中可使用 `{{baseUrl}}` 和 `{{apiKey}}`，密钥不必写死在 URL 里。
- **结果解析**：支持 `data.balance`、`data.items[0].total`、`$.data.balance` 与 `data["a.b"]` 这类路径。
- **左下角展示**：解析结果直接显示在侧边栏底部、用户名上方；支持手动刷新与 5 分钟自动刷新。
- **配置面板**：点击余额行打开，可启用/停用、编辑、恢复默认；面板使用原生 `dialog` 顶层面板，不会被侧边栏或聊天区遮挡。
- **本地存储**：配置保存在 `$DSH_HOME/dsh-account-balance/config.json`（默认 `~/.dsh/dsh-account-balance/config.json`），不会上传到任何地方。

## 默认配置

首次启动会生成以下配置：

| 字段 | 默认值 |
|---|---|
| URL | `{{baseUrl}}/credits` |
| Base URL | `这里填Url` |
| Header | `Authorization: Bearer {{apiKey}}` |
| 结果 JSON 键 | `data.total_usage` |
| 自动刷新 | 5 分钟 |

如果宿主的进程环境里存在 `DSH_BALANCE_API_KEY` 或 `CC_SWITCH_DSH_QIU`，首次创建配置时会把它的值填入 API Key 变量。已经存在的配置文件不会被覆盖。

## 安装

### 通过插件管理器 / CLI

```sh
dsh plugin --profile <profile> add <本目录的绝对路径>
```

启动器会读取 `package.json` 的 `dsh.bundle.patch` 并自动挂载。安装后如果页面没有自动出现入口，硬刷新一次（`Ctrl/Cmd + Shift + R`）。

### 手工挂载

1. 把整个目录复制到 profile 的 `node_modules/dsh-account-balance`。
2. 在 profile 的 `cordis.patch.yml` 末尾加入：

   ```yaml
   - insert:
       - id: dsh-account-balance
         name: 'dsh-account-balance'
   ```

3. 启用 HMR 时会自动重载；否则重启 DSH。

## 使用

1. 点击左下角「账户余额」行。
2. 填写 URL（或保留 `{{baseUrl}}` 模板并填写 Base URL）。
3. 在「请求头」中添加 `Authorization`，值可写 `Bearer {{apiKey}}`，或直接粘贴完整 Token。
4. 在「API Key 变量」中填写密钥（如果 Header 使用了 `{{apiKey}}`）。
5. 填写「结果 JSON 键」，例如 `data.balance`。
6. 点击「保存并刷新」。之后每次打开页面会读取一次，并每 5 分钟自动刷新。

如果接口返回非 2xx、不是 JSON、或路径不存在，左下角显示 `—`，面板中会给出可读的错误信息，不会伪造 0。

## 接口

Host 半侧注册在 `/dsh-account-balance/api`：

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/state` | 当前配置与最近一次结果 |
| `POST` | `/config` | 保存配置并触发一次刷新 |
| `POST` | `/refresh` | 立即刷新 |
| `POST` | `/reset` | 恢复默认配置 |

所有 `POST` 都要求 `content-type: application/json`；跨站请求（`sec-fetch-site: cross-site` 或 Origin 与 Host 不一致）返回 403。这是本地路由，不提供额外的身份认证。

## 开发

```sh
node test-host.mjs
```

测试会启动一个本地 mock 接口，覆盖变量替换、路径解析、Header 注入、失败提示、禁用、重置、跨站拦截和内容类型校验。客户端是手写的 `window.__ModuleLoader__` bundle，无需构建步骤。

## 结构

```
dsh-account-balance/
├─ lib/index.js        Host 半侧：配置存储、抓取、解析、HTTP 路由
├─ lib/client.js       浏览器半侧：sidebar.footer.action 入口与配置面板
├─ cordis.patch.yml    bundle 挂载声明
├─ icon.svg
├─ package.json
└─ test-host.mjs
```

## 已知限制

- 目前只支持 `GET`。
- 结果路径基于点号/方括号语法，不支持 JSONPath 过滤器或通配符。
- 配置里的 Header 可能包含明文凭据，请注意本机文件权限；插件不会把配置发往 DSH 以外的服务，但会按你填写的 URL 发送请求。
- 侧边栏折叠时只显示钱包图标，悬停可查看余额。

## License

MIT
