import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/dates";
import type { Project } from "@/lib/types";
import { StatusPill } from "./StatusPill";
import { Button, EmptyState, ErrorText, PageHeader } from "./ui";

export function ProjectList() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await api.listProjects();
        if (!cancelled) setProjects(rows);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load projects.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="System of record"
        title="Projects"
        description="Statuses and design briefs for work CMPLX is actually running. Demo rows stay labeled DEMO."
        actions={<Button onClick={() => navigate("/projects/new")}>New project</Button>}
      />

      <ErrorText>{error}</ErrorText>

      {loading ? (
        <p className="font-serif text-2xl text-ink-soft">Loading_</p>
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          body="Create a project to hold status, dated notes, and a single design brief."
          action={<Button onClick={() => navigate("/projects/new")}>New project</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-sm border border-rule bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-rule bg-paper-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Window</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr
                  key={project.id}
                  className="cursor-pointer border-b border-rule last:border-0 hover:bg-paper"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/projects/${project.id}`}
                      className="font-medium text-ink hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{project.owner}</td>
                  <td className="hidden px-4 py-3 text-ink-soft sm:table-cell">
                    {formatDate(project.start_date)} – {formatDate(project.target_date)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={project.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
