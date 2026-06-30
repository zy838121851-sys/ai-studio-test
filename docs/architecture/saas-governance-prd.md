# AI Studio 架构治理 PRD

## 1. 项目背景

AI Studio 当前已经具备基础 AI 创作平台雏形，包括首页、无限画布、图片生成、聊天框、项目库、素材库、积分、登录、3D 预览、Railway 部署等能力。

当前项目已经可以在 Railway 正常运行，但代码仍处于“原型产品向 SaaS 产品过渡”的阶段，存在 legacy 文件较多、前端入口不够统一、样式系统混乱、生产环境和本地环境容易不一致、SaaS 发布底座不足等问题。

本次 PRD 的目标不是新增产品功能，也不是重写项目，而是对现有项目做架构治理，让它更适合长期维护、后续扩展和 SaaS 发布。

## 2. 治理目标

### 2.1 总目标

把当前项目从“可运行的单体原型”治理成“适合 SaaS 发布和长期维护的现代化单体架构”。

### 2.2 具体目标

- 保持现有功能正常运行。
- 不切换 Next.js、React、Vue，不重写项目。
- 继续使用当前 Express + Vite + 原生 ESM 前端栈。
- 前端按 feature 功能域收口。
- 后端按 routes / services / providers / db 分层。
- 样式系统从 legacy 逐步迁移到清晰层级。
- 为未来 SaaS 发布预留存储、任务队列、计费、审计、限流等扩展接口。
- 建立基础质量门禁，避免“本地正常、线上崩掉”。

## 3. 非目标

本轮治理明确不做以下事情：

- 不新增支付页面。
- 不新增后台管理页面。
- 不新增套餐售卖功能。
- 不重设计 UI。
- 不直接切 Next.js。
- 不换 React / Vue。
- 不把 SQLite 立即强迁移到 PostgreSQL。
- 不大规模删除代码。
- 不改变首页、画布、上传、生图、聊天框、3D 预览等核心交互。
- 不新增 3D、视频、Agent、支付等产品功能。

## 4. 当前主要问题

### 4.1 前端问题

当前前端存在以下问题：

- index.html 承载内容过多，包含首页、账户、模型偏好、项目库、素材库、画布、聊天框、任务日志等多个区域。
- 一旦 CSS 加载失败，多个页面模块会同时裸露出来。
- 前端启动入口和 legacy bridge 仍然较多。
- legacy-app.js、AIStudioCompatibilityBridge、AIStudioLegacyBridge 等兼容层仍在承担真实逻辑。
- 部分功能边界不够清晰，修改某个模块可能影响其他模块。
- 当前目录已有 features 结构，但还没有完全形成稳定的 public API。

### 4.2 样式问题

当前样式存在以下问题：

- legacy CSS 文件较多。
- 样式入口不够清楚。
- /styles、/assets/styles、Vite build 产物之间容易出现路径不一致。
- 全局 cascade 和 overrides 较多。
- 主题、布局、组件、功能样式混在一起，长期维护风险高。

### 4.3 后端问题

当前后端已经有 routes、services、db、middleware 等基础分层，但距离 SaaS 还缺少：

- 统一 StorageProvider，当前本地文件存储未来不适合长期放图片、视频、3D 模型。
- 统一 JobQueue，生图、视频、3D 等长任务未来需要队列。
- 统一 RateLimitStore，当前内存限流未来不适合多实例部署。
- 统一 BillingProvider，积分系统未来要接支付、订单、退款、账本。
- 统一 AuditLogger，未来需要记录安全、计费、管理操作。
- 路由输入校验和错误响应格式还需统一。
- SQLite 当前适合内测，但正式 SaaS 未来需要预留迁移 PostgreSQL 的边界。

### 4.4 部署问题

当前 Railway 已经可以运行，但仍需要文档化以下内容：

- 必需环境变量。
- 启动命令。
- 数据库位置。
- 上传文件位置。
- 静态资源路径。
- 常见错误处理方式。
- 本地 production 模式如何模拟 Railway。

## 5. 推荐目标架构

### 5.1 前端目标架构

前端保持 Vite + 原生 ESM，不引入 React / Vue / Next.js。

推荐目录方向：

```text
src/client/
  app/
    app-init.js
    mount-workspace-app.js

  features/
    home/
    workspace/
    canvas/
    ai/
    chat/
    assets/
    projects/
    auth/
    credits/
    agent/
    model3d/
    video/

  components/
    button/
    modal/
    tabs/
    dropdown/
    toast/

  lib/
    api-client.js
    dom.js
    events.js
    format.js

  styles/
    index.css
```

### 5.2 前端原则

唯一公开启动入口：

```text
app-init.js -> mountWorkspaceApp()
```

每个 feature 只暴露一个明确 public API，例如：

```text
mount()
bind()
dispose()
syncRemote()
```

新功能禁止写入 legacy 文件。

legacy 文件只作为过渡兼容层，逐步减少真实依赖。

index.html 逐步从“大模板”变成“静态壳”。

## 6. 样式目标架构

推荐样式层级：

```text
styles/
  tokens.css
  base.css
  layout.css
  components.css

  features/
    home.css
    workspace.css
    canvas.css
    chat.css
    assets.css
    projects.css
    auth.css
    credits.css
    agent.css

  themes/
    ios.css
    dark.css

  overrides.css
```

### 样式治理原则

- 不重设计 UI。
- 不一次性删除 legacy CSS。
- 每次只迁移一个功能域。
- 保持视觉结果基本一致。
- 减少全局覆盖。
- 所有 CSS 入口必须文档化。
- /styles 和 /assets/styles 的线上静态资源路径必须稳定。

## 7. 后端目标架构

推荐后端方向：

```text
src/server/
  index.js

  config/
    env.js

  routes/
    auth.routes.js
    project.routes.js
    asset.routes.js
    ai.routes.js
    upload.routes.js
    credit.routes.js

  services/
    auth/
    projects/
    assets/
    ai/
    credits/
    uploads/

  providers/
    storage/
      local-storage.provider.js
    queue/
      local-job-queue.provider.js
    billing/
      local-billing.provider.js
    rate-limit/
      memory-rate-limit-store.js
    audit/
      local-audit-logger.js

  db/
    sqlite.js
    migrations/
    repositories/

  middleware/
    auth.middleware.js
    error.middleware.js
    validation.middleware.js

  security/
```

### 后端治理原则

- 路由只负责接收请求和返回响应。
- 业务逻辑放 services。
- 数据库访问逐步收敛到 repositories。
- 外部服务统一放 providers。
- 当前先保留 SQLite，不强行迁移数据库。
- Provider 必须有 local 实现，不能只写空接口。
- 不引入未接入运行路径的空架构。

## 8. SaaS 底座预留

### 8.1 StorageProvider

当前用途：

```text
本地 uploads / Railway Volume
```

未来用途：

```text
阿里云 OSS / Cloudflare R2 / AWS S3 / CDN
```

要求：

- 当前实现仍然使用本地存储。
- 业务代码不要直接依赖本地路径。
- 数据库保存文件 URL 或 storage key。
- 未来可替换成对象存储。

### 8.2 JobQueue

当前用途：

```text
同步执行 / 简单轮询
```

未来用途：

```text
Redis / BullMQ / 后台 Worker
```

要求：

- 当前保留 local job queue。
- 生图、视频、3D 等长任务未来统一进入队列。
- 前端通过 jobId 查询任务状态。
- 支持任务失败、重试、取消、结果回填。

### 8.3 BillingProvider

当前用途：

```text
积分扣费
```

未来用途：

```text
支付订单 / 套餐 / 退款 / 赠送 / 发票
```

要求：

- 不新增支付功能。
- 保留当前积分系统。
- 逐步建立积分流水。
- 每笔积分变化必须可追踪。
- AI 任务失败时未来应支持返还积分。

### 8.4 RateLimitStore

当前用途：

```text
内存限流
```

未来用途：

```text
Redis 限流
```

要求：

- 当前保留内存实现。
- 接口调用限流逻辑不要散落在路由里。
- 未来可替换为 Redis 实现。

### 8.5 AuditLogger

当前用途：

```text
普通日志
```

未来用途：

```text
安全审计 / 计费审计 / 管理操作记录
```

要求：

- 先建立本地日志实现。
- 记录关键事件，例如登录、上传、生成任务、积分变化、项目删除。
- 不影响现有功能。
- 不引入复杂日志平台。

## 9. 分阶段计划

## 阶段 0：基线冻结

### 目标

记录当前项目真实状态，形成后续治理基线。

### 任务

创建治理分支：

```text
codex/saas-architecture-governance
```

新增：

```text
docs/architecture/current-state.md
```

文档内容包括：

- 当前启动命令。
- Railway 必需环境变量。
- 前端入口文件。
- index.html 承载的页面区域。
- CSS 入口和静态资源路径。
- API 路由清单。
- 数据库表清单。
- 上传和生成文件保存位置。
- 当前前端 feature 目录结构。
- 当前 legacy 文件清单。
- 当前已知风险点。

### 验收标准

- 不改变运行行为。
- 不修改 UI。
- 不删除文件。
- npm run check 通过。
- npm run build 通过。

## 阶段 1：发布硬伤治理

### 目标

修复影响 SaaS 发布稳定性的基础问题。

### 任务

- 修复乱码文案。
- 建立编码检查。
- 记录 Railway 部署说明。
- 确保本地 production 启动路径和 Railway 一致。
- 记录 CSS 静态资源路径。
- 防止 CSS 请求 fallback 到 index.html。
- 记录数据库 reset 风险。

### 新增文档

```text
docs/deployment/railway.md
docs/architecture/style-entry-map.md
```

### 验收标准

- 页面文案正常显示。
- Railway 部署说明清楚。
- CSS 文件线上返回 text/css。
- 不再出现 CSS MIME type 错误。
- npm run check 通过。
- npm run build 通过。

## 阶段 2：前端入口治理

### 目标

减少前端启动混乱，让启动路径清晰。

### 任务

固定唯一公开启动入口：

```text
app-init.js -> mountWorkspaceApp()
```

记录当前启动链路。

减少无意义的 runtime / bootstrap / composition 纯转发文件。

逐步减少 CompatibilityBridge / LegacyBridge 真实依赖。

每次只替换一个调用点。

禁止一次性删除兼容桥。

### 验收标准

- 启动顺序更短。
- 公开入口更少。
- 每个 feature 的边界更清楚。
- 不改变现有交互。
- npm run check 通过。
- npm run build 通过。

## 阶段 3：前端 feature 收口

### 目标

让前端功能按业务域分房间。

### 功能域

```text
home
workspace
canvas
ai
chat
assets
projects
auth
credits
agent
model3d
video
```

### 任务

- 每个 feature 建立一个明确 public API。
- 每个 feature 内部管理自己的 DOM 绑定、状态同步、销毁逻辑。
- 避免跨 feature 直接改 DOM。
- 公共能力放到 lib 或 components。
- 旧逻辑从 legacy 文件逐步迁出。

### 优先拆分文件

```text
prompt-workflow.js
canvas-menu-actions.js
image-generator-workflow.js
asset-library-runtime.js
node-controls.js
```

### 验收标准

- 每轮只治理一个 feature。
- 迁移后功能行为保持一致。
- legacy 依赖数量下降。
- npm run check 通过。
- npm run build 通过。

## 阶段 4：样式系统治理

### 目标

让样式从 legacy 大包袱变成清晰层级。

### 任务

建立样式入口图。

记录每个 CSS 文件的引用关系。

从 legacy-split.css 逐步迁移到 styles/features/*。

优先治理大文件：

```text
workspace-layout.css
legacy-assets.css
legacy-node.css
legacy-theme-sync.css
```

建立基础层级：

```text
tokens
base
layout
components
features
themes
overrides
```

### 验收标准

不重设计 UI。

视觉结果基本一致。

legacy CSS 文件数量和行数逐步下降。

关键页面视觉 smoke 通过：

- 首页
- 画布
- 素材库
- 任务日志
- 登录弹窗

## 阶段 5：后端 SaaS provider 治理

### 目标

为未来 SaaS 扩展预留插座，但不新增业务功能。

### 任务

- 建立 StorageProvider。
- 建立 RateLimitStore。
- 建立 JobQueue。
- 建立 BillingProvider。
- 建立 AuditLogger。
- 每个 provider 都必须有 local 实现。
- 每个 provider 都必须接入至少一个真实运行路径。

### 验收标准

- 不引入外部依赖。
- SQLite 继续可用。
- 本地存储继续可用。
- 当前功能不变。
- 所有受保护资源仍按 req.auth.user.id 隔离。
- npm run check 通过。
- npm run build 通过。

## 阶段 6：体量和性能优化

### 目标

降低首屏负担，避免项目继续膨胀。

### 任务

- Three.js 动态 import。
- 3D viewer 动态 import。
- 视频生成模块动态 import。
- 重型 AI 面板动态 import。
- 按视图拆分 home、canvas、asset library、task log、auth dialog。
- 整理 scripts，把检查脚本归类。
- 控制 Vite 大 chunk 警告。

### 验收标准

- 首屏不加载 3D / 视频重型模块。
- 生产构建 chunk 体量下降，或有明确豁免说明。
- npm run check 仍是单一可信入口。
- npm run build 通过。

## 阶段 7：测试和发布门禁

### 目标

让项目具备 SaaS 发布前的基础验证能力。

### 任务

增加 API 集成测试：

- auth
- projects
- assets
- credits
- ai jobs
- uploads

增加关键 UI E2E：

- 登录
- 项目保存
- 项目删除
- 素材上传
- 生成任务状态
- 任务日志

增加安全检查：

- 未登录返回 401
- 跨用户资源不能访问
- cookie flags 正确
- 上传 MIME 校验
- 上传大小限制
- API 错误格式统一

建立发布 checklist：

- 环境变量检查
- 数据库备份
- 数据库迁移
- 健康检查
- 回滚步骤
- Railway 部署检查
- Console / Network 检查

### 验收标准

每个核心 SaaS 能力至少有一条自动化验证。

发布前必须通过：

```text
npm run check
npm run build
API tests
关键 E2E
```

失败时能定位到：

- 前端状态
- API 接口
- 数据库
- 第三方 AI provider
- 文件存储
- 权限隔离

## 10. Codex 执行规则

每次 Codex 只能执行一个小任务。

禁止一次性执行：

```text
前端重构 + 样式治理 + 后端 provider + 测试 + 删除文件
```

每次任务必须遵守：

只改本轮明确范围内的文件。

不改 UI 视觉。

不新增业务功能。

不删除文件，除非有静态引用证据、运行验证和回滚点。

提交前运行：

```text
npm run check
npm run build
```

输出：

- 修改了哪些文件。
- 为什么这么改。
- 是否改变运行行为。
- 是否有风险。
- 如何回滚。
- 下一步建议。

## 11. 第一轮 Codex 任务

请先只执行阶段 0：基线冻结。

### 任务说明

当前 Railway 已经可以正常 Running，页面能正常打开。

请不要重构项目，不要改 UI，不要新增功能，不要删除文件。

只新增或更新文档：

```text
docs/architecture/current-state.md
```

文档需要记录：

- 当前启动命令。
- Railway 必需环境变量。
- 当前前端入口文件。
- 当前 index.html 承载了哪些页面区域。
- 当前 CSS 入口和静态资源路径。
- 当前 API 路由清单。
- 当前数据库表清单。
- 当前上传 / 生成文件保存位置。
- 当前前端 feature 目录结构。
- 当前 legacy 文件清单。
- 当前已知风险点。
- 哪些文件暂时不能删除。
- 后续治理建议。

### 限制

- 不修改首页。
- 不修改画布。
- 不修改上传。
- 不修改生图。
- 不修改聊天框。
- 不修改 3D 预览。
- 不修改登录。
- 不修改项目库。
- 不修改素材库。
- 不修改数据库结构。
- 不新增依赖。
- 不删除文件。

### 验收标准

只新增或更新文档。

运行：

```text
npm run check
npm run build
```

两个命令都必须通过。

页面运行行为不变。

输出修改摘要和下一阶段建议。

## 12. 成功标准

完成本轮治理后，AI Studio 应达到以下状态：

- 项目结构清晰。
- 前端功能边界清楚。
- 后端服务边界清楚。
- 样式入口清楚。
- Railway 部署稳定。
- 本地 production 和线上行为一致。
- legacy 文件数量和真实依赖逐步下降。
- SaaS 必需的存储、计费、队列、审计、限流都有预留接口。
- 后续接 3D、视频、Agent、支付、企业空间时，不需要继续往 legacy 里堆代码。
- 项目可以从“个人原型”逐步升级为“可维护的 SaaS 平台”。
