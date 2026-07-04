function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderProjectPreviewImage({ preview = "", title = "", fallback = "D" } = {}) {
  const fallbackMarkup = `<span class="project-preview-fallback" aria-hidden="true">${escapeHtml(fallback)}</span>`;
  if (!preview) return fallbackMarkup;
  return `
    ${fallbackMarkup}
    <img class="project-preview-image" src="${escapeHtml(preview)}" alt="${escapeHtml(title)}" onerror="this.hidden=true" />
  `;
}

export function showProjectSaveStatus(element, {
  text = "Saved to cloud",
  duration = 1600,
  tone = "success"
} = {}) {
  if (!element) return;
  element.classList.remove("is-success", "is-error", "is-pending");
  element.textContent = text;
  element.classList.add("show");
  element.classList.add(`is-${tone}`);
  window.clearTimeout(element._saveTimer);
  if (!duration) return;
  element._saveTimer = window.setTimeout(() => {
    element.classList.remove("show");
    element.classList.remove("is-success", "is-error", "is-pending");
    element.textContent = "";
  }, duration);
}

export function applyProjectLibraryClasses(element, { mode = "stack", transitionDirection = 0 } = {}) {
  if (!element) return;
  element.classList.add("mode-grid");
  element.classList.remove("mode-stack", "switch-next", "switch-prev");
}

export function renderProjectLibraryContent({
  projects = [],
  activeProjectId = "",
  mode = "grid",
  selectionMode = false,
  selectedProjectIds = [],
  getProjectPreview,
  getProjectDisplayTitle,
  getProjectDisplayPrompt,
  formatProjectDate = (value) => {
    if (!value) return "--/--";
    try {
      const date = new Date(value);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const hour = String(date.getHours()).padStart(2, "0");
      const minute = String(date.getMinutes()).padStart(2, "0");
      return `${month}/${day} ${hour}:${minute}`;
    } catch {
      return String(value);
    }
  }
} = {}) {
  if (!projects.length) {
    return `
      <button class="project-empty" type="button" data-new-project>
        <span>+</span>
        <strong>Create a new board</strong>
        <small>Click to open a blank canvas</small>
      </button>
    `;
  }

  const selectedProjectSet = new Set(selectedProjectIds);
  return `
    <header class="library-page-header">
      <span>Project Library</span>
      <strong>\u9879\u76ee\u5e93</strong>
      <small>${projects.length} \u4e2a\u9879\u76ee</small>
    </header>
    ${renderProjectSelectionToolbar({
      selectionMode,
      selectedCount: selectedProjectSet.size,
      totalCount: projects.length
    })}
    <section class="project-card-board" aria-label="Project previews">
      <button class="library-new-card" type="button" data-new-project>
        <span>+</span>
        <strong>New Project</strong>
        <small>Blank canvas</small>
      </button>
      ${projects.map((project, index) => renderSmallProjectCard({
        project,
        index,
        getProjectPreview,
        getProjectDisplayTitle,
        formatProjectDate,
        selectionMode,
        selected: selectedProjectSet.has(project.id)
      })).join("")}
    </section>
  `;
}

export function renderHomeHistoryContent({
  projects = [],
  getProjectPreview,
  formatProjectDate = (value) => {
    if (!value) return "更新于 --";
    try {
      const date = new Date(value);
      return `更新于 ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    } catch {
      return "更新于 --";
    }
  }
} = {}) {
  const cards = projects.slice(0, 4).map((project, index) => {
    const preview = getProjectPreview(project, index);
    const title = project.title || "未命名";
    const updated = formatProjectDate(project.updatedAt);
    return `
      <article class="home-history-card" data-history-index="${index}">
        <button type="button" data-open-project="${escapeHtml(project.id)}">
          <div class="home-history-thumb">
            ${renderProjectPreviewImage({ preview, title })}
          </div>
          <strong>${escapeHtml(title)}</strong>
          <small>${escapeHtml(updated)}</small>
        </button>
        <button class="home-history-delete" type="button" data-delete-project="${escapeHtml(project.id)}" aria-label="删除项目">
          <span aria-hidden="true"></span>
        </button>
      </article>
    `;
  }).join("");

  return `
    <header class="home-section-head compact">
      <strong>最近项目</strong>
      <button type="button" data-nav-view="library">查看全部<span aria-hidden="true">›</span></button>
    </header>
    <div class="home-history-grid">
      <article class="home-history-card is-create">
        <button type="button" data-new-project>
          <div class="home-history-thumb">
            <span class="home-history-create-icon">+</span>
            <strong>新建项目</strong>
          </div>
        </button>
      </article>
      ${cards}
    </div>
  `;
}

function renderHomeHistoryContentLegacy({ projects = [], getProjectPreview } = {}) {
  const previewProjects = projects.length ? projects.slice(0, 4) : [];
  const source = previewProjects.length
    ? previewProjects
    : [
      { title: "Fresh Ideas", prompt: "Blank canvas" },
      { title: "AI storyboard", prompt: "Visual planning" },
      { title: "Product render", prompt: "Creative board" },
      { title: "Concept scene", prompt: "Inspiration" }
    ];
  const cards = source.map((project, index) => {
    const preview = project.id ? getProjectPreview(project, index) : "";
    const title = project.title || "Fresh Ideas";
    const prompt = project.prompt || project.desc || "继续上次创作";
    return `
      <article class="home-history-card" data-history-index="${index}">
        <button type="button" ${project.id ? `data-open-project="${escapeHtml(project.id)}"` : "data-nav-view=\"library\""}>
          <div class="home-history-thumb">
            ${renderProjectPreviewImage({ preview, title })}
          </div>
          <strong>${escapeHtml(title)}</strong>
          <small>${escapeHtml(prompt)}</small>
        </button>
      </article>
    `;
  }).join("");

  return `
    <header class="home-section-head compact">
      <div>
        <span>Recent projects</span>
        <strong>历史记录</strong>
      </div>
      <button type="button" data-nav-view="library">项目库</button>
    </header>
    <div class="home-history-grid">${cards}</div>
  `;
}

function renderProjectSelectionToolbar({
  selectionMode = false,
  selectedCount = 0,
  totalCount = 0
} = {}) {
  const allSelected = totalCount > 0 && selectedCount === totalCount;
  return `
    <div class="library-selection-bar" aria-label="Project selection actions">
      <button class="library-select-toggle${selectionMode ? " active" : ""}" type="button" data-project-select-mode>
        ${selectionMode ? "\u53d6\u6d88\u591a\u9009" : "\u591a\u9009"}
      </button>
      ${selectionMode ? `
        <strong>\u5df2\u9009\u62e9 ${selectedCount} \u4e2a\u9879\u76ee</strong>
        <div>
          <button type="button" data-project-select-all>${allSelected ? "\u53d6\u6d88\u5168\u9009" : "\u5168\u9009"}</button>
          <button type="button" class="danger" data-project-bulk-delete ${selectedCount ? "" : "disabled"}>\u5220\u9664</button>
        </div>
      ` : ""}
    </div>
  `;
}

function renderSmallProjectCard({
  project,
  index,
  getProjectPreview,
  getProjectDisplayTitle,
  formatProjectDate,
  selectionMode = false,
  selected = false
}) {
  const preview = getProjectPreview(project, index);
  const title = getProjectDisplayTitle(project, index);
  const cardAction = selectionMode
    ? `data-project-select="${escapeHtml(project.id)}"`
    : `data-open-project="${escapeHtml(project.id)}"`;
  return `
    <article class="library-small-card${selectionMode ? " is-selectable" : ""}${selected ? " selected" : ""}" data-project-id="${escapeHtml(project.id)}">
      ${selectionMode ? `
        <button class="library-card-check" type="button" data-project-select="${escapeHtml(project.id)}" aria-label="${selected ? "Unselect" : "Select"} ${escapeHtml(title)}">
          <span aria-hidden="true">${selected ? "\u2713" : ""}</span>
        </button>
      ` : ""}
      <button type="button" ${cardAction}>
        <div>
          ${renderProjectPreviewImage({ preview, title })}
        </div>
        <strong>${escapeHtml(title)}</strong>
        <small>Updated at ${formatProjectDate(project.updatedAt)}</small>
      </button>
    </article>
  `;
}
