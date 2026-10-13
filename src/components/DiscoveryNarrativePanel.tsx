import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  applySuggestion,
  lockedSuggestions,
  suggestionAlreadyIn,
  suggestionBlock,
  type LockedSuggestion,
} from "@/lib/discovery-suggestions";
import type {
  DiscoveryBundle,
  ProjectSpace,
  ScopeItem,
} from "@/lib/types";
import { Button, ErrorText, fieldControlClass } from "./ui";

const OVERVIEW = "__overview__";

function keyOf(categoryKey: string | null) {
  return categoryKey ?? OVERVIEW;
}

export function DiscoveryNarrativePanel({
  projectId,
  narrativeSpaces,
  scopeItems,
  bodyFor,
  disabled,
  onInsert,
  onSpaceCreated,
}: {
  projectId: string;
  narrativeSpaces: ProjectSpace[];
  scopeItems: ScopeItem[];
  bodyFor: (spaceId: string, categoryKey: string | null) => string;
  disabled: boolean;
  onInsert: (spaceId: string, categoryKey: string | null, block: string) => Promise<void>;
  onSpaceCreated: (space: ProjectSpace) => void;
}) {
  const [bundle, setBundle] = useState<DiscoveryBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [targets, setTargets] = useState<Record<string, string>>({});

  async function reload() {
    const next = await api.getDiscovery(projectId);
    setBundle(next);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await api.getDiscovery(projectId);
        if (!cancelled) setBundle(next);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load discovery.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const suggestions = bundle
    ? lockedSuggestions({
        spaces: bundle.spaces,
        answers: bundle.answers,
        questions: bundle.questions,
        systems: bundle.systems,
        scope: bundle.scope,
        scopeItems,
      })
    : [];

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the link.");
    } finally {
      setBusy(false);
    }
  }

  function targetFor(suggestion: LockedSuggestion) {
    const chosen = targets[`${suggestion.answerId}:${suggestion.systemKey}`];
    if (chosen === OVERVIEW) return null;
    if (chosen) return chosen;
    return suggestion.target.categoryKey;
  }

  if (!bundle && !error) return null;
  const rooms = bundle?.spaces.filter((space) => !space.deleted_at) ?? [];
  if (rooms.length === 0 && suggestions.length === 0) return null;

  return (
    <div className="no-print mt-5 rounded-sm border border-rule bg-paper p-4">
      <h3 className="font-serif text-2xl">Discovery</h3>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-soft">
        Locked answers show here once a discovery room is linked to a narrative space. Linking does
        not copy text. Add fills an empty note, or appends when the note already has text.
      </p>
      <div className="mt-4 space-y-3">
        {rooms.map((room) => {
          const match = narrativeSpaces.find(
            (space) => space.name.trim().toLowerCase() === room.name.trim().toLowerCase(),
          );
          return (
            <div key={room.id} className="flex flex-col gap-2 border-t border-rule pt-3 sm:flex-row sm:items-end">
              <label className="block flex-1 text-sm">
                <span className="mb-1 block font-medium">{room.name}</span>
                <select
                  className={fieldControlClass}
                  value={room.narrative_space_id ?? ""}
                  disabled={disabled || busy}
                  onChange={(event) => {
                    const value = event.target.value || null;
                    void run(async () => {
                      await api.linkDiscoveryNarrative(projectId, room.id, value);
                      await reload();
                      setNotice(value ? `Linked ${room.name}.` : `Cleared the link for ${room.name}.`);
                    });
                  }}
                >
                  <option value="">Not linked</option>
                  {narrativeSpaces.map((space) => (
                    <option key={space.id} value={space.id}>
                      {space.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                {match && room.narrative_space_id !== match.id ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={disabled || busy}
                    onClick={() =>
                      void run(async () => {
                        await api.linkDiscoveryNarrative(projectId, room.id, match.id);
                        await reload();
                        setNotice(`Linked ${room.name} to ${match.name}.`);
                      })
                    }
                  >
                    Link to {match.name}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  disabled={disabled || busy}
                  onClick={() =>
                    void run(async () => {
                      const created = await api.createNarrativeFromDiscovery(projectId, room.id);
                      onSpaceCreated(created.space);
                      await reload();
                      setNotice(
                        created.discovery.narrative_space_id === created.space.id &&
                          room.narrative_space_id === created.space.id
                          ? `${room.name} already has a narrative space.`
                          : `Created ${created.space.name} and linked ${room.name}.`,
                      );
                    })
                  }
                >
                  Create narrative space
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      {suggestions.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {suggestions.map((suggestion) => {
            const spaceId = suggestion.narrativeSpaceId;
            const categoryKey = targetFor(suggestion);
            const block = suggestionBlock(suggestion.systemName, suggestion.prompt, suggestion.body);
            const current = spaceId ? bodyFor(spaceId, categoryKey) : "";
            const already = spaceId ? suggestionAlreadyIn(current, block) : false;
            const label =
              suggestion.targets.find((target) => (target.categoryKey ?? OVERVIEW) === keyOf(categoryKey))
                ?.label ?? "Overview";
            return (
              <li key={`${suggestion.answerId}:${suggestion.systemKey}`} className="rounded-sm border border-rule bg-white p-3">
                <p className="text-sm font-medium">
                  {suggestion.discoverySpaceName} · {suggestion.systemName}
                </p>
                <p className="mt-1 text-sm leading-6 text-ink-soft">{suggestion.prompt}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{suggestion.body}</p>
                {spaceId ? (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="block flex-1 text-sm">
                      <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                        Add to
                      </span>
                      <select
                        className={fieldControlClass}
                        value={keyOf(categoryKey)}
                        disabled={disabled || busy}
                        onChange={(event) =>
                          setTargets((currentTargets) => ({
                            ...currentTargets,
                            [`${suggestion.answerId}:${suggestion.systemKey}`]: event.target.value,
                          }))
                        }
                      >
                        {suggestion.targets.map((target) => (
                          <option key={keyOf(target.categoryKey)} value={keyOf(target.categoryKey)}>
                            {target.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button
                      type="button"
                      disabled={disabled || busy || already}
                      onClick={() =>
                        void run(async () => {
                          applySuggestion(current, block);
                          await onInsert(spaceId, categoryKey, block);
                          setNotice(
                            current.trim()
                              ? `Appended to ${label}. The note already there was kept.`
                              : `Filled the empty ${label} note.`,
                          );
                        })
                      }
                    >
                      {already ? "Already in this note" : current.trim() ? "Append" : "Fill empty note"}
                    </Button>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-ink-soft">
                    Link {suggestion.discoverySpaceName} to a narrative space before adding this answer.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-soft">No locked discovery answers on in-scope systems yet.</p>
      )}
      {notice ? <p className="mt-3 text-sm text-emerald-800">{notice}</p> : null}
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
