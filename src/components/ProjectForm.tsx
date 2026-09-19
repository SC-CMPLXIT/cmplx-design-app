import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { emptyToNull } from "@/lib/dates";
import { PROJECT_STATUS_META } from "@/lib/status";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { Button, ErrorText, Field, PageHeader, fieldControlClass } from "./ui";

export function ProjectForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [owner, setOwner] = useState(user?.displayName ?? "");
  const [status, setStatus] = useState<ProjectStatus>("pending");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const project = await api.createProject({
        name,
        owner,
        status,
        start_date: emptyToNull(startDate),
        target_date: emptyToNull(targetDate),
      });
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        eyebrow="Projects"
        title="New project"
        description="Every project needs a named owner and a current status. A design brief can be added next."
      />

      <form className="space-y-4 rounded-sm border border-rule bg-white p-5" onSubmit={onSubmit}>
        <Field label="Name">
          <input
            className={fieldControlClass}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="DEMO — Property or scope name"
          />
        </Field>
        <Field label="Owner">
          <input
            className={fieldControlClass}
            required
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
          />
        </Field>
        <Field label="Status">
          <select
            className={fieldControlClass}
            value={status}
            onChange={(event) => setStatus(event.target.value as ProjectStatus)}
          >
            {PROJECT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {PROJECT_STATUS_META[value].label}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start date">
            <input
              className={fieldControlClass}
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </Field>
          <Field label="Target date">
            <input
              className={fieldControlClass}
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
            />
          </Field>
        </div>
        <ErrorText>{error}</ErrorText>
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>
            Create project
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate("/projects")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
