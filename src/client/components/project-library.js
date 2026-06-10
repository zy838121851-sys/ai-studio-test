function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function showProjectSaveStatus(element, {
  text = "已保存到云端",
  duration = 1600
} = {}) {
  if (!element) return;
  element.textContent = text;
  element.classList.add("show");
  window.clearTimeout(element._saveTimer);
  element._saveTimer = window.setTimeout(() => {
    element.classList.remove("show");
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
  formatProjectDate
} = {}) {
  if (!projects.length) {
    return `
      <button class="project-empty" type="button" data-new-project>
        <span>+</span>
        <strong>创建第一个项目</strong>
        <small>从一句描述开始生成图片</small>
      </button>
    `;
  }

  const activeIndex = Math.max(0, projects.findIndex((project) => project.id === activeProjectId));
  const viewSwitch = renderLibraryViewSwitch(mode, projects.length);
  if (mode === "grid") {
    return `
      <section class="project-card-board" aria-label="项目卡片">
        <button class="library-new-card" type="button" data-new-project>
          <span>+</span>
          <strong>新建项目</strong>
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
    <aside class="project-timeline" aria-label="历史时间轴">
      <small>Timeline</small>
      <div>${renderTimeline({ projects, activeIndex, formatProjectDate })}</div>
    </aside>
    <section class="project-stack" aria-label="历史画板">
      <button class="stack-nav stack-nav-up" type="button" data-library-step="-1" aria-label="上一张"></button>
      ${renderProjectStack({
        projects,
        activeIndex,
        getProjectPreview,
        getProjectDisplayTitle,
        getProjectDisplayPrompt
      })}
      <button class="stack-nav stack-nav-down" type="button" data-library-step="1" aria-label="下一张"></button>
    </section>
    <aside class="project-count">
      <strong>${projects.length}</strong>
      <span>boards</span>
    </aside>
    ${viewSwitch}
  `;
}

export function renderHomeHistoryContent({ projects = [], getProjectPreview } = {}) {
  const previewProjects = projects.length ? projects.slice(0, 3) : [];
  const source = previewProjects.length
    ? previewProjects
    : [{ title: "Fresh Ideas" }, { title: "Fresh Ideas" }, { title: "Fresh Ideas" }];
  const cards = source.map((project, index) => {
    const preview = project.id ? getProjectPreview(project, index) : "";
    return `
      <i style="--home-stack-index:${index}">
        ${preview ? `<img src="${escapeHtml(preview)}" alt="" />` : `<b>D</b>`}
      </i>
    `;
  }).join("");

  return `
    <button class="home-history-trigger" type="button" data-nav-view="library" aria-label="展开项目库">
      <span class="home-history-stack" aria-hidden="true">${cards}</span>
      <span class="home-history-open" aria-hidden="true"></span>
    </button>
  `;
}

function renderLibraryViewSwitch(mode, count) {
  return `
    <div class="library-bottom-tools" aria-label="项目库视图切换">
      <div class="library-view-switch">
        <button class="${mode === "stack" ? "active" : ""}" type="button" data-library-mode="stack"><i></i>堆叠</button>
        <button class="${mode === "grid" ? "active" : ""}" type="button" data-library-mode="grid">卡片</button>
      </div>
      <div class="library-count-pill">☆ ${count}</div>
    </div>
  `;
}

function renderSmallProjectCard({ project, index, getProjectPreview, getProjectDisplayTitle, formatProjectDate }) {
  const preview = getProjectPreview(project, index);
  const title = getProjectDisplayTitle(project, index);
  return `
    <article class="library-small-card" data-project-id="${escapeHtml(project.id)}">
      <button type="button" data-open-project="${escapeHtml(project.id)}">
        <div>
          ${preview ? `<img src="${escapeHtml(preview)}" alt="${escapeHtml(title)}" />` : `<span>D</span>`}
        </div>
        <strong>${escapeHtml(title)}</strong>
        <small>更新于 ${formatProjectDate(project.updatedAt)}</small>
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
          ${preview ? `<img src="${escapeHtml(preview)}" alt="${escapeHtml(title)}" />` : `<span>D</span>`}
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
