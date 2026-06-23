import {
  clearActiveProjectId,
  createProjectRecord,
  getActiveProjectRecord,
  patchProjectRecord,
  saveProjectsToStorage,
  setActiveProjectId
} from "./store.js";

export function createProjectRuntime({
  projects = [],
  activeProjectId = "",
  persistLocal = true,
  onChange = () => {}
} = {}) {
  let items = Array.from(projects);
  let activeId = activeProjectId;

  function notify(activeProject = getActive()) {
    if (persistLocal) {
      saveProjectsToStorage(items);
      if (activeId) {
        setActiveProjectId(activeId);
      } else {
        clearActiveProjectId();
      }
    }
    onChange({ projects: items, activeProjectId: activeId, activeProject });
    return activeProject;
  }

  function list() {
    return items;
  }

  function replace(nextProjects) {
    items = Array.from(nextProjects || []);
    if (activeId && !items.some((item) => item.id === activeId)) activeId = "";
    if (!activeId && items[0]) activeId = items[0].id;
    return notify(getActive());
  }

  function getActive() {
    return getActiveProjectRecord(items, activeId);
  }

  function create(projectInput = {}) {
    const project = createProjectRecord(projectInput);
    items.unshift(project);
    activeId = project.id;
    return notify(project);
  }

  function updateActive(patch = {}, fallbackInput = { title: "Fresh Ideas" }) {
    let project = getActive();
    if (!project) {
      project = createProjectRecord(fallbackInput);
      items.unshift(project);
    }
    patchProjectRecord(project, patch);
    activeId = project.id;
    return notify(project);
  }

  function setActive(projectId) {
    const project = items.find((item) => item.id === projectId);
    if (!project) return null;
    activeId = project.id;
    return notify(project);
  }

  function remove(projectId) {
    const index = items.findIndex((item) => item.id === projectId);
    if (index < 0) return null;
    const [removed] = items.splice(index, 1);
    if (activeId === removed.id) {
      activeId = items[index]?.id || items[index - 1]?.id || "";
    }
    notify(getActive());
    return removed;
  }

  return {
    list,
    replace,
    getActive,
    create,
    updateActive,
    setActive,
    remove
  };
}
