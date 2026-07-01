# Workspace workflows

Public entries:

- `workspace-app-mount.js` exports `mountWorkspaceApp` for client mounting.
- `workspace-app-composition.js` exports `startWorkspaceApp` for workspace composition.
- `index.js` is kept as a compatibility barrel for older import paths.

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
