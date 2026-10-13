import { exportAnswerText } from "@/lib/systems";
import {
  answeredGuideSections,
  openGuideQuestions,
  summaryRows,
  type SpaceGuideModel,
} from "@/lib/space-guide";

export function waitForSpaceGuideImages(): Promise<void> {
  const images = [...document.querySelectorAll<HTMLImageElement>(".space-guide-print img")];
  const pending = images.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const done = () => resolve();
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });
  });
  return Promise.race([
    Promise.all(pending).then(() => undefined),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, 4000);
    }),
  ]);
}

function OpenQuestionList({ space }: { space: SpaceGuideModel["spaces"][number] }) {
  const open = openGuideQuestions(space);
  if (open.length === 0) return null;
  return (
    <div>
      <h3>Open questions</h3>
      <ul className="guide-open">
        {open.map((question) => (
          <li key={question.key}>
            {question.sectionName}: {question.prompt}
          </li>
        ))}
      </ul>
    </div>
  );
}

function GuideFigure({ url, name, label }: { url: string; name: string; label: string }) {
  return (
    <figure className="guide-figure">
      <img
        src={url}
        alt={label}
        referrerPolicy="no-referrer"
        decoding="sync"
        loading="eager"
        onError={(event) => {
          event.currentTarget.dataset.broken = "true";
        }}
      />
      <figcaption className="guide-caption">{name}</figcaption>
      <p className="guide-fallback">No rendering on file.</p>
    </figure>
  );
}

export function SpaceGuidePrint({ model }: { model: SpaceGuideModel }) {
  let group = "";
  return (
    <article className="space-guide-print print-only">
      <header className="guide-cover">
        <p className="guide-brand">
          <strong>CMPLX iT</strong>
          <span> | {model.projectName} | AV/IT Space Discovery Guide | </span>
          <strong className="guide-draft">DRAFT FOR DISCUSSION</strong>
        </p>
        <h1>{model.projectName}: AV/IT Space-by-Space Discovery Guide</h1>
        <p className="guide-sub">
          Owner {model.owner} · {model.statusLabel} · Printed {model.printedOn} · Draft for
          discussion
        </p>
      </header>

      <h2>Project summary</h2>
      <table className="guide-kv">
        <tbody>
          {summaryRows(model).map(([label, value]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {model.spaces.length === 0 ? <p className="guide-empty">No rooms yet.</p> : null}

      {model.spaces.map((space) => {
        const showGroup = space.groupLabel !== group;
        group = space.groupLabel;
        return (
          <section key={space.id} className="guide-space">
            {showGroup ? <p className="guide-group">{space.groupLabel}</p> : null}
            <h2>{space.name}</h2>
            <div className={space.image ? "guide-hero" : "guide-copy"}>
              <div>
                <p>
                  <strong>Plan shows: </strong>
                  {space.planShows}
                </p>
                <p>
                  <strong>Intended use: </strong>
                  {space.intendedUse}
                </p>
                <p>
                  <strong>Occupancy: </strong>
                  {space.occupancy}
                </p>
                {space.notes ? (
                  <p>
                    <strong>Notes: </strong>
                    {space.notes}
                  </p>
                ) : null}
                {space.image ? null : <p className="guide-missing">No rendering on file.</p>}
              </div>
              {space.image ? (
                <GuideFigure url={space.image.url} name={space.image.fileName} label={space.name} />
              ) : null}
            </div>
            {space.sections.length === 0 ? (
              <p>No space systems are in scope, so this room has no checklist.</p>
            ) : (
              <>
                {answeredGuideSections(space).map((section) => (
                  <div key={section.key}>
                    <h3>{section.name}</h3>
                    {section.questions.map((question) => {
                      const empty = question.body.trim().length === 0;
                      return (
                        <article key={question.key} className="guide-qa">
                          <p className="guide-prompt">{question.prompt}</p>
                          <p className={`guide-status guide-status-${question.status}`}>
                            {question.statusLabel}
                          </p>
                          <p className={empty ? "guide-answer guide-empty" : "guide-answer"}>
                            {exportAnswerText(question.body)}
                          </p>
                        </article>
                      );
                    })}
                  </div>
                ))}
                <OpenQuestionList space={space} />
              </>
            )}
          </section>
        );
      })}

      <section className="guide-discrepancies">
        <h2>Discrepancies</h2>
        {model.gaps.length === 0 ? <p className="guide-empty">None recorded.</p> : null}
        {model.gaps.map((gap, index) => (
          <article key={gap.id} className="guide-gap">
            <p className={gap.severity === "high" && gap.status === "open" ? "guide-gap-hot" : ""}>
              <strong>
                {index + 1}. {gap.severityLabel} · {gap.statusLabel}
              </strong>
              <span> {gap.spaceName ?? "Project"}</span>
            </p>
            <p>
              <strong>Plan shows: </strong>
              {gap.planShows || "—"}
            </p>
            <p>
              <strong>Notes say: </strong>
              {gap.notesSay || "—"}
            </p>
            {gap.resolutionNote ? (
              <p>
                <strong>Resolution: </strong>
                {gap.resolutionNote}
              </p>
            ) : null}
          </article>
        ))}
      </section>
    </article>
  );
}
