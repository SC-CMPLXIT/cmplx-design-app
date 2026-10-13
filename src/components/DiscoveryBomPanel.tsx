import { useEffect, useMemo, useState } from "react";
import { TECHNOLOGY_CATEGORIES } from "@/lib/categories";
import { api } from "@/lib/api";
import { bomSuggestionName, lockedSuggestions } from "@/lib/discovery-suggestions";
import type { BomItem, DiscoveryBundle, ProjectSpace, ScopeItem } from "@/lib/types";
import { Button, ErrorText, Field, fieldControlClass } from "./ui";

type Draft = {
  name: string;
  quantity: string;
  unit: string;
  notes: string;
};

export function DiscoveryBomPanel({
  projectId,
  items,
  spaces,
  scopeItems,
  disabled,
  onCreated,
}: {
  projectId: string;
  items: BomItem[];
  spaces: ProjectSpace[];
  scopeItems: ScopeItem[];
  disabled: boolean;
  onCreated: (item: BomItem) => void;
}) {
  const [bundle, setBundle] = useState<DiscoveryBundle | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  const suggestions = useMemo(() => {
    if (!bundle) return [];
    const taken = new Set(
      items.filter((item) => item.discovery_answer_id).map((item) => item.discovery_answer_id as string),
    );
    const seen = new Set<string>();
    return lockedSuggestions({
      spaces: bundle.spaces,
      answers: bundle.answers,
      questions: bundle.questions,
      systems: bundle.systems,
      scope: bundle.scope,
      scopeItems,
    }).filter((suggestion) => {
      if (taken.has(suggestion.answerId) || seen.has(suggestion.answerId)) return false;
      seen.add(suggestion.answerId);
      return true;
    });
  }, [bundle, items, scopeItems]);

  if (!bundle || suggestions.length === 0) {
    return error ? <ErrorText>{error}</ErrorText> : null;
  }

  return (
    <div className="no-print mb-5 rounded-sm border border-rule bg-paper p-4">
      <h3 className="font-serif text-2xl">From locked discovery</h3>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-soft">
        Confirm a line to add it. Quantity and notes are yours to edit first. Nothing here sets a
        manufacturer, a model, or a price.
      </p>
      <ul className="mt-4 space-y-4">
        {suggestions.map((suggestion) => {
          const draft = drafts[suggestion.answerId] ?? {
            name: bomSuggestionName(suggestion.discoverySpaceName, suggestion.systemName),
            quantity: "1",
            unit: "ea",
            notes: "",
          };
          const narrative = spaces.find((space) => space.id === suggestion.narrativeSpaceId);
          const category =
            suggestion.target.categoryKey &&
            (scopeItems.some((item) => item.category_key === suggestion.target.categoryKey) ||
              TECHNOLOGY_CATEGORIES.some((item) => item.key === suggestion.target.categoryKey))
              ? suggestion.target.categoryKey
              : null;
          return (
            <li key={suggestion.answerId} className="rounded-sm border border-rule bg-white p-3">
              <p className="text-sm font-medium">
                {suggestion.discoverySpaceName} · {suggestion.systemName}
              </p>
              <p className="mt-1 text-sm leading-6 text-ink-soft">{suggestion.prompt}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{suggestion.body}</p>
              {!narrative ? (
                <p className="mt-2 text-sm text-ink-soft">
                  This room is not linked to a narrative space, so the line is unassigned until you
                  link one on the system narrative.
                </p>
              ) : null}
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <Field label="Name" className="md:col-span-2">
                  <input
                    className={fieldControlClass}
                    value={draft.name}
                    maxLength={200}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [suggestion.answerId]: { ...draft, name: event.target.value },
                      }))
                    }
                  />
                </Field>
                <Field label="Quantity">
                  <input
                    className={fieldControlClass}
                    value={draft.quantity}
                    inputMode="decimal"
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [suggestion.answerId]: { ...draft, quantity: event.target.value },
                      }))
                    }
                  />
                </Field>
                <Field label="Unit">
                  <input
                    className={fieldControlClass}
                    value={draft.unit}
                    maxLength={32}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [suggestion.answerId]: { ...draft, unit: event.target.value },
                      }))
                    }
                  />
                </Field>
                <Field label="Notes" className="md:col-span-4">
                  <textarea
                    className={`${fieldControlClass} min-h-16`}
                    value={draft.notes}
                    maxLength={2000}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [suggestion.answerId]: { ...draft, notes: event.target.value },
                      }))
                    }
                  />
                </Field>
              </div>
              <Button
                className="mt-3"
                type="button"
                disabled={disabled || busy || !draft.name.trim()}
                onClick={() => {
                  setBusy(true);
                  setError(null);
                  setNotice(null);
                  void (async () => {
                    try {
                      const created = await api.createBomFromDiscovery(projectId, {
                        answer_id: suggestion.answerId,
                        name: draft.name,
                        description: suggestion.body,
                        quantity: Number(draft.quantity),
                        unit: draft.unit || "ea",
                        notes: draft.notes,
                        space_id: narrative?.id ?? null,
                        category_key: category,
                      });
                      onCreated(created);
                      setNotice(`Added ${created.name}.`);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Could not add the line.");
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
              >
                Add to bill of materials
              </Button>
            </li>
          );
        })}
      </ul>
      {notice ? <p className="mt-3 text-sm text-emerald-800">{notice}</p> : null}
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
