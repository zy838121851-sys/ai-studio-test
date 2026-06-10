const projects = new Map();

export function listProjects() {
  return Array.from(projects.values());
}

export function saveProject(project) {
  if (!project?.id) throw new Error("Missing project id");
  const next = { ...project, updatedAt: Date.now() };
  projects.set(project.id, next);
  return next;
}

export function getProject(id) {
  return projects.get(id) || null;
}
