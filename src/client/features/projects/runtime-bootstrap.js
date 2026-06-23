export function createProjectRuntimeBootstrap({
  loadProjectsFromStorage,
  getActiveProjectId,
  setActiveProjectId,
  createProjectRuntime,
  onChange,
  useStorage = true,
  persistLocal = true
} = {}) {
  let projects = useStorage ? loadProjectsFromStorage?.() || [] : [];
  let activeProjectId = useStorage ? getActiveProjectId?.() || "" : "";

  if (useStorage && !activeProjectId && projects[0]) {
    activeProjectId = projects[0].id;
    setActiveProjectId?.(activeProjectId);
  }

  const projectRuntime = createProjectRuntime?.({
    projects,
    activeProjectId,
    persistLocal,
    onChange(payload = {}) {
      projects = payload.projects || projects;
      activeProjectId = payload.activeProjectId || activeProjectId;
      onChange?.({
        ...payload,
        projects,
        activeProjectId
      });
    }
  });

  return {
    get projects() {
      return projects;
    },
    set projects(value) {
      projects = value;
    },
    get activeProjectId() {
      return activeProjectId;
    },
    set activeProjectId(value) {
      activeProjectId = value;
    },
    projectRuntime
  };
}
