# 死代码 / 未启用功能审计报告（第一轮）

日期：2026-07-05

> 范围：`src/client`、`src/server`、`styles`、`scripts`、`docs/architecture`（task-log 与入口相关文档）、根目录旧入口文件。

## 结论总览

### 关键结果
- 本轮审计未发现可直接判定为“高置信可删除”的 `src/client`/`src/server` 代码文件。
- `npm run check` 与 `npm run build` 均通过（详见后续）。
- `styles.css` 为唯一 HTML 样式入口，CSS 入口链完整；`/styles.css` 与 `/assets/styles` 可被服务端提供，但 `/styles` 静态映射当前路由中注释禁用。
- 主要可回收价值主要在**未被任何 package 命令引用的脚本文件**与部分**高可疑任务文档**（待人工复核）。

### 命令证据

```bash
npm run check   # 通过
npm run build   # 通过
node scripts/check-client-reachability.js  # 通过
node scripts/check-style-entry.js           # 通过
```

`npm run check` 关键输出：`Client reachability checks passed. reachable=399 client_unreachable=0`，
`Style entry checks passed`。

`npm run build` 关键输出：构建成功，预算检查通过，静态资源检查通过。

---

## 一、JS 可达性与未引用候选

### 1) 静态可达性（高优先证据）
- `app.js`、`server.js`、`src/main.js`、`src/client/main.js`、`src/server/index.js` 为入口起点。
- 静态入口扫描与动态启动检查均表明：
  - `src/client` 无未引用静态模块（`check-client-reachability` 的 client 不可达计数为 0）。
- 动态加载场景存在（如 `import()` loader），其中 loader 与目标模块链路有完整动态引用证据（非静态）。

### 2) “高置信可删除”候选
- 结论：**当前无源码文件（`src/client`/`src/server`）可判定为高置信可删除**。
- 理由：静态/动态入口链路完整，无明确断链；删除风险高，需避免误删行为契约。

### 3) “中风险（需人工确认）”候选
- `scripts/` 内 14 个脚本未被 `package.json` 的任何脚本命令直接调用：

```text
check-ai-call-matrix.js
check-apimart-midjourney-payload.js
check-canvas-generation-result-types.js
check-credits.js
check-doubao-no-hidden-qwen.js
check-expand-prompt.js
check-home-image-to-image-model.js
check-image-size-normalization.js
check-library-bulk-select.js
check-model-catalog.js
check-model-routing.js
check-model-selection-sync.js
check-upscale-prompt.js
check-volcengine-payload.js
```

证据：`rg` 与 package 字符串扫描结果显示这些文件未被其他脚本引用（未见内部脚本对其调用）；`package.json` scripts 未出现 `node scripts/<file>` 调用。

- **人工确认问题**：
  - 这些脚本可能是：
    1) 历史临时核验脚本（可归档）；
    2) 未来会被文档/人工流程调用的离线核验工具。
  - 未建议立即删除，优先转入“候选清单”并补充一次是否手工使用的证据（README/运维手册/CI 日志）。

---

## 二、CSS 可达性与清理候选

### 1) `styles.css` 入口与 import 复核
- `index.html` 唯一样式入口：`styles.css`。
- `/styles.css` 通过 `server.js` 提供。
- `styles.css` 的 `@import` 链完整到达：`globals.css`、`workspace.css`、`components.css`、`image-compare.css`、`task-log.css`、`legacy-split.css`。

### 2) 未被 import/不在入口链中的 CSS
- 使用脚本计算：`styles` 下所有 CSS 在入口链中可达，`check-style-entry.js` 通过。
- 因现有约束，`legacy-split.css` 中的 legacy 分支仍是主动过渡链路（不能删）。

### 3) CSS 高风险候选
- 当前**无高置信删除候选**。
- 观察到的“可疑”仅为：
  - 根目录服务端仅映射 `/assets/styles`（`/styles` 映射行代码为注释状态）；
  - 该行为不等于死代码，但属于后续上线/运维一致性检查点。

---

## 三、HTML / DOM 未查询候选（只做审计）

### 1) 全局扫描方法
- 对 `index.html` 中 `id` / `data-*` 与 `src/client` 中常见 query 写法做静态比对。

### 2) “中风险（需人工确认）”DOM 候选
- `id` 无明显直接 JS 查询痕迹：
  - `canvasArea`
  - `creditDetailTitle`
- `data-*` 无明显直接 JS 查询痕迹：
  - `data-auth-menu-action`
  - `data-context-scope`

> 备注：这些可能仍通过事件委托/`dataset` 属性在运行时消费，
> 需先做 `rg -n "data-context-scope|data-auth-menu-action|getElementById\('canvasArea'\)|#canvasArea"` 等专项验证后再下结论。

### 3) 高风险不能删
- 与运行态密切耦合且已有结构化证据的 DOM 区域（`homeView`、`projectLibraryView`、`canvasViewport`、`promptForm`、`chatLog`、`taskLog*` 等）
  - 均在 `index-template-map.md`、`dom-dependency-map.md` 有明示依赖链。
  - 不纳入本轮候选。

---

## 四、docs/architecture 任务日志类文档审计（task-log）

### 1) 文件现状
任务日志类文档数量较多且集中（14 个），主要分工：
- API 合约、测试计划、运行映射、静态证据、选择器证据、提取清单、验证清单等。

### 2) “高风险不能删”
- `task-log-runtime-map.md`、`task-log-template-contract.md`、`task-log-static-evidence.md`、`task-log-verification-checklist.md`、`task-log-governance-index.md`
  - 作为当前治理执行的主参考，不建议删除。

### 3) “中风险（可归档/合并）”
- `task-log-copy-audit.md`
  - 目前未发现除自身外的外部文件引用（以仓库当前扫描结果），内容为读取型复核与历史建议，建议先列为“归档/合并候选”。
  - 在确定未来不需保留该专项记录时，可并入 `task-log-static-evidence.md` 或 `task-log-verification-checklist.md`。

---

## 五、推荐删除顺序（仅审计建议）

### 第一小批（仅验证型文档/脚本）
1. 建议先不删代码，仅对 `scripts` 中未引用脚本做“是否历史冗余”确认：
   - 输出：确认是否存在离线/CI 手工调用。
   - 确认后再拆分为一组删除（建议一次删 5-8 个，不含任何 runtime 文件）。
2. 同步整理 `docs/architecture` 中 `task-log-copy-audit.md` 归档策略。

### 第二小批（若第一小批确认后）
3. 逐步引入“仅 `scripts` 删除”小批（不接触 `src` 与 `styles`）。
4. 重新执行 `npm run check` + `npm run build`。

> 当前阶段不建议触碰 `src/client`、`src/server`、`styles`、`index.html`。

---

## 六、删除前验证命令

```bash
npm run check
npm run build
git status --short --branch
git diff --name-only
```

可补充：

```bash
node scripts/check-client-reachability.js
node scripts/check-style-entry.js
rg -n "./scripts|node scripts/" package.json
rg -n "import\(\"|import\(\'" src/client src/server scripts
```

---

## 七、删除后 smoke test 清单（本轮仅用于清单）

- JavaScript 侧：
  - 进入画布/聊天/任务列表/资产库等核心路径；确认无 404 JS 请求。
  - 确认 `npm run check`、`npm run build` 均通过。
- CSS 侧：
  - 仅改动脚本/文档后通常不涉及视觉；若后续进入 `styles`/`index.html` 删除，需执行基础 UI 启动 smoke。
- 路由侧：
  - `GET /styles.css` 与 `/assets/styles/*` 请求正常。

---

## 八、最终建议

- 本轮是否只新增审计文档：**是**（请继续本轮仅新增本文件）。
- 本轮高置信可删除文件：**无**（按当前证据）。
- 本轮绝对不能删：
  - `src/client` 与 `src/server` 的可达入口链文件（含 `app.js`、`server.js`、`src/main.js`、`src/client/main.js`、`src/server/index.js`），以及 `styles.css` 与其导入图中所有 CSS。
- 下一轮建议删除：
  - 先做 `scripts/` 低风险“非启动/非验收”候选清理（经人工确认后），以及整理 `task-log` 文档中的冗余归档副本。
