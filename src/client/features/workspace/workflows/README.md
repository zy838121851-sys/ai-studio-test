# Workspace workflows

Public entries:

- `index.js` exports `mountWorkspaceApp` for Next-ready client mounting.
- `index.js` exports `startWorkspaceApp` for the current compatibility startup path.

Everything else in this folder is internal composition code used to keep the
legacy browser runtime Next-ready without exposing many low-level builders as a
public API.

Current grouping:

- `workspace-app-composition.js`: top-level app workflow composition.
- `workspace-canvas-composition.js`: canvas runtime creation order.
- `workspace-canvas-*-inputs.js`: grouped input builders for canvas runtime wiring.
- `workspace-agent-composition.js`, `workspace-ai-composition.js`: AI and agent wiring.
- `workspace-project-home-composition.js`, `workspace-chat-assets-composition.js`: workspace feature wiring.
- `workspace-state-composition.js`, `workspace-launch-composition.js`: state/scope and launch adapters.

Do not add new legacy runtime files here. Prefer feature APIs, and only add a
new internal composition file when it keeps a feature boundary clearer.
