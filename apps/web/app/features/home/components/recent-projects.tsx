import type { ProjectSummaryDto } from "@ai-studio/contracts";

interface RecentProjectsProps {
  projects: ProjectSummaryDto[];
  signedIn: boolean;
  loading: boolean;
  onCreate: () => void;
  onOpen: (projectId: string) => void;
  onRequireAuth: () => void;
}

export function RecentProjects({
  projects,
  signedIn,
  loading,
  onCreate,
  onOpen,
  onRequireAuth
}: RecentProjectsProps) {
  return (
    <section className="home-section" id="projects" aria-labelledby="recent-projects-title">
      <div className="section-heading">
        <h2 id="recent-projects-title">最近项目</h2>
        <span className="section-link">查看全部 ›</span>
      </div>
      <div className="project-row">
        <button
          className="project-card project-card--new"
          type="button"
          onClick={signedIn ? onCreate : onRequireAuth}
        >
          <span className="project-card__plus">+</span>
          <strong>新建项目</strong>
        </button>
        {loading ? <div className="project-skeleton" aria-label="正在加载项目" /> : null}
        {projects.map((project) => (
          <button
            className="project-card"
            type="button"
            key={project.id}
            onClick={() => onOpen(project.id)}
          >
            <span className="project-card__cover">
              {project.thumbnailUrl ? (
                <img src={project.thumbnailUrl} alt="" />
              ) : (
                <span className="project-card__empty">D</span>
              )}
            </span>
            <strong>{project.title}</strong>
            <time dateTime={project.updatedAt}>{formatProjectTime(project.updatedAt)}</time>
          </button>
        ))}
      </div>
    </section>
  );
}

function formatProjectTime(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}
