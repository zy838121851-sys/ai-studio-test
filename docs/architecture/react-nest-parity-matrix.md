# React/NestJS Product Parity Matrix

更新日期：2026-07-10

状态值：

- not-started
- baseline-captured
- in-progress
- automated
- approved
- blocked

An item is complete only when its status is approved and evidence points to passing automated or manual verification.

## Home

| ID | Surface | Required Behavior | Status | Evidence |
| --- | --- | --- | --- | --- |
| HOME-001 | Home shell | Existing nav, title, prompt, history and community layout | automated | React route test; `react-polish.spec.ts` desktop/mobile screenshots and Lucide control audit |
| HOME-002 | Prompt input | Autosize, focus and submit behavior | automated | `apps/web/app/routes/home.test.tsx` |
| HOME-003 | Attachments | Upload, thumbnail preview, remove and submit | automated | Attachment preview/remove component test; authenticated upload integration pending local infrastructure |
| HOME-004 | Model picker | Full model list, selected state, scroll and close behavior | automated | Component test plus `react-polish.spec.ts` bounds, selected state, close, and settled visual evidence |
| HOME-005 | Credit quote | Quote follows selected model | automated | Model switch test verifies 8 to 10 credit display |
| HOME-006 | Recent projects | New tile, thumbnails, title, time and open behavior | in-progress | Signed-out/new tile rendered; authenticated PostgreSQL integration pending |
| HOME-007 | Channels | Active channel and horizontal scroll behavior | automated | React implementation and desktop/mobile Playwright screenshots |
| HOME-008 | Inspiration feed | Masonry sizing, filtering and incremental load | automated | Local image feed and desktop/mobile Playwright screenshots |
| HOME-009 | Back to top | Visibility and smooth scroll | in-progress | React implementation present; dedicated browser assertion pending |
| HOME-010 | Generation handoff | Create project, enter canvas, pending then result | in-progress | API/worker and React receiver automated independently; PostgreSQL/Redis end-to-end integration pending |
| HOME-011 | Responsive | Desktop, tablet and mobile match legacy | automated | `react-polish.spec.ts` verifies 1440x1000 and 390x844 layout, 44px controls, overflow, and safe-area rules |

## Authentication And Account

| ID | Surface | Required Behavior | Status | Evidence |
| --- | --- | --- | --- | --- |
| AUTH-001 | Auth entry | Signed-out and signed-in states | in-progress | Signed-out gate automated; signed-in integration pending PostgreSQL/Redis |
| AUTH-002 | Password | Register, login, errors and session cookie | not-started | |
| AUTH-003 | Email code | Send, verify, throttle and expiry | not-started | |
| AUTH-004 | SMS code | Send, verify, throttle and expiry | not-started | |
| AUTH-005 | OAuth | WeChat and QQ provider availability and callback | not-started | |
| AUTH-006 | Account popover | Profile, points, upgrade and logout | in-progress | Authenticated account-menu visual and interaction automated in `react-polish.spec.ts`; commercial entries and live integration remain pending |
| AUTH-007 | Session restore | Refresh restores the current user | not-started | |
| AUTH-008 | Isolation | Cross-user/workspace resources are hidden | not-started | |

## Projects And Persistence

| ID | Surface | Required Behavior | Status | Evidence |
| --- | --- | --- | --- | --- |
| PROJ-001 | Create | New project title, prompt and empty document | not-started | |
| PROJ-002 | Save | Backend result is save truth | not-started | |
| PROJ-003 | Open | Document, thumbnail and recent time restore | automated | React receiver component tests restore project title and persisted document |
| PROJ-004 | Delete | Confirm, backend delete and failure rollback | not-started | |
| PROJ-005 | Snapshot | Versioned CanvasDocument save and restore | automated | `canvas-engine` normalization tests and React receiver tests |
| PROJ-006 | Thumbnail | Home/library thumbnail remains stable | not-started | |
| PROJ-007 | Recovery | Invalid or temporary nodes do not restore | automated | `normalizeCanvasDocument` filters malformed and unsupported nodes |

## Canvas Viewport And Selection

| ID | Surface | Required Behavior | Status | Evidence |
| --- | --- | --- | --- | --- |
| CANVAS-001 | Viewport | Pan, wheel zoom, step zoom and fit content | not-started | |
| CANVAS-002 | Coordinates | Pointer and world coordinates remain aligned | not-started | |
| CANVAS-003 | Selection | Single, multi, box and clear selection | not-started | |
| CANVAS-004 | Drag | Node and multi-node drag | not-started | |
| CANVAS-005 | Resize | Handles, aspect rules and minimum sizes | not-started | |
| CANVAS-006 | History | Undo and redo | not-started | |
| CANVAS-007 | Clipboard | Copy, paste and duplicate | not-started | |
| CANVAS-008 | Alignment | Align and layout commands | not-started | |
| CANVAS-009 | Stack | Stack, tray and member selection | not-started | |
| CANVAS-010 | Keyboard | Existing shortcuts and focus exclusions | not-started | |

## Canvas Tools

| ID | Surface | Required Behavior | Status | Evidence |
| --- | --- | --- | --- | --- |
| TOOL-001 | Tool rail | Original icons, colors, active states and collapse | not-started | |
| TOOL-002 | Shapes | Shape submenu and all shape creation | not-started | |
| TOOL-003 | Arrow | Pointer path, arrow geometry and formatting | not-started | |
| TOOL-004 | Text | Create, edit, select and format | not-started | |
| TOOL-005 | Pen | Pointer-following path, color and width | not-started | |
| TOOL-006 | Laser pen | Pointer-following animation and cleanup | not-started | |
| TOOL-007 | Eraser | Pointer-following path and deletion behavior | not-started | |
| TOOL-008 | Shape toolbar | Color, stroke and width controls | not-started | |
| TOOL-009 | Text toolbar | Font, style, size and color controls | not-started | |

## Media Nodes And Generation

| ID | Surface | Required Behavior | Status | Evidence |
| --- | --- | --- | --- | --- |
| MEDIA-001 | Upload node | Image/video/model node placement | not-started | |
| MEDIA-002 | Pending image | Loading preview and status | automated | Durable job creation appends its own pending node; React route and generation recovery evidence cover the restored status. |
| MEDIA-003 | Result image | Pending replacement, size and metadata | automated | Worker replaces only its matching pending node, preserving other canvas nodes; route and result-history Playwright evidence cover restoration. |
| MEDIA-004 | Image toolbar | Crop, upscale, background, expand, text and 3D | not-started | |
| MEDIA-005 | Image generator | Form, references, model, count and result | automated | Canvas composer accepts prompt, references and selected model; durable job/credit workflow restores pending and final results. |
| MEDIA-006 | Image edit | References, prompt and replacement | automated | Source image is validated and supplied as a protected Worker reference; edit prompt, replacement and failure recovery are covered by browser tests. |
| MEDIA-007 | Video generator | Lazy form, pending, recovery and result | not-started | |
| MEDIA-008 | 3D viewer | Lazy Three.js viewer and controls | not-started | |
| MEDIA-009 | Download | Authenticated source and stable filename | not-started | |

## Chat And Task Log

| ID | Surface | Required Behavior | Status | Evidence |
| --- | --- | --- | --- | --- |
| CHAT-001 | Composer | Prompt, files, model and send | not-started | |
| CHAT-002 | Canvas reference | Selected image appears as reference thumbnail | automated | Canvas selection adapter unit test plus `chat-composer.spec.ts` verifies instant thumbnail creation and removal. |
| CHAT-003 | Thinking | Step status and failure progression | automated | Durable queued/running/succeeded/failed job state is restored in the conversation stream and actively polled. |
| CHAT-004 | Results | Image/video/model result cards | automated | Assistant result cards render durable image output after restoration; video/model cards remain their dedicated workflow packages. |
| CHAT-005 | History | Conversation persistence and selection | automated | Workspace-scoped project conversations and messages are persisted; `chat-composer.spec.ts` verifies restore. |
| CHAT-006 | Recovery | Reload restores active/finished jobs | automated | Conversation retrieval joins workspace-scoped jobs and polls queued/running states; browser restore test covers an active job. |
| TASK-001 | Task log | List, filters, details and refresh | not-started | |
| TASK-002 | Job state | Queued, running, success, failed and cancelled | not-started | |

## Asset Library

| ID | Surface | Required Behavior | Status | Evidence |
| --- | --- | --- | --- | --- |
| ASSET-001 | Upload | Upload and server registration | not-started | |
| ASSET-002 | Collections | Create, list and move | not-started | |
| ASSET-003 | Library | Masonry/list, preview and pagination | not-started | |
| ASSET-004 | Canvas insert | Insert at expected world position | not-started | |
| ASSET-005 | Favorite/save | Save generated media to a collection | not-started | |
| ASSET-006 | Delete | Backend delete with failure handling | not-started | |
| ASSET-007 | Protected read | Cross-workspace access denied | not-started | |

## Commercial And Compliance

| ID | Surface | Required Behavior | Status | Evidence |
| --- | --- | --- | --- | --- |
| BILL-001 | Plans | Current plans and entitlements | not-started | |
| BILL-002 | Checkout | WeChat and Alipay | not-started | |
| BILL-003 | Credits | Purchase and authoritative ledger | not-started | |
| BILL-004 | Subscription | Sign, renew, grace and entitlement | not-started | |
| BILL-005 | Reminder | Pre-renewal notification evidence | not-started | |
| BILL-006 | Cancel | Immediate accessible cancellation | not-started | |
| BILL-007 | Refund | Request, provider result and ledger | not-started | |
| BILL-008 | Invoice | Request and status | not-started | |
| COMP-001 | Legal | Terms, privacy and refund rules | not-started | |
| COMP-002 | Model disclosure | Model, provider and filing number | not-started | |
| COMP-003 | Content safety | Input/output moderation and appeal | not-started | |
| COMP-004 | AI labels | Visible and metadata labels on export | not-started | |
| COMP-005 | Account deletion | Confirm, revoke and retention workflow | not-started | |
| COMP-006 | Data export | Authenticated export workflow | not-started | |
| COMP-007 | Cross-border | Approved production policy | blocked | User decision pending |

## Operational Gates

| ID | Gate | Status | Evidence |
| --- | --- | --- | --- |
| OPS-001 | API multi-instance | not-started | |
| OPS-002 | Worker recovery | not-started | |
| OPS-003 | PostgreSQL backup/restore | not-started | |
| OPS-004 | OSS recovery | not-started | |
| OPS-005 | Redis outage behavior | not-started | |
| OPS-006 | SLS/ARMS alerts | not-started | |
| OPS-007 | Security review | not-started | |
| OPS-008 | ICP/license decision | not-started | |
| OPS-009 | Model application registration | not-started | |
| OPS-010 | Payment production approval | not-started | |
| OPS-011 | Cutover rehearsal | not-started | |
| OPS-012 | Rollback rehearsal | not-started | |
