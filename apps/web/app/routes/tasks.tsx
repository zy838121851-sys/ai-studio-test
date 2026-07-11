import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ExternalLink, RefreshCw, X } from "lucide-react";
import type { AiJobDto } from "@ai-studio/contracts";
import { Link } from "react-router";

import { listAiJobs } from "../lib/api-client.js";
import "../styles/tasks.css";

const statuses = ["", "queued", "running", "succeeded", "failed", "cancelled"];

export default function TasksRoute() {
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [selectedJob, setSelectedJob] = useState<AiJobDto | null>(null);
  const query = useQuery({
    queryKey: ["ai-jobs", "list", status, offset],
    queryFn: () => listAiJobs({ ...(status ? { status } : {}), offset }),
    refetchInterval: (state) =>
      state.state.data?.jobs.some((job) => job.status === "queued" || job.status === "running")
        ? 8_000
        : false
  });
  const data = query.data;
  return (
    <main className="task-log-page">
      <header>
        <Link to="/" aria-label="AI Studio">
          D
        </Link>
        <h1>Task Log</h1>
        <button type="button" onClick={() => void query.refetch()} aria-label="Refresh tasks">
          <RefreshCw size={18} />
        </button>
      </header>
      <section className="task-log-toolbar">
        <label>
          Status{" "}
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setOffset(0);
            }}
          >
            {statuses.map((value) => (
              <option key={value} value={value}>
                {value || "All"}
              </option>
            ))}
          </select>
        </label>
      </section>
      {query.isLoading ? (
        <p className="task-log-state">Loading tasks</p>
      ) : query.error ? (
        <p className="task-log-state" role="alert">
          Unable to load tasks
        </p>
      ) : (
        <section className="task-log-list" aria-label="Task list">
          {data?.jobs.length ? (
            data.jobs.map((job) => (
              <button
                type="button"
                key={job.id}
                className={`task-log-item is-${job.status}`}
                onClick={() => setSelectedJob(job)}
              >
                <div>
                  <strong>{job.modelId}</strong>
                  <span>{job.prompt}</span>
                  <small>{new Date(job.createdAt).toLocaleString()}</small>
                </div>
                <div className="task-log-item__status">
                  <span>{job.status}</span>
                  <b>{job.chargedCredits || job.reservedCredits} credits</b>
                  {job.output ? <ExternalLink size={17} /> : null}
                </div>
              </button>
            ))
          ) : (
            <p className="task-log-state">No tasks yet</p>
          )}
        </section>
      )}
      <footer>
        <span>
          {data
            ? `${data.offset + 1}-${Math.min(data.offset + data.jobs.length, data.total)} / ${data.total}`
            : ""}
        </span>
        <button
          type="button"
          disabled={!offset}
          onClick={() => setOffset(Math.max(0, offset - 20))}
        >
          <ChevronLeft size={18} />
        </button>
        <button type="button" disabled={!data?.hasMore} onClick={() => setOffset(offset + 20)}>
          <ChevronRight size={18} />
        </button>
      </footer>
      {selectedJob ? (
        <div className="task-log-modal" role="dialog" aria-modal="true" aria-label="Task detail">
          <section>
            <button type="button" aria-label="Close" onClick={() => setSelectedJob(null)}>
              <X size={18} />
            </button>
            <h2>{selectedJob.modelId}</h2>
            <p>{selectedJob.prompt}</p>
            <dl>
              <dt>Status</dt>
              <dd>{selectedJob.status}</dd>
              <dt>Task ID</dt>
              <dd>{selectedJob.id}</dd>
              <dt>Credits</dt>
              <dd>{selectedJob.chargedCredits || selectedJob.reservedCredits}</dd>
            </dl>
            {selectedJob.error ? <p role="alert">{selectedJob.error.message}</p> : null}
            {selectedJob.output ? (
              <a href={selectedJob.output.url} target="_blank" rel="noreferrer">
                Open result
              </a>
            ) : null}
          </section>
        </div>
      ) : null}
    </main>
  );
}
