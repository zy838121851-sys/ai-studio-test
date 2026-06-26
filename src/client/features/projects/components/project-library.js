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
  element.classList.toggle("mode-grid", mode === "grid");
  element.classList.toggle("mode-stack", mode !== "grid");
  element.classList.toggle("switch-next", transitionDirection > 0);
  element.classList.toggle("switch-prev", transitionDirection < 0);
}

export function renderProjectLibraryContent({
  projects = [],
  activeProjectId = "",
  mode = "stack",
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

  const activeIndex = Math.max(0, projects.findIndex((project) => project.id === activeProjectId));
  const viewSwitch = renderLibraryViewSwitch(mode, projects.length);
  if (mode === "grid") {
    return `
      <header class="library-page-header">
        <span>Project Library</span>
        <strong>项目库</strong>
        <small>${projects.length} 个项目</small>
      </header>
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
          formatProjectDate
        })).join("")}
      </section>
      ${viewSwitch}
    `;
  }

  return `
    <aside class="project-timeline" aria-label="Project timeline">
      <small>Timeline</small>
      <div>${renderTimeline({ projects, activeIndex, formatProjectDate })}</div>
    </aside>
    <section class="project-stack" aria-label="Project stack">
      <button class="stack-nav stack-nav-up" type="button" data-library-step="-1" aria-label="Previous"></button>
      ${renderProjectStack({
        projects,
        activeIndex,
        getProjectPreview,
        getProjectDisplayTitle,
        getProjectDisplayPrompt
      })}
      <button class="stack-nav stack-nav-down" type="button" data-library-step="1" aria-label="Next"></button>
    </section>
    <aside class="project-count">
      <strong>${projects.length}</strong>
      <span>boards</span>
    </aside>
    ${viewSwitch}
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
      <article class="home-history-card" style="--history-index:${index}">
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
      <article class="home-history-card" style="--history-index:${index}">
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

function renderLibraryViewSwitch(mode, count) {
  return `
    <div class="library-bottom-tools" aria-label="Library view mode">
      <div class="library-view-switch">
        <button class="${mode === "stack" ? "active" : ""}" type="button" data-library-mode="stack"><i></i>Stack</button>
        <button class="${mode === "grid" ? "active" : ""}" type="button" data-library-mode="grid">Grid</button>
      </div>
      <div class="library-count-pill">${count}</div>
    </div>
  `;
}

function renderSmallProjectCard({
  project,
  index,
  getProjectPreview,
  getProjectDisplayTitle,
  formatProjectDate
}) {
  const preview = getProjectPreview(project, index);
  const title = getProjectDisplayTitle(project, index);
  return `
    <article class="library-small-card" data-project-id="${escapeHtml(project.id)}">
      <button type="button" data-open-project="${escapeHtml(project.id)}">
        <div>
          ${renderProjectPreviewImage({ preview, title })}
        </div>
        <strong>${escapeHtml(title)}</strong>
        <small>Updated at ${formatProjectDate(project.updatedAt)}</small>
      </button>
    </article>
  `;
}

function renderTimeline({ projects, activeIndex, formatProjectDate }) {
  const timelineLimit = 4;
  const timelineStart = Math.max(0, Math.min(activeIndex - 1, projects.length - timelineLimit));
  return projects.slice(timelineStart, timelineStart + timelineLimit).map((project) => {
    const index = projects.indexOf(project);
    return `
      <button class="timeline-item${index === activeIndex ? " active" : ""}" type="button" data-library-index="${index}">
        <span>${String(projects.length - index).padStart(2, "0")}</span>
        <strong>${formatProjectDate(project.updatedAt)}</strong>
      </button>
    `;
  }).join("");
}

function renderProjectStack({
  projects,
  activeIndex,
  getProjectPreview,
  getProjectDisplayTitle,
  getProjectDisplayPrompt
}) {
  return projects.map((project, index) => {
    const rawDepth = (index - activeIndex + projects.length) % projects.length;
    const depth = Math.min(rawDepth, 3);
    const preview = getProjectPreview(project, index);
    const title = getProjectDisplayTitle(project, index);
    return `
      <article class="project-stack-card${index === activeIndex ? " active" : ""}${rawDepth > 3 ? " distant" : ""}" style="--stack-index:${index}; --stack-depth:${depth}" data-project-id="${escapeHtml(project.id)}">
        <button class="project-board-preview" type="button" data-open-project="${escapeHtml(project.id)}">
          ${renderProjectPreviewImage({ preview, title })}
        </button>
        <div class="project-board-meta">
          <span>${index + 1} / ${projects.length}</span>
          <strong>${escapeHtml(title)}</strong>
          <p>${escapeHtml(getProjectDisplayPrompt(project))}</p>
        </div>
      </article>
    `;
  }).join("");
}
