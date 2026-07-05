# AI Studio SaaS 架构治理 PRD

更新日期：2026-07-05

本文档是 AI Studio 长期架构治理的主路线图。它不是一次短期修复记录，而是 Codex 后续较长时间自动执行治理任务时的决策依据、阶段边界、验收标准和风险控制规则。

核心目标：把 AI Studio 从“可运行的单体原型”治理成“适合 SaaS 发布、长期维护、可持续扩展的现代化单体架构”。

## 1. 总原则

### 1.1 不变原则

后续所有治理都必须遵守：

- 不直接切 Next.js / React / Vue。
- 不重写整个项目。
- 不新增产品功能，除非用户明确要求。
- 不改变现有 UI 视觉。
- 不改变现有交互。
- 不新增依赖，除非未来有单独批准。
- 不为了目录好看而移动文件。
- 不删除文件，除非有静态引用证据、运行验证和清晰回滚点。
- 不使用 `git add .`。
- 不把无关文件混入 commit。
- 每轮只执行一个小阶段。
- 每次提交前运行 `npm run check` 和 `npm run build`。

### 1.2 治理方向

允许并鼓励：

- 抽出纯函数、纯数据转换、payload 构造、格式化、状态判断。
- 抽出已被稳定测试覆盖的工作流子模块。
- 将路由层业务逻辑下沉到 services。
- 将外部能力抽象到 providers，并保留 local 实现。
- 用脚本检查保护行为等价。
- 删除已证实不可达、无引用、可回滚的代码。
- 合并或删除过期治理文档，但必须单独阶段执行。

不允许：

- 顺手改文案、布局、按钮、弹窗、流程。
- 以“重构”为名改变保存、生成、上传、登录、项目库、素材库、画布行为。
- 一次同时做前端拆分、CSS 迁移、后端 provider、文档删除和功能调整。
- 在没有检查覆盖时迁移带 DOM 副作用的逻辑。

## 2. 当前基线

### 2.1 技术栈

当前仍保持：

- 后端：Express + SQLite + 原生 Node.js ESM。
- 前端：Vite + 原生 ESM。
- 部署：Railway / 本地 production-like 启动路径。
- 存储：本地 uploads / Railway Volume。
- 任务：当前以同步或本地 job 状态为主。
- 计费：credit ledger 基础已存在。

### 2.2 已完成治理

已经完成或基本完成的方向：

- `npm run check` 聚合检查入口。
- `npm run build` 构建门禁。
- build budget 检查。
- built static asset 检查。
- 前端入口链路检查。
- 浏览器启动请求检查。
- 静态 reachability 检查。
- 部分重型 workflow lazy-load。
- 项目快照持久化稳定性修复：
  - 不保存 `loading-image` / `node-loading-image` / `generation-frame` 临时生成预览。
  - 同源 `/uploads/...` 媒体地址归一为稳定相对路径。
  - 旧快照打开后可自动修复。
  - 服务端 snapshot sanitizer 做兜底。
- 多个前端大 workflow 已开始拆分：
  - prompt workflow；
  - image generator workflow；
  - video generator workflow；
  - asset library runtime；
  - project workflow。
- 后端已开始形成 provider/service 边界：
  - storage；
  - job queue；
  - billing；
  - audit；
  - rate limit；
  - request context；
  - route request helpers；
  - HTTP error helpers。

### 2.3 当前主要风险

仍然存在：

- 前端大文件仍偏重。
- CSS 仍高度依赖 legacy 和全局 cascade。
- `index.html` 仍承载较多静态 template。
- 多个治理文档是阶段性地图，长期会变成文档债。
- CSP 仍较宽松。
- 多实例限流没有外部 store。
- 上传和生成资产还没有对象存储 provider。
- 长任务还没有真正 durable queue / worker。
- 计费没有正式支付、订单、退款、发票。
- UI/E2E 自动化不足。
- 数据库备份、恢复、迁移演练还不够产品化。

## 3. 长期目标架构

### 3.1 前端目标结构

保持原生 ESM，不引入框架。

目标方向：

```text
src/client/
  core/
    app-init.js
    event-bus.js
    state.js

  features/
    home/
      runtime.js
      workflows/
      components/
      utils/

    workspace/
      runtime/
      workflows/
      chat/
      asset-library/

    canvas/
      runtime/
      workflows/
      components/
      utils/

    projects/
      runtime.js
      workflows/
      services/
      utils/

    auth/
    credits/
    agent/
    model3d/
    video/

  components/
  lib/
```

目标不是强制一次性迁移到这个形态，而是每次治理都让真实调用关系更接近这个形态。

### 3.2 后端目标结构

目标方向：

```text
src/server/
  index.js
  config/
  routes/
  services/
  providers/
    storage/
    queue/
    billing/
    rate-limit/
    audit/
  db/
    migrations/
    repositories/
  middleware/
  security/
  lib/
```

规则：

- routes 只做请求解析、鉴权接入、响应输出。
- services 承担业务流程。
- providers 承担外部能力适配。
- db/repositories 承担数据访问。
- lib 存放跨模块纯工具。
- provider 必须有 local 实现，不能只有空接口。

### 3.3 样式目标结构

目标方向：

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
    task-log.css
  themes/
  overrides.css
```

CSS 治理必须以视觉不变为前提。没有 smoke 证据时，不做大段迁移。

### 3.4 SaaS 基础设施目标

长期目标：

- StorageProvider 可切换 local / object storage。
- JobQueue 可切换 local / durable queue。
- RateLimitStore 可切换 memory / Redis。
- BillingProvider 可接支付订单。
- AuditLogger 能记录关键安全和计费事件。
- API 错误格式统一。
- API 输入验证集中。
- 数据库迁移、备份、恢复、回滚有明确流程。
- production-like 本地验证路径稳定。

## 4. 长期阶段路线

### 阶段 0：治理基线和门禁稳定

状态：基本完成，但需要持续维护。

目标：

- 确保每次治理都有可重复验证。
- 防止无意中改变 UI、交互和业务行为。

任务：

- 保持 `npm run check` 为唯一聚合检查入口。
- 保持 `npm run build` 为构建门禁。
- 保持 build budget 检查。
- 保持 reachability / lazy-load / static asset 检查。
- 每当新增治理工具时，接入 `npm run check`。

验收：

- `npm run check` 通过。
- `npm run build` 通过。
- 没有无关文件混入 commit。

### 阶段 1：发布稳定性和数据质量治理

状态：已完成一部分，仍需继续。

目标：

- 消除会导致线上崩溃、数据不可恢复、环境不一致的基础问题。

已完成：

- 项目快照过滤临时生成节点。
- 媒体 URL 稳定化。
- 服务端 snapshot sanitizer 兜底。

后续任务：

1. 检查所有持久化 JSON：
   - project snapshot；
   - conversation metadata；
   - asset metadata；
   - ai job output。
2. 确认所有本地绝对 URL 都不会被长期保存。
3. 对上传文件、生成结果、缩略图建立统一 URL 规则。
4. 增强 database integrity / orphan file 检查。
5. 增加 production-like 启动检查。

验收：

- 旧项目打开不恢复临时节点。
- 首页、项目库、画布中的图片 URL 一致。
- `npm run check` 覆盖关键持久化规则。
- `npm run build` 通过。

### 阶段 2：前端入口和 runtime 边界治理

状态：已做多轮，但仍需继续。

目标：

- 让启动链路短、明确、可验证。
- 减少 barrel、wrapper、composition 中的纯转发层。
- 保留必要兼容层，但让其逐步变薄。

任务：

1. 固定启动路径：
   - `app.js`；
   - `src/client/main.js`；
   - `src/client/core/app-init.js`；
   - workspace mount/runtime。
2. 清理纯 forwarding modules。
3. 检查 workspace runtime dependency groups。
4. 只在有 reachability 证据时删除不可达文件。
5. 保持 heavy workflow 不进入首屏启动路径。

不做：

- 不重写 app-init。
- 不改变启动顺序。
- 不改变 UI 初始化时机。

验收：

- browser startup request 数量不回升。
- heavy 3D/video workflow 不进入首屏主 bundle。
- `scripts/check-client-reachability.js` 通过。
- `scripts/check-browser-startup-lazy-load.js` 通过。

### 阶段 3：Prompt / Chat 工作流治理

状态：正在进行。

目标：

- 继续降低 `prompt-workflow.js` 复杂度。
- 将纯逻辑、网络逻辑、stream 逻辑、DOM 逻辑拆成稳定边界。

优先任务队列：

1. 纯数据构造：
   - conversation payload；
   - generation payload；
   - debug summary；
   - project patch；
   - result node options。
2. 状态判断：
   - generation intent；
   - tool event；
   - stream completion；
   - retryable error；
   - autosave condition。
3. 子流程拆分：
   - conversation run；
   - stream runner；
   - history workflow；
   - popover lifecycle；
   - attachment restore。
4. DOM 拆分：
   - 只有在对应检查覆盖后再拆；
   - 不改变 markup；
   - 不改变 selector。

每轮规则：

- 只抽一个职责。
- 增加或扩展 `scripts/check-prompt-*.js`。
- 不改聊天框视觉。
- 不改生成流程。
- 不改项目保存时机。

完成标准：

- `prompt-workflow.js` 主要成为 orchestration 层。
- 纯工具分散到清晰 utils。
- stream、history、popover、debug、preview 均有独立检查脚本。

### 阶段 4：Image Generator 工作流治理

状态：已做多轮，继续收尾。

目标：

- 让 `image-generator-workflow.js` 从巨型流程变成调度层。

优先任务：

1. job polling utilities 收口。
2. result parsing / output normalization 收口。
3. preview replacement 收口。
4. size / placement / model selection 收口。
5. reference image reading 收口。
6. recovered job restore 收口。

风险点：

- 生成完成后替换 preview 的时机。
- 保存项目的时机。
- 画布节点坐标和尺寸。
- 与 prompt workflow 共用生成结果的逻辑。

验收：

- `scripts/check-generator-job-recovery.js` 通过。
- `scripts/check-generation-autosave.js` 通过。
- 生成中 pending preview 行为不变。
- 生成完成后最终 image node 行为不变。

### 阶段 5：Video / 3D / Heavy Workflow 治理

状态：已开始。

目标：

- 保持重型能力 lazy-load。
- 让 3D/video 不污染首屏启动和主 bundle。

任务：

1. video generator workflow 继续拆分：
   - payload；
   - job polling；
   - preview node；
   - reference utils；
   - form state。
2. model viewer workflow 保持 lazy import。
3. 任何新增重型能力必须延迟加载。
4. build budget 中单独监控 heavy chunks。

验收：

- build budget 通过。
- browser startup lazy-load 检查通过。
- 首屏不请求 3D/video heavy workflow。

### 阶段 6：Canvas 核心工作流治理

状态：待深入。

目标：

- 治理 `canvas-menu-actions.js`、node controls、drag/resize、toolbar 等高耦合区域。

优先任务：

1. 静态地图：
   - action registry；
   - menu command；
   - node selection；
   - clipboard；
   - layout alignment。
2. 抽纯工具：
   - clipboard snapshot；
   - layout calculations；
   - alignment calculation；
   - bounds calculation；
   - menu enable/disable 判断。
3. 后拆 DOM 绑定：
   - 需要 selector evidence；
   - 需要 smoke 检查。

不做：

- 不改菜单结构。
- 不改快捷键。
- 不改 toolbar 视觉。
- 不改节点交互。

验收：

- canvas menu 行为不变。
- node selection / drag / resize 行为不变。
- 有对应脚本或 smoke 保护。

### 阶段 7：Projects / Assets / Task Log 治理

状态：projects/assets 已有较多治理，task-log 文档债较重。

目标：

- 项目库、素材库、任务日志成为清晰 feature。
- 清理 task-log 过多治理文档。

Projects 后续任务：

- 继续收敛 project runtime public API。
- 强化远端项目保存失败和回滚检查。
- 保持快照保存与恢复规则稳定。

Assets 后续任务：

- 收敛 asset-library runtime。
- 统一 asset URL、thumbnail、metadata 规则。
- 为未来对象存储保留 provider 边界。

Task Log 后续任务：

- 先合并文档，再删冗余文档。
- 梳理 API contract、runtime selector、template seam。
- 然后再做代码拆分。

验收：

- 项目库保存/删除以服务端结果为准。
- 素材库上传/引用/插入画布行为不变。
- task-log 文档数量下降，但关键证据不丢失。

### 阶段 8：CSS 系统治理

状态：待执行。

目标：

- 从 legacy CSS 大文件迁移到可维护的 feature CSS。
- 不改变视觉。

执行顺序：

1. 先增强 CSS 检查：
   - entry imports；
   - MIME/static asset；
   - selector presence；
   - critical layout class。
2. 再选一个低风险 feature：
   - task-log；
   - auth dialog；
   - project library。
3. 每次只移动一小组样式。
4. 每次保留原 selector 行为。
5. 视觉检查后再删除旧规则。

禁止：

- 一次大拆 `legacy-node.css`。
- 一次大拆 `workspace-layout.css`。
- 为了“现代化”改变色彩、圆角、间距、阴影。

验收：

- 首页、画布、聊天框、项目库、素材库、登录弹窗、任务日志视觉不变。
- CSS 文件职责更清楚。
- legacy CSS 行数逐步下降。

### 阶段 8.5：失效功能与历史遗留清理治理

状态：持续执行。

目标：

- 将全失效、半失效、被替代、页面不再需要的备用代码纳入长期治理，而不是凭感觉删除。
- 在不改变现有 UI、交互、生成、上传、保存、项目库、素材库、登录、计费和持久化行为的前提下，持续减少历史遗留代码。
- 让每一次删除都有静态证据、运行验证、风险分级和清晰回滚点。

审计对象：

- 全失效代码：无静态 import、无 HTML 引用、无 CSS import、无 package script 调用、无动态 import、无字符串路径或全局对象引用、无运行入口。
- 半失效代码：初始化仍存在，但事件类型不匹配、UI 不可见、动作是 mock、功能链路断开、默认禁用且无用户入口。
- 页面不再需要的备用代码：旧页面、旧弹窗、旧按钮、旧 panel、旧交互方案、旧视觉风格、旧素材库或项目库备用样式。
- 历史遗留功能：新方案已经替代，但旧兼容层、状态字段、dataset、CSS selector、空函数、forwarding module 或文档仍残留。

删除分级：

- 高置信可删：静态不可达、无动态引用、无页面引用、无样式引用、检查通过，并且删除后可通过简单 commit revert 回滚。
- 中风险候选：功能半失效、mock、兼容空壳、备用 UI、旧交互残留，或是否还符合产品方向需要用户确认。
- 高风险不能删：仍参与生成、保存、上传、项目库、素材库、auth、credits、billing、conversation、AI job、持久化、权限隔离或生产配置链路。

执行流程：

1. 先审计，不删除，输出候选清单和证据。
2. 每批只处理一个功能域，例如 AI Core 残留、旧 Agent bubble、素材库旧样式、项目库旧样式、task-log 文档债。
3. 删除前确认候选没有静态 import、HTML 引用、CSS import、package script 调用、动态 import、字符串路径、window 全局对象或服务端暴露依赖。
4. 半失效功能必须先确认产品方向：继续修复、保留禁用、还是删除。
5. 涉及 UI、DOM 或 CSS 时，必须有 selector 证据；必要时补浏览器 smoke。
6. 删除后必须运行 `npm run check` 和 `npm run build`。
7. 报告必须说明删了什么、为什么能删、什么没删、风险、回滚方式和下一批建议。

验收：

- `scripts/check-client-reachability.js` 通过。
- CSS 清理后 `scripts/check-style-entry.js` 通过。
- 启动链路清理后 `scripts/check-browser-startup-lazy-load.js` 通过。
- 页面上不再出现被删除功能的 DOM/UI。
- 核心功能行为不变。
- 生成、上传、保存、项目库、素材库、auth、计费、持久化和 AI job 链路没有被削弱。

### 阶段 9：后端 SaaS Provider 深化

状态：已有 seam，需增强。

目标：

- 让未来接对象存储、Redis、队列、支付时，不需要重写业务层。

StorageProvider：

- 保留 local 实现。
- 抽象 upload path、public URL、private access、delete、exists。
- 未来接 R2/S3/OSS/CDN。
- 不直接改现有上传行为。

JobQueue：

- 保留 local 实现。
- 定义 enqueue、getStatus、complete、fail、cancel。
- 未来接 Redis/BullMQ/worker。
- 不改变现有生成接口。

RateLimitStore：

- 保留 memory 实现。
- 定义 increment、reset、ttl。
- 未来接 Redis。
- 路由不直接依赖 Map。

BillingProvider：

- 保留 credit ledger。
- 预留 order、payment、refund、invoice。
- 失败任务未来支持积分返还。
- 不新增支付页面。

AuditLogger：

- 覆盖登录、上传、生成、保存、删除、计费变化。
- 先有 local，再预留外部日志。
- 不影响用户流程。

验收：

- provider 至少接入一条真实运行路径。
- local 实现继续可用。
- API 行为不变。
- provider check 脚本通过。

### 阶段 10：API 合同和验证治理

状态：已有部分脚本，仍需系统化。

目标：

- 所有关键 SaaS API 有输入校验、错误合同和隔离验证。

范围：

- auth；
- projects；
- assets；
- uploads；
- credits；
- conversations；
- AI jobs；
- protected uploads。

任务：

1. 统一错误格式。
2. 统一输入读取。
3. 统一 request user / workspace scope。
4. 补 API contract checks。
5. 补跨用户隔离 checks。
6. 补非法输入 checks。

验收：

- 未登录返回 401。
- 跨用户资源不可访问。
- 非法输入返回稳定错误。
- API tests 不依赖真实生产数据。

### 阶段 11：安全和生产配置治理

状态：待深入。

目标：

- 达到可公开 SaaS 的最低安全基线。

任务：

- 收紧 CSP。
- 梳理 inline/eval 依赖。
- Cookie flags 检查。
- 上传 MIME 和大小限制。
- private image URL 防护。
- protected upload 权限隔离。
- `.env` 和 secret hygiene。
- Railway production env 检查。
- 禁止 mock provider 在生产开启。

验收：

- `scripts/check-auth-config.js` 通过。
- upload security checks 通过。
- railway env check 在生产配置下可执行。
- 没有明显 secret 泄露路径。

### 阶段 12：数据、迁移、备份和恢复治理

状态：待深入。

目标：

- 数据库可长期运营、可迁移、可恢复。

任务：

- 明确 SQLite 当前边界。
- 建立备份脚本。
- 建立恢复演练。
- 迁移脚本可重复执行。
- project snapshots 可审计。
- orphan uploads 可检查。
- 为未来 PostgreSQL 迁移预留 repository 边界。

不做：

- 不立即强迁 PostgreSQL。
- 不破坏现有 SQLite 数据。

验收：

- DB integrity check 通过。
- 迁移可重复执行。
- 有恢复步骤。
- 数据清理不会删除仍被引用的文件。

### 阶段 13：自动化 UI / E2E 治理

状态：不足。

目标：

- 关键用户路径有自动化或半自动 smoke 证据。

关键路径：

- 登录 / 登出 / session 恢复。
- 首页输入生成进入画布。
- 生成中 pending preview。
- 生成完成替换最终节点。
- 项目保存。
- 项目打开。
- 项目删除失败回滚。
- 素材上传。
- 素材插入画布。
- 任务日志刷新。

验收：

- 至少覆盖核心发布路径。
- 能在本地 production-like 服务上运行。
- 失败时能定位到 API、DB、前端状态或第三方 provider。

### 阶段 14：文档债清理

状态：待执行。

目标：

- `docs/architecture` 从阶段性地图集合，收敛成少量长期有用文档。

必须保留：

- `current-state.md`
- `saas-governance-prd.md`
- `style-entry-map.md`
- `frontend-entry-governance-map.md`

暂时保留：

- `index-template-map.md`
- `dom-dependency-map.md`
- `runtime-event-map.md`
- `feature-template-split-checklist.md`

task-log 文档处理：

1. 先合并到 `task-log-governance-index.md`。
2. 确认 API contract、selector evidence、runtime map、template seam、smoke checklist 没丢。
3. 再逐个删除冗余 task-log 文档。
4. 删除必须单独 commit。

可优先合并或删除候选：

- `encoding-audit.md`

删除文档验收：

- `rg` 无硬引用。
- PRD 或保留索引已吸收仍有价值的信息。
- `npm run check` 通过。
- `npm run build` 通过。

### 阶段 15：SaaS 发布候选治理

状态：未达到。

目标：

- 达到可公开试运营的 SaaS 质量。

进入条件：

- 项目保存/打开/删除稳定。
- 生成结果持久化稳定。
- 上传与 protected upload 权限稳定。
- auth/session 稳定。
- 生产 env 检查完整。
- DB 备份恢复演练完成。
- 基础 API tests 和 UI smoke 通过。

发布前必须完成：

- 禁止生产 mock。
- Railway env 完整。
- CSP 风险有明确清单和缓解。
- 资产存储策略明确。
- 备份策略明确。
- 回滚策略明确。
- 日志和审计最小可用。

不满足时：

- 只能作为内测或私有 beta。
- 不应作为成熟 SaaS 正式发布。

## 5. 自动执行规则

当 Codex 根据本 PRD 自动继续工作时，按以下规则选择下一步。

### 5.1 优先级顺序

1. 当前工作区是否干净；若不干净，先确认未提交改动来源。
2. 是否有未完成的小阶段；有则先完成它。
3. 优先做前端大 workflow 的纯逻辑拆分。
4. 再做检查脚本补强。
5. 再做后端 provider/service 深化。
6. 再做 CSS 小范围迁移。
7. 再做失效功能与历史遗留清理。
8. 最后做文档债清理。

### 5.2 每轮任务大小

每轮建议：

- 1 到 3 个源码文件。
- 1 个对应检查脚本。
- 1 个 commit。
- 不跨越多个 feature。

允许例外：

- 如果是删除文档阶段，可以一次删除多个已合并文档。
- 如果是检查脚本接入阶段，可以同时改 `package.json` 和脚本。

### 5.3 每轮完成定义

一轮治理完成必须满足：

- 修改范围和阶段目标一致。
- 行为等价。
- `npm run check` 通过。
- `npm run build` 通过。
- commit 只包含本轮相关文件。
- final 输出包含：
  - 修改文件；
  - 是否改变行为；
  - 风险；
  - 回滚方式；
  - 下一步建议。

### 5.4 何时暂停

出现以下情况必须暂停并汇报：

- 需要改变 UI 或交互才能继续。
- 需要新增依赖。
- 需要删除文件但证据不足。
- 检查失败且原因不明确。
- 发现线上数据或数据库迁移风险。
- 发现当前工作区有用户未提交业务改动，且会和本轮冲突。

## 6. 成熟度标准

### 6.1 当前成熟度判断

当前 AI Studio 已经超过“纯原型”，进入“可治理的单体产品”阶段。

但还没有达到成熟 SaaS 正式发布标准。

### 6.2 成熟 SaaS 最低标准

必须满足：

- 关键功能有自动化验证。
- 生产配置有明确门禁。
- 用户数据隔离可靠。
- 上传和生成资产可恢复。
- 数据库可备份、可恢复、可迁移。
- 错误可定位。
- 费用和积分流水可追踪。
- 长任务失败可恢复或可解释。
- 部署、回滚、故障排查有固定流程。

### 6.3 长期维护标准

长期目标：

- 新功能不进入 legacy。
- 新业务必须有 feature 边界。
- 新 API 必须有 service 边界。
- 新外部能力必须走 provider。
- 新持久化字段必须有迁移和检查。
- 新重型前端能力必须 lazy-load。
- 新关键流程必须接入 `npm run check`。

## 7. 推荐近期执行序列

在没有新的用户指令时，建议按这个顺序继续：

1. 修复和提交本 PRD 的 UTF-8 编码。
2. 继续 `prompt-workflow.js` 纯逻辑拆分。
3. 继续 `image-generator-workflow.js` 收尾拆分。
4. 静态梳理 `canvas-menu-actions.js`，优先抽纯工具。
5. 合并 task-log 文档，删除冗余文档。
6. 开始 CSS selector/smoke 检查增强。
7. 小范围 CSS feature 迁移。
8. 审计并小批删除失效功能、半失效功能和历史遗留备用代码。
9. 深化 StorageProvider / JobQueue / RateLimitStore。
10. 补 API contract 和 UI smoke。
11. 做 production-like 发布演练。
