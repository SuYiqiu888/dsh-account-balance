# dsh-account-balance

DeepSeek Harness 侧边栏账户余额插件。它在左下角用户名上方提供一个账户余额入口，支持配置多个 API，并在不同 API 之间手动切换。

## 功能

- 自定义 HTTP GET 请求 URL
- 自定义任意数量的 Header
- 支持 `{{baseUrl}}`、`{{apiKey}}` 变量
- 支持 JSON 路径：`data.balance`、`data.items[0].total`、`$.data.balance`、`data["a.b"]`
- Host 半侧发起请求，避免浏览器 CORS 限制
- 左下角显示解析结果，支持手动刷新和 5 分钟自动刷新
- 支持多个 API 配置：新建、切换、删除
- 每个 API 独立保存 URL、Base URL、API Key、Header 和 JSON 结果键
- API 名称位于配置面板的 URL 上方，通过底部「保存并刷新」一并保存
- 旧版单配置文件会自动迁移为第一个 API 配置
- 配置保存在本机 `$DSH_HOME/dsh-account-balance/config.json`

## 配置面板

打开左下角「账户余额」后：

1. 顶部下拉框选择现有 API 配置。
2. 点击「新建」创建新的 API 配置。
3. 点击「删除」删除当前 API 配置；至少保留一个配置。
4. 在 URL 上方编辑「API 名称」。
5. 编辑 URL、请求头、结果 JSON 键、Base URL 和 API Key。
6. 点击底部「保存并刷新」，同时保存名称和接口配置。

切换 API 后，插件会自动加载对应配置并刷新结果，不需要重复填写其他 API 的信息。

## 默认配置

首次启动会生成：

| 字段 | 默认值 |
|---|---|
| API 名称 | `默认 API` |
| URL | `{{baseUrl}}/credits` |
| Base URL | 空 |
| Header | `Authorization: Bearer {{apiKey}}` |
| 结果 JSON 键 | `data.total_usage` |
| 自动刷新 | 5 分钟 |

如果宿主进程环境存在 `DSH_BALANCE_API_KEY` 或 `CC_SWITCH_DSH_QIU`，首次创建默认配置时会自动填入 API Key。已有配置不会被覆盖。

## 安装

### 本地安装

```sh
dsh plugin --profile <profile> add "E:\project\dsh-account-balance"
```

项目已经包含构建后的 `lib/index.js` 和 `lib/client.js`，不需要额外编译或打包。通过本地目录、Git 仓库或 npm 安装都可以直接使用。

### 手工挂载

1. 将项目目录放入 profile 的 `node_modules/dsh-account-balance`。
2. 在 profile 的 `cordis.patch.yml` 中挂载：

```yaml
- insert:
    - id: dsh-account-balance
      name: 'dsh-account-balance'
```

3. 启用 HMR 时会自动重载，否则重启 DSH。

## Host API

插件注册 `/dsh-account-balance/api`：

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/state` | 当前配置、配置列表和最近结果 |
| `POST` | `/config` | 保存当前 API 配置并刷新 |
| `POST` | `/profile` | 切换、新建、重命名或删除 API 配置 |
| `POST` | `/refresh` | 立即刷新当前 API |
| `POST` | `/reset` | 重置当前 API 配置 |

`POST` 请求要求 `content-type: application/json`。跨站请求会被拒绝。

## 开发与测试

```sh
node test-host.mjs
```

测试覆盖变量替换、JSON 路径、Header 注入、错误处理、跨站拦截、配置切换、并发旧请求覆盖保护等行为。

## 项目结构

```text
dsh-account-balance/
├─ lib/index.js        Host 半侧：配置、HTTP 请求、解析、Profile API
├─ lib/client.js       浏览器半侧：侧边栏入口和多 API 配置面板
├─ cordis.patch.yml    Bundle 挂载声明
├─ icon.svg
├─ package.json
├─ test-host.mjs
└─ README.md
```

## 限制

- 当前只支持 GET 请求。
- JSON 路径不支持过滤器和通配符。
- Header 和 API Key 会以本地明文配置形式保存，请注意文件权限。
- 侧边栏折叠时只显示钱包图标。

## License

MIT
