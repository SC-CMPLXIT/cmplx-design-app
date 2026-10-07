import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BOM_LIMITS, BOM_UNITS, formatQuantity } from "@/lib/bom";
import { TECHNOLOGY_CATEGORIES } from "@/lib/categories";
import { api } from "@/lib/api";
import type { BomItem, BomItemDraft, ProjectSpace, ScopeItem } from "@/lib/types";
import { Button, EmptyState, ErrorText, Field, fieldControlClass } from "./ui";

type BomForm = {
  name: string;
  description: string;
  quantity: string;
  unit: string;
  manufacturer: string;
  model: string;
  sku: string;
  space_id: string;
  category_key: string;
  notes: string;
};

type CategoryChoice = {
  key: string;
  name: string;
};

type BomView = {
  id: string;
  name: string;
  description: string;
  quantityLabel: string;
  identity: string;
  spaceName: string;
  categoryName: string;
  notes: string;
};

function formFrom(item: BomItem): BomForm {
  return {
    name: item.name,
    description: item.description,
    quantity: formatQuantity(item.quantity),
    unit: item.unit || "ea",
    manufacturer: item.manufacturer,
    model: item.model,
    sku: item.sku,
    space_id: item.space_id ?? "",
    category_key: item.category_key ?? "",
    notes: item.notes,
  };
}

function orderSpaces(rows: ProjectSpace[]) {
  return [...rows].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
  );
}

function categoryLabel(key: string, scopeItems: ScopeItem[]) {
  return (
    scopeItems.find((item) => item.category_key === key)?.category_name ??
    TECHNOLOGY_CATEGORIES.find((item) => item.key === key)?.name ??
    key
  );
}

function categoryChoices(scopeItems: ScopeItem[], extraKeys: string[]): CategoryChoice[] {
  if (scopeItems.length === 0) {
    return TECHNOLOGY_CATEGORIES.map((category) => ({
      key: category.key,
      name: category.name,
    }));
  }
  const inScope = scopeItems
    .filter((item) => item.in_scope)
    .sort((a, b) => a.sort_order - b.sort_order);
  const seen = new Set(inScope.map((item) => item.category_key));
  const extras = [...new Set(extraKeys.filter((key) => key && !seen.has(key)))].sort((a, b) =>
    categoryLabel(a, scopeItems).localeCompare(categoryLabel(b, scopeItems)),
  );
  return [
    ...inScope.map((item) => ({ key: item.category_key, name: item.category_name })),
    ...extras.map((key) => ({
      key,
      name: `${categoryLabel(key, scopeItems)} (not in scope)`,
    })),
  ];
}

function draftFrom(form: BomForm): BomItemDraft {
  return {
    name: form.name,
    description: form.description,
    quantity: Number(form.quantity),
    unit: form.unit,
    manufacturer: form.manufacturer,
    model: form.model,
    sku: form.sku,
    space_id: form.space_id || null,
    category_key: form.category_key || null,
    notes: form.notes,
  };
}

function viewFrom(
  item: BomItem,
  form: BomForm | undefined,
  spaces: ProjectSpace[],
  scopeItems: ScopeItem[],
): BomView {
  const source = form ?? formFrom(item);
  const space = spaces.find((row) => row.id === source.space_id);
  const identity = [source.manufacturer, source.model, source.sku].filter(Boolean).join(" · ");
  return {
    id: item.id,
    name: source.name.trim() || "Untitled line",
    description: source.description.trim(),
    quantityLabel: `${source.quantity.trim() || "—"} ${source.unit.trim() || "ea"}`.trim(),
    identity,
    spaceName: source.space_id ? (space?.name ?? "Removed space") : "Unassigned",
    categoryName: source.category_key
      ? categoryLabel(source.category_key, scopeItems)
      : "Uncategorized",
    notes: source.notes.trim(),
  };
}

function BomTable({ rows }: { rows: BomView[] }) {
  if (rows.length === 0) {
    return <p className="mt-4 text-sm text-ink-soft">No equipment lines.</p>;
  }
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="bom-table w-full border-collapse text-left text-sm">
        <thead className="border-b border-rule font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
          <tr>
            <th className="py-2 pr-3 font-medium">Qty</th>
            <th className="py-2 pr-3 font-medium">Item</th>
            <th className="py-2 pr-3 font-medium">Space</th>
            <th className="py-2 pr-3 font-medium">Category</th>
            <th className="py-2 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-rule align-top last:border-0">
              <td className="whitespace-nowrap py-2 pr-3">{row.quantityLabel}</td>
              <td className="py-2 pr-3">
                <div className="font-medium">{row.name}</div>
                {row.description ? (
                  <div className="mt-0.5 text-ink-soft">{row.description}</div>
                ) : null}
                {row.identity ? (
                  <div className="mt-0.5 break-words font-mono text-[11px] text-ink-soft">
                    {row.identity}
                  </div>
                ) : null}
              </td>
              <td className="py-2 pr-3">{row.spaceName}</td>
              <td className="py-2 pr-3">{row.categoryName}</td>
              <td className="py-2 whitespace-pre-wrap">{row.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BillOfMaterials({
  projectId,
  scopeItems,
  mode,
}: {
  projectId: string;
  scopeItems: ScopeItem[];
  mode: "edit" | "read";
}) {
  const [items, setItems] = useState<BomItem[]>([]);
  const [forms, setForms] = useState<Record<string, BomForm>>({});
  const [spaces, setSpaces] = useState<ProjectSpace[]>([]);
  const [newName, setNewName] = useState("");
  const [spaceFilter, setSpaceFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const actionLock = useRef(false);
  const loadGeneration = useRef(0);

  useEffect(() => {
    const generation = ++loadGeneration.current;
    let cancelled = false;
    setLoading(true);
    setLoaded(false);
    setError(null);
    void (async () => {
      try {
        const [lines, bundle] = await Promise.all([
          api.listBomItems(projectId),
          api.getSpaceBundle(projectId),
        ]);
        if (cancelled || generation !== loadGeneration.current) return;
        const ordered = [...lines].sort(
          (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
        );
        setItems(ordered);
        setForms(Object.fromEntries(ordered.map((item) => [item.id, formFrom(item)])));
        setSpaces(orderSpaces(bundle.spaces));
        setLoaded(true);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load bill of materials.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (loading || mode !== "edit") return;
    if (window.location.hash !== "#bill-of-materials") return;
    document.getElementById("bill-of-materials")?.scrollIntoView({ block: "start" });
  }, [loading, mode]);

  const ordered = useMemo(
    () =>
      [...items].sort(
        (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
      ),
    [items],
  );

  const extraCategoryKeys = ordered.flatMap((item) => {
    const key = forms[item.id]?.category_key || item.category_key || "";
    return key ? [key] : [];
  });
  const categories = categoryChoices(scopeItems, extraCategoryKeys);
  const filtering = spaceFilter !== "all" || categoryFilter !== "all";

  const visible = ordered.filter((item) => {
    const form = forms[item.id] ?? formFrom(item);
    if (spaceFilter === "none" && form.space_id) return false;
    if (spaceFilter !== "all" && spaceFilter !== "none" && form.space_id !== spaceFilter) {
      return false;
    }
    if (categoryFilter === "none" && form.category_key) return false;
    if (
      categoryFilter !== "all" &&
      categoryFilter !== "none" &&
      form.category_key !== categoryFilter
    ) {
      return false;
    }
    return true;
  });

  const views = ordered.map((item) => viewFrom(item, forms[item.id], spaces, scopeItems));

  function patchForm(id: string, patch: Partial<BomForm>) {
    setForms((current) => {
      const existing = current[id];
      if (!existing) return current;
      return { ...current, [id]: { ...existing, ...patch } };
    });
  }

  async function run(action: () => Promise<void>) {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update bill of materials.");
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }

  function onAdd(event: FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    void run(async () => {
      const created = await api.createBomItem(projectId, name);
      setItems((current) =>
        [...current, created].sort(
          (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
        ),
      );
      setForms((current) => ({ ...current, [created.id]: formFrom(created) }));
      setNewName("");
      setSpaceFilter("all");
      setCategoryFilter("all");
      setNotice(`Added ${created.name}.`);
      requestAnimationFrame(() => {
        document.getElementById(`bom-name-${created.id}`)?.focus();
      });
    });
  }

  function onMove(id: string, direction: -1 | 1) {
    if (filtering) return;
    const index = ordered.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    const reordered = next.map((item, position) => ({ ...item, sort_order: position + 1 }));
    void run(async () => {
      setItems(reordered);
      try {
        await api.reorderBomItems(
          projectId,
          reordered.map((item) => item.id),
        );
      } catch (err) {
        setItems(ordered);
        throw err;
      }
    });
  }

  function onRemove(item: BomItem) {
    const label = forms[item.id]?.name.trim() || item.name;
    if (!window.confirm(`Remove “${label}”? It leaves this project’s bill of materials.`)) return;
    void run(async () => {
      await api.archiveBomItem(item.id);
      setItems((current) => current.filter((row) => row.id !== item.id));
      setForms((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      setNotice(`Removed ${label}.`);
    });
  }

  function onSave(event: FormEvent) {
    event.preventDefault();
    const missing = ordered.find((item) => !(forms[item.id]?.name ?? item.name).trim());
    if (missing) {
      setError("Each equipment line needs a name.");
      setNotice(null);
      document.getElementById(`bom-${missing.id}`)?.scrollIntoView({ block: "nearest" });
      return;
    }
    void run(async () => {
      const saved = await api.saveBomItems(
        projectId,
        ordered.map((item) => ({
          id: item.id,
          draft: draftFrom(forms[item.id] ?? formFrom(item)),
        })),
      );
      setItems(saved);
      setForms(Object.fromEntries(saved.map((item) => [item.id, formFrom(item)])));
      setNotice("Bill of materials saved.");
    });
  }

  async function refreshSpaces() {
    try {
      const bundle = await api.getSpaceBundle(projectId);
      setSpaces(orderSpaces(bundle.spaces));
    } catch {
      // Keep the space list from the last successful load.
    }
  }

  const lineCount =
    filtering
      ? `${visible.length} of ${ordered.length} lines`
      : `${ordered.length} ${ordered.length === 1 ? "line" : "lines"}`;

  return (
    <section
      id="bill-of-materials"
      aria-labelledby="bill-of-materials-heading"
      className="scroll-mt-8 rounded-sm border border-rule bg-white p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="bill-of-materials-heading" className="font-serif text-3xl">
            Bill of materials
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
            {mode === "edit"
              ? "Equipment for this project. Add a line to store the name. Save stores quantity, manufacturer, space, category, and notes. Category follows systems in scope on the brief, or the full standard-15 list until a brief exists. Removing a space keeps the line and clears that space. No pricing."
              : "Prints with this brief. Edit lines on the project page."}
          </p>
        </div>
        {mode === "read" ? (
          <Link
            to={`/projects/${projectId}#bill-of-materials`}
            className="no-print text-sm underline underline-offset-2"
          >
            Edit bill of materials
          </Link>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-6 font-serif text-2xl text-ink-soft">Loading bill of materials_</p>
      ) : null}

      {!loading && !loaded && error ? (
        <div className="mt-4">
          <ErrorText>{error}</ErrorText>
        </div>
      ) : null}

      {!loading && loaded && ordered.length === 0 && mode === "edit" ? (
        <div className="no-print mt-6">
          <EmptyState
            title="No equipment lines yet"
            body="Add the first line — a reader, a length of cable, a panel. Space and category can wait."
          />
        </div>
      ) : null}

      {!loading && loaded && mode === "read" ? <BomTable rows={views} /> : null}

      {!loading && loaded && mode === "edit" ? (
        <div className="print-only">
          <BomTable rows={views} />
        </div>
      ) : null}

      {mode === "edit" && !loading && loaded ? (
        <div className="no-print">
          <form className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={onAdd}>
            <Field label="New line" className="flex-1">
              <input
                className={fieldControlClass}
                value={newName}
                maxLength={BOM_LIMITS.name}
                autoComplete="off"
                placeholder="Ceiling access point, door reader, cable"
                onChange={(event) => setNewName(event.target.value)}
              />
            </Field>
            <Button type="submit" disabled={busy || !newName.trim()}>
              Add line
            </Button>
          </form>

          {ordered.length > 0 ? (
            <form onSubmit={onSave}>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
                <Field label="Space" className="sm:w-56">
                  <select
                    className={fieldControlClass}
                    value={spaceFilter}
                    onChange={(event) => setSpaceFilter(event.target.value)}
                  >
                    <option value="all">All spaces</option>
                    <option value="none">Unassigned</option>
                    {spaces.map((space) => (
                      <option key={space.id} value={space.id}>
                        {space.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Category" className="sm:min-w-64 sm:flex-1">
                  <select
                    className={fieldControlClass}
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                  >
                    <option value="all">All categories</option>
                    <option value="none">Uncategorized</option>
                    {categories.map((category) => (
                      <option key={category.key} value={category.key}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <p className="pb-2 text-sm text-ink-soft">{lineCount}</p>
              </div>
              {filtering ? (
                <p className="mt-2 text-sm text-ink-soft">
                  Clear the space and category filters to reorder.
                </p>
              ) : null}

              {visible.length === 0 ? (
                <p className="mt-4 text-sm text-ink-soft">No lines match this filter.</p>
              ) : null}

              <div className="mt-4 space-y-4">
                {visible.map((item) => {
                  const form = forms[item.id] ?? formFrom(item);
                  const index = ordered.findIndex((row) => row.id === item.id);
                  const orphanSpace =
                    form.space_id && !spaces.some((space) => space.id === form.space_id);
                  return (
                    <article
                      key={item.id}
                      id={`bom-${item.id}`}
                      className="rounded-sm border border-rule p-4"
                    >
                      <div className="mb-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={busy || filtering || index <= 0}
                          aria-label={`Move ${form.name || "line"} up`}
                          onClick={() => onMove(item.id, -1)}
                        >
                          Up
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={busy || filtering || index < 0 || index >= ordered.length - 1}
                          aria-label={`Move ${form.name || "line"} down`}
                          onClick={() => onMove(item.id, 1)}
                        >
                          Down
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          disabled={busy}
                          onClick={() => onRemove(item)}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-12">
                        <Field label="Name" className="md:col-span-8">
                          <input
                            id={`bom-name-${item.id}`}
                            className={fieldControlClass}
                            value={form.name}
                            maxLength={BOM_LIMITS.name}
                            autoComplete="off"
                            required
                            onChange={(event) => patchForm(item.id, { name: event.target.value })}
                          />
                        </Field>
                        <Field label="Qty" className="md:col-span-2">
                          <input
                            className={fieldControlClass}
                            inputMode="decimal"
                            value={form.quantity}
                            onChange={(event) =>
                              patchForm(item.id, { quantity: event.target.value })
                            }
                          />
                        </Field>
                        <Field label="Unit" className="md:col-span-2">
                          <input
                            className={fieldControlClass}
                            value={form.unit}
                            maxLength={BOM_LIMITS.unit}
                            list="bom-units"
                            autoComplete="off"
                            onChange={(event) => patchForm(item.id, { unit: event.target.value })}
                          />
                        </Field>
                        <Field label="Manufacturer" className="md:col-span-4">
                          <input
                            className={fieldControlClass}
                            value={form.manufacturer}
                            maxLength={BOM_LIMITS.manufacturer}
                            autoComplete="off"
                            onChange={(event) =>
                              patchForm(item.id, { manufacturer: event.target.value })
                            }
                          />
                        </Field>
                        <Field label="Model" className="md:col-span-4">
                          <input
                            className={fieldControlClass}
                            value={form.model}
                            maxLength={BOM_LIMITS.model}
                            autoComplete="off"
                            onChange={(event) => patchForm(item.id, { model: event.target.value })}
                          />
                        </Field>
                        <Field label="SKU" className="md:col-span-4">
                          <input
                            className={fieldControlClass}
                            value={form.sku}
                            maxLength={BOM_LIMITS.sku}
                            autoComplete="off"
                            onChange={(event) => patchForm(item.id, { sku: event.target.value })}
                          />
                        </Field>
                        <Field label="Space" className="md:col-span-6">
                          <select
                            className={fieldControlClass}
                            value={form.space_id}
                            onFocus={() => void refreshSpaces()}
                            onChange={(event) =>
                              patchForm(item.id, { space_id: event.target.value })
                            }
                          >
                            <option value="">Unassigned</option>
                            {spaces.map((space) => (
                              <option key={space.id} value={space.id}>
                                {space.name}
                              </option>
                            ))}
                            {orphanSpace ? (
                              <option value={form.space_id}>Removed space</option>
                            ) : null}
                          </select>
                        </Field>
                        <Field label="Category" className="md:col-span-6">
                          <select
                            className={fieldControlClass}
                            value={form.category_key}
                            onChange={(event) =>
                              patchForm(item.id, { category_key: event.target.value })
                            }
                          >
                            <option value="">Uncategorized</option>
                            {categories.map((category) => (
                              <option key={category.key} value={category.key}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Description" className="md:col-span-12">
                          <input
                            className={fieldControlClass}
                            value={form.description}
                            maxLength={BOM_LIMITS.description}
                            autoComplete="off"
                            onChange={(event) =>
                              patchForm(item.id, { description: event.target.value })
                            }
                          />
                        </Field>
                        <Field label="Notes" className="md:col-span-12">
                          <textarea
                            className={`${fieldControlClass} min-h-20`}
                            value={form.notes}
                            maxLength={BOM_LIMITS.notes}
                            onChange={(event) => patchForm(item.id, { notes: event.target.value })}
                          />
                        </Field>
                      </div>
                    </article>
                  );
                })}
              </div>

              <datalist id="bom-units">
                {BOM_UNITS.map((unit) => (
                  <option key={unit} value={unit} />
                ))}
              </datalist>

              {ordered.length > 0 ? (
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={busy}>
                    Save bill of materials
                  </Button>
                  {notice ? <p className="text-sm text-emerald-800">{notice}</p> : null}
                  <ErrorText>{error}</ErrorText>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {notice ? <p className="text-sm text-emerald-800">{notice}</p> : null}
                  <ErrorText>{error}</ErrorText>
                </div>
              )}
            </form>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {notice ? <p className="text-sm text-emerald-800">{notice}</p> : null}
              <ErrorText>{error}</ErrorText>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
