# AI Studio React/NestJS SaaS 重建 PRD

更新日期：2026-07-10

本文档是 AI Studio 唯一的长期治理与重建路线图。它用于 Codex 目标模式的持续执行、阶段选择、范围控制、验收和发布判断。旧的“保持原生 ESM、禁止框架迁移”路线已经被用户明确替换。

## 1. 产品目标

把当前可运行的 AI 创作单体重建为适合中国大陆商业发布、长期维护和持续扩展的现代模块化单体，同时保持已有产品体验。

完成后的系统必须具备：

- React + TypeScript 前端；
- NestJS + Fastify 后端；
- 独立 API 与 AI Worker 进程；
- PostgreSQL、Redis/BullMQ 和私有对象存储；
- 工作空间级数据隔离；
- 可恢复的 AI 长任务；
- 可审计的积分、订单、支付、订阅、退款和发票；
- 微信支付与支付宝自动续费；
- 内容安全、AI 内容标识、投诉申诉和账号注销；
- 可观测、可备份、可恢复、可灰度和可回滚的生产环境；
- 现有首页、画布、上传、生成、聊天、3D、项目库、素材库、登录和任务日志的视觉与交互等价。

## 2. 已锁定决策

### 2.1 技术栈

- 前端使用 React、TypeScript、React Router Framework SPA mode。
- 服务端状态使用 TanStack Query。
- 画布与编辑器状态使用 Zustand。
- 画布核心使用独立 TypeScript engine，不依赖 React 或 DOM。
- 后端使用 NestJS 与 Fastify adapter。
- API 使用 REST 和 OpenAPI，不使用 GraphQL 或 tRPC。
- 数据库使用 PostgreSQL、Drizzle 和 node-postgres。
- 任务队列使用 BullMQ 与 Tair-compatible Redis。
- 生产文件使用私有 OSS；本地开发保留 local storage provider。
- 部署使用阿里云 SAE，API 和 Worker 分开部署。
- 使用 npm workspaces，不使用 Nx 或 Turborepo。
- 使用 Node 24 LTS 和严格 TypeScript。

### 2.2 迁移策略

- 采用一次生产切流，而不是让用户长期使用两套产品。
- 实施过程必须按工作包渐进完成，不能形成一个不可审查的大提交。
- 旧版在切流前保持可运行，只作为功能、视觉、交互和 API 对照。
- 旧版不再开发新功能，严重生产问题必须单独修复。
- 新版使用全新数据库，不迁移当前 SQLite、账号、项目、素材、会话、任务或积分。
- 切流必须发生在公开注册和真实付款开放之前。
- 旧文件只能在切流稳定观察期之后按证据删除。

### 2.3 产品和商业范围

- 国内 Web 首发，简体中文优先。
- 首发以个人工作空间为主要产品形态，数据模型保留团队工作空间能力。
- 首发包含微信支付与支付宝。
- 首发包含订阅自动续费与积分包。
- 支付账本和积分账本必须分离。
- 当前已有产品页面不得借重建进行视觉重设计。
- 商业、合规和账号管理所必需的新页面可以新增，但必须遵循已有视觉语言。

### 2.4 已知发布阻断

开发和预发阶段继续保持现有境外模型无感调用决策。只要参考图、提示词或其他数据可能包含个人信息或敏感个人信息，且跨境处理策略尚未解决，国内公开付费生产切流必须保持阻断。

该阻断不妨碍架构、功能、支付、测试和预发工作继续完成，但不允许将系统描述为已满足国内正式商用合规。

## 3. 不可违反的约束

- 不切换到 Next.js、Vue、Angular 或其他前端框架。
- 不拆成微服务。
- 不引入 Kubernetes、Nx 或 Turborepo。
- 不引入新的视觉系统。
- 不使用 React Three Fiber。
- 不使用 Prisma 或 TypeORM。
- 不把数据库实体直接暴露为 API contract。
- 不把 Redis 队列当作业务事实源。
- 不使用 document query、innerHTML、dataset 或 window 全局对象保存 React 应用状态。
- 不在最终阶段前删除旧版文件。
- 不使用 git add .
- 不把多个无关工作包混入同一个 commit。
- 不绕过 npm run check 或 npm run build。

## 4. 目标仓库结构

    apps/
      web/
      api/
      worker/

    packages/
      canvas-engine/
      contracts/
      server-core/
      test-support/

    docs/architecture/
      current-state.md
      saas-governance-prd.md
      react-nest-target-architecture.md
      react-nest-execution-runbook.md
      react-nest-parity-matrix.md
      react-nest-migration-state.json

apps/web 只依赖公开 contracts、canvas engine 和前端库。

apps/api 与 apps/worker 是两个 composition roots。共享业务模块位于 packages/server-core，但 HTTP controller 只属于 API，queue processor 只属于 Worker。

packages/contracts 由 OpenAPI 生成或维护公开请求/响应类型，不包含 Drizzle schema。

packages/canvas-engine 负责画布文档、viewport、几何、选择、命令、历史和序列化。

## 5. 后端领域

后端模块必须按以下领域组织：

- Identity：用户、登录、验证码、OAuth、session、注销；
- Workspace：工作空间、成员和租户上下文；
- Project：项目、版本化快照和最近项目；
- Asset：上传、对象、素材集合和访问授权；
- Conversation：会话、消息和附件；
- AiJob：任务状态机、provider routing、remote task 和输出；
- Credit：余额、预留、扣费、释放和流水；
- Billing：套餐、订单、支付、订阅、授权扣款、退款、权益和发票；
- Compliance：模型登记、内容安全、AI 标识、投诉、申诉和数据权利；
- Audit：安全、计费和关键业务事件；
- Health：依赖健康、readiness 和 liveness。

每个领域遵守：

- controller 只解析请求和输出响应；
- application service 编排用例；
- domain service 承担业务规则；
- repository 承担 PostgreSQL；
- provider 承担外部服务；
- DTO 与 OpenAPI 承担公开合同；
- 跨领域写操作通过明确 service 或 outbox，不直接访问对方表。

## 6. 数据规则

- 使用 UUID 字符串主键和带时区时间。
- 金额使用人民币分的整数，积分使用整数。
- 所有租户业务表必须包含 workspace_id。
- 用户请求不能直接传入并信任 owner_user_id。
- 所有更新使用乐观版本或明确事务边界。
- 支付回调、任务创建和积分变更必须有幂等键。
- 订单、支付、订阅、积分和审计记录不可物理覆盖历史。
- 文件记录只保存 provider、storage key、元数据和权限，不持久化短期签名 URL。
- CanvasDocument 必须有 schemaVersion 和迁移 registry。
- 生产 migration 只能通过版本化 SQL 执行，禁止使用 schema push。

## 7. 前端状态规则

- React Router 管理页面路由与路由级 code splitting。
- TanStack Query 管理用户、项目、素材、模型、任务、积分和账单等服务端状态。
- Zustand 只管理画布文档、viewport、选择、工具、临时预览和 undo/redo。
- 表单状态保持在组件或表单 hook 内。
- provider 响应必须在 API client 边界归一化。
- 不复制同一服务端实体到多个全局 store。
- 3D、视频和大型生成工作流必须 lazy-load。
- React 组件不能直接调用第三方 AI provider。

## 8. 画布规则

canvas engine 必须是可独立测试的纯 TypeScript package。

负责：

- viewport 坐标转换；
- pan、zoom 和 fit-to-content；
- 节点选择与多选；
- drag、resize、align 和 bounds；
- 命令、undo、redo；
- node registry 与 discriminated union；
- CanvasDocument 序列化；
- 快照升级；
- 指针交互状态机。

React 负责：

- 渲染节点与工具栏；
- 订阅细粒度 selector；
- 路由和异步数据；
- 弹窗、面板和无障碍语义。

高频 pointer move 使用 requestAnimationFrame、engine transient state 和 CSS transform。不能每次 pointer move 都写入整棵 React 状态树。

## 9. API 合同

- 新 API 前缀为 /api/v1。
- 统一错误：

    {
      "error": {
        "code": "STABLE_CODE",
        "message": "Readable message",
        "requestId": "request-id",
        "details": {}
      }
    }

- 所有写操作支持或明确拒绝 Idempotency-Key。
- 认证使用 HttpOnly、Secure、SameSite cookie。
- 非安全方法必须具备 CSRF 防护。
- OpenAPI 是前端生成类型的唯一服务合同。
- 生产错误不得返回 secret、token、prompt 全文、图片 data URL 或 provider credential。

## 10. 依赖白名单

目标模式可以在对应阶段引入：

Frontend:

- react, react-dom
- react-router, @react-router/dev, @react-router/node
- @tanstack/react-query
- zustand

Backend:

- @nestjs/common, @nestjs/core, @nestjs/platform-fastify
- @nestjs/config, @nestjs/swagger, @nestjs/bullmq
- fastify and narrowly required official Fastify plugins
- class-transformer, class-validator, reflect-metadata, rxjs
- drizzle-orm, drizzle-kit, pg
- bullmq, ioredis
- ali-oss and existing Aliyun SDKs

Tooling:

- typescript, tsx
- eslint, typescript-eslint, prettier
- vitest, jsdom
- Testing Library packages
- openapi-typescript
- Playwright

Payment:

- official or narrowly scoped WeChat Pay and Alipay adapters selected in the Billing stage

任何不在白名单中的运行时依赖都需要暂停并记录架构决策。

## 11. 长期执行阶段

### Stage 0：治理与自动执行基线

交付：

- 重写 AGENTS、PRD 和 current-state；
- 新增 target architecture、runbook、parity matrix 和 migration state；
- 新增治理检查并接入根 check。

验收：

- 文档为 UTF-8；
- 状态 JSON 可解析且只有一个 nextWorkPackage；
- 不再存在禁止已批准 React/NestJS 迁移的权威规则；
- npm run check 与 npm run build 通过。

回滚：revert 本阶段 docs/build commit。

### Stage 1：Workspace 与严格工具链

交付：

- npm workspaces；
- apps/web、apps/api、apps/worker；
- shared packages；
- TypeScript strict、ESLint、Vitest、Testing Library；
- rewrite 独立 check/build；
- 本地 PostgreSQL/Redis compose；
- rewrite 环境变量样例。

验收：

- 所有 workspace 独立 typecheck、test 和 build；
- legacy start/dev/build 行为不变；
- rewrite 构建不写入根 dist。

回滚：删除新增 workspace 并恢复 package files。

### Stage 2：新版后端平台

交付：

- NestJS Fastify API 和 Worker composition roots；
- 配置、日志、request ID、错误过滤、validation、OpenAPI；
- Drizzle PostgreSQL 基线；
- Redis session、rate limit 和 BullMQ；
- StorageProvider local/OSS；
- health/readiness。

验收：

- clean database 可重复初始化；
- API 与 Worker 可独立启动；
- production 配置拒绝 local storage、mock auth 和缺失依赖；
- health 能区分 liveness/readiness。

回滚：新版仍未切流，停用 rewrite services。

### Stage 3：首页完整纵向切片

交付：

- React 首页视觉和交互等价；
- 新版注册、登录、验证码、session；
- 模型目录；
- 积分余额和报价；
- 最近项目、新建项目；
- 附件上传；
- AI job 创建和 Worker 执行；
- 最小 React 画布承接 pending/result；
- 最小项目快照保存。

验收：

- 首页关键桌面和移动截图通过；
- 模型菜单、附件、频道、无限流和 back-to-top 行为通过；
- 登录用户隔离通过；
- 重复任务不重复扣费；
- 首页提交后进入 React 画布并得到最终图片。

回滚：rewrite 独立入口关闭，legacy 不受影响。

### Stage 4：Canvas Engine 基础

交付：

- CanvasDocument；
- node registry；
- viewport math；
- command/history；
- selection、drag、resize；
- React adapter 和 selector。

验收：

- geometry 与 serialization 单元测试；
- pointer 与 zoom 不漂移；
- undo/redo 行为等价；
- 500 节点基线可交互。

### Stage 5：完整画布工具

迁移：

- 左侧工具栏；
- 形状、箭头、文字、画笔、激光笔和橡皮擦；
- 格式工具栏；
- 图片工具栏；
- 裁剪、扩图、高清、抠图、文字和 3D；
- 选择、对齐、复制、删除、堆叠和快捷键。

验收以 parity matrix 为准。任何原 UI 或轨迹差异都视为失败。

### Stage 6：Chat、生成与 Heavy Workflows

迁移：

- prompt/chat；
- reference images；
- image generator；
- image edit；
- video generator；
- 3D viewer；
- task log；
- conversation persistence；
- failed/recovered jobs。

验收：

- heavy modules lazy-load；
- pending preview 与最终节点替换一致；
- 项目保存时机一致；
- 任务失败可解释、可重试、可恢复。

### Stage 7：项目库与素材库

迁移：

- 项目 CRUD；
- 快照版本；
- 素材上传、收藏、集合、移动、删除和预览；
- protected media；
- 首页和项目库缩略图。

验收：

- 服务端结果是保存和删除事实源；
- 跨 workspace 资源不可访问；
- orphan audit 不删除仍被引用文件。

### Stage 8：Billing 与商业能力

交付：

- plans、orders、payments、payment_events；
- subscriptions、mandates、entitlements；
- refunds、invoice_requests；
- WeChat Pay 与 Alipay providers；
- 自动续费签约、提醒、取消和失败重试；
- 对账与 outbox；
- 账单和订阅 UI。

验收：

- webhook 重放不重复发权益；
- 积分和支付账本可追溯；
- 扣费前通知、取消和退款流程通过；
- 商户审核和生产 credential 未完成时不能启用真实支付。

### Stage 9：合规与安全

交付：

- 服务协议、隐私政策、退款规则；
- 模型名称、服务商、备案号目录；
- 输入输出内容安全；
- AI 显式和隐式标识；
- 投诉、举报、申诉；
- 账号注销和数据导出；
- CSP、CSRF、WAF、secret hygiene、upload protection；
- 审计和保留策略。

验收：

- 合规清单有责任人和证据；
- 文件导出含要求标识；
- 敏感日志脱敏；
- 跨境策略未解决时 cutoverAllowed 保持 false。

### Stage 10：阿里云生产化

交付：

- SAE API 与 Worker；
- RDS PostgreSQL；
- Tair Redis；
- private OSS；
- SLS/ARMS/CloudMonitor；
- KMS/secrets；
- backups、restore、alerts、runbooks。

验收：

- API 至少双实例；
- RPO 不高于 15 分钟；
- RTO 不高于 2 小时；
- 备份恢复和版本回滚完成演练。

### Stage 11：全量等价和发布候选

交付：

- parity matrix 全部通过；
- API contract、E2E、visual、performance、security 和 failure drills；
- ICP/经营许可判断；
- 模型应用登记；
- 支付生产审核；
- 发布与回滚手册。

验收：

- 所有既有功能无缺失；
- 新商业路径完整；
- 没有 P0/P1 缺陷；
- 所有外部审批完成；
- 所有 release blockers 清零；
- cutoverAllowed 为 true。

### Stage 12：一次性切流

- 在公开注册和真实付款开放前切换域名；
- 新系统从空 PostgreSQL 开始；
- 不进行新旧双写；
- 监控错误、支付、队列、数据库和对象存储；
- 切流后仅回滚到新版上一部署，不回到旧 SQLite 接收新数据。

### Stage 13：观察与 Legacy 删除

- 稳定观察期内保留旧版代码和旧部署只读参考；
- 完成静态 reachability、运行和 parity 证据；
- 独立 commit 删除旧入口、旧 server、旧 client 和已被替换样式；
- 删除前后均运行完整 check/build/E2E；
- Git commit 是最终回滚点。

## 12. 自动执行规则

每次目标模式运行：

1. 读取 AGENTS 和五份必读架构文件；
2. 运行 git status --short --branch；
3. 从 migration state 读取唯一 nextWorkPackage；
4. 只实施该工作包；
5. 运行 targeted checks、npm run check、npm run build；
6. 更新 parity evidence 和 migration state；
7. 显式 stage 文件并创建一个 commit；
8. 工作区干净后继续下一工作包；
9. 遇到 AGENTS stop condition 时暂停。

不能因为 token、耗时或难度接近上限而伪造完成状态。

## 13. Program Definition Of Done

整个项目只有在以下全部满足时完成：

- React 是唯一生产前端；
- NestJS/Fastify API 与 Worker 是唯一生产后端；
- PostgreSQL、Redis/BullMQ 和 OSS 是生产事实基础；
- parity matrix 全部完成；
- 商业支付和自动续费可用；
- 内容、隐私、标识、投诉和数据权利流程可用；
- 安全、备份、恢复、监控和回滚通过；
- 所有发布阻断项清零；
- 生产切流完成并稳定；
- legacy 删除具备证据和回滚点；
- npm run check、npm run build 和发布 E2E 全部通过。
