# Task Log Copy Audit

This document records a read-only audit of task-log runtime copy. It is
documentation only. It does not change runtime behavior, UI, interaction, CSS,
server code, or templates.

## Date

Date: 2026-06-30

## Scope

File reviewed:

```text
src/client/features/workspace/task-log/task-log-runtime.js
```

Related evidence:

```text
docs/architecture/encoding-audit.md
docs/architecture/task-log-static-evidence.md
```

Out of scope:

- No source edits.
- No UI copy restoration in this batch.
- No template split.
- No CSS change.
- No handling of the existing `styles/task-log.css` worktree change.

## Audit Method

Two read paths were compared:

```powershell
rg -n "STATUS_LABELS|任务|生成|复制|查看|暂无|加载|打开|失败|成功|排队|运行|保存|取消|超时" src/client/features/workspace/task-log/task-log-runtime.js
Get-Content src/client/features/workspace/task-log/task-log-runtime.js
```

Observed result:

- `rg` rendered the task-log Chinese strings as readable UTF-8.
- `Get-Content` rendered the same file as mojibake in this shell.
- Existing `docs/architecture/encoding-audit.md` already warns that
  PowerShell output can display valid UTF-8 Chinese as mojibake in this
  environment.

Conclusion:

- Do not treat `Get-Content` output alone as proof that
  `task-log-runtime.js` is corrupted.
- For this file, `rg` is the stronger local readback signal in this environment.

## Readable Copy Confirmed By `rg`

Status labels:

```text
queued: 排队中
running: 运行中
succeeded: 成功
failed: 失败
timeout: 超时
save_failed: 保存失败
cancelled: 已取消
```

Table and action copy:

```text
任务日志加载失败
暂无任务日志
复制任务 ID
当前任务没有可查看的生成结果
查看
```

Modal copy:

```text
任务详情
正在加载任务详情...
任务详情加载失败
生成结果
正在加载生成结果...
生成结果加载失败
任务 ID
状态
失败原因
暂无可查看结果
该任务当前没有成功保存的生成输出。
```

Output preview copy:

```text
打开 3D 模型
打开视频
生成结果
打开图片
```

## Current Finding

No high-confidence task-log runtime copy corruption was found in this pass.

The earlier visible mojibake from direct `Get-Content` output should be treated
as terminal rendering noise unless a future UTF-8 byte-level scan or browser
runtime check contradicts it.

## Do Not Fix In The Next Batch

Do not perform a task-log copy restoration batch based only on PowerShell
`Get-Content` output.

Do not rewrite `task-log-runtime.js` just to normalize apparent terminal
mojibake.

Do not combine task-log copy work with any future template extraction.

## If Future Evidence Changes

Only consider a future task-log copy repair if at least one of these is true:

- A UTF-8 scanner flags actual mojibake bytes in
  `task-log-runtime.js`.
- Browser runtime displays corrupted task-log copy.
- `rg` or another UTF-8-aware readback shows corrupted source text.
- A user reports a concrete corrupted task-log string in the app.

If repair is needed later, use a separate micro-batch:

1. Fix only one small group of task-log strings.
2. Do not change selectors, markup, runtime flow, CSS, or API calls.
3. Run `npm run check`.
4. Run `npm run build`.
5. Confirm `git diff --name-only` includes only
   `src/client/features/workspace/task-log/task-log-runtime.js`.

## Current Recommendation

Do not schedule task-log copy repair yet. Keep the next task-log code-governance
candidate focused on behavior-equivalent structure only, and refresh this audit
if browser evidence shows corrupted copy.
