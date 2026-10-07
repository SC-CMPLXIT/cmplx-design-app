import { prepareBomDraft, prepareBomName } from "./bom";
import { TECHNOLOGY_CATEGORIES } from "./categories";
import { demoApi } from "./demo-store";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import type {
  BomItem,
  BomItemUpdate,
  BriefDraft,
  DesignBrief,
  NarrativeDraft,
  Project,
  ProjectDraft,
  ProjectSpace,
  ScopeItem,
  SpaceBundle,
  SpaceDraft,
  SpaceSystemNarrative,
  StatusUpdate,
} from "./types";

function requireMessage(error: { message: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

async function fetchBrief(briefId: string): Promise<DesignBrief> {
  const supabase = getSupabase();
  const { data: brief, error } = await supabase
    .from("design_briefs")
    .select("*")
    .eq("id", briefId)
    .is("deleted_at", null)
    .single();
  requireMessage(error, "Could not load design brief.");

  const { data: items, error: itemsError } = await supabase
    .from("brief_scope_items")
    .select("*")
    .eq("brief_id", briefId)
    .order("sort_order", { ascending: true });
  requireMessage(itemsError, "Could not load brief checklist.");

  return { ...(brief as Omit<DesignBrief, "scope_items">), scope_items: items ?? [] };
}

async function ensureScopeItems(brief: DesignBrief): Promise<DesignBrief> {
  if (brief.scope_items.length >= TECHNOLOGY_CATEGORIES.length) return brief;

  const supabase = getSupabase();
  const existing = new Set(brief.scope_items.map((item) => item.category_key));
  const missing = TECHNOLOGY_CATEGORIES.filter((category) => !existing.has(category.key)).map(
    (category, index) => ({
      brief_id: brief.id,
      category_key: category.key,
      category_name: category.name,
      sort_order: existing.size + index + 1,
      in_scope: false,
      note: "",
    }),
  );

  if (missing.length > 0) {
    const { error } = await supabase.from("brief_scope_items").insert(missing);
    requireMessage(error, "Could not seed brief checklist.");
  }

  return fetchBrief(brief.id);
}

export const api = {
  async listProjects(): Promise<Project[]> {
    if (!isSupabaseConfigured) return demoApi.listProjects();
    const { data, error } = await getSupabase()
      .from("projects")
      .select("*")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    requireMessage(error, "Could not load projects.");
    return (data ?? []) as Project[];
  },

  async getProject(id: string): Promise<Project | null> {
    if (!isSupabaseConfigured) return demoApi.getProject(id);
    const { data, error } = await getSupabase()
      .from("projects")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    requireMessage(error, "Could not load project.");
    return (data as Project | null) ?? null;
  },

  async createProject(draft: ProjectDraft): Promise<Project> {
    if (!isSupabaseConfigured) return demoApi.createProject(draft);
    const { data, error } = await getSupabase()
      .from("projects")
      .insert({
        name: draft.name.trim(),
        owner: draft.owner.trim(),
        status: draft.status,
        start_date: draft.start_date,
        target_date: draft.target_date,
      })
      .select("*")
      .single();
    requireMessage(error, "Could not create project.");
    return data as Project;
  },

  async updateProject(id: string, draft: Partial<ProjectDraft>): Promise<Project> {
    if (!isSupabaseConfigured) return demoApi.updateProject(id, draft);
    const { data, error } = await getSupabase()
      .from("projects")
      .update(draft)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();
    requireMessage(error, "Could not update project.");
    return data as Project;
  },

  async archiveProject(id: string): Promise<void> {
    if (!isSupabaseConfigured) {
      demoApi.archiveProject(id);
      return;
    }
    const now = new Date().toISOString();
    const supabase = getSupabase();
    const { error } = await supabase
      .from("projects")
      .update({ deleted_at: now })
      .eq("id", id);
    requireMessage(error, "Could not archive project.");
    const { error: briefError } = await supabase
      .from("design_briefs")
      .update({ deleted_at: now })
      .eq("project_id", id);
    requireMessage(briefError, "Could not archive project.");
    const { error: spaceError } = await supabase
      .from("project_spaces")
      .update({ deleted_at: now })
      .eq("project_id", id)
      .is("deleted_at", null);
    requireMessage(spaceError, "Could not archive project.");
    const { error: bomError } = await supabase
      .from("bom_items")
      .update({ deleted_at: now })
      .eq("project_id", id)
      .is("deleted_at", null);
    requireMessage(bomError, "Could not archive project.");
  },

  async listStatusUpdates(projectId: string): Promise<StatusUpdate[]> {
    if (!isSupabaseConfigured) return demoApi.listStatusUpdates(projectId);
    const { data, error } = await getSupabase()
      .from("status_updates")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    requireMessage(error, "Could not load status notes.");
    return (data ?? []) as StatusUpdate[];
  },

  async addStatusUpdate(
    projectId: string,
    author: string,
    body: string,
  ): Promise<StatusUpdate> {
    if (!isSupabaseConfigured) return demoApi.addStatusUpdate(projectId, author, body);
    const { data, error } = await getSupabase()
      .from("status_updates")
      .insert({ project_id: projectId, author, body: body.trim() })
      .select("*")
      .single();
    requireMessage(error, "Could not add status note.");
    await getSupabase()
      .from("projects")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", projectId);
    return data as StatusUpdate;
  },

  async getBriefByProject(projectId: string): Promise<DesignBrief | null> {
    if (!isSupabaseConfigured) return demoApi.getBriefByProject(projectId);
    const { data, error } = await getSupabase()
      .from("design_briefs")
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .maybeSingle();
    requireMessage(error, "Could not load design brief.");
    if (!data) return null;
    return ensureScopeItems(await fetchBrief(data.id));
  },

  async createBrief(project: Project, owner: string): Promise<DesignBrief> {
    if (!isSupabaseConfigured) return demoApi.createBrief(project, owner);
    const existing = await api.getBriefByProject(project.id);
    if (existing) return existing;

    const { data, error } = await getSupabase()
      .from("design_briefs")
      .insert({
        project_id: project.id,
        owner,
        status: "draft",
        start_date: project.start_date,
        target_date: project.target_date,
      })
      .select("*")
      .single();
    requireMessage(error, "Could not create design brief.");

    const rows = TECHNOLOGY_CATEGORIES.map((category, index) => ({
      brief_id: data.id,
      category_key: category.key,
      category_name: category.name,
      sort_order: index + 1,
      in_scope: false,
      note: "",
    }));
    const { error: itemsError } = await getSupabase()
      .from("brief_scope_items")
      .insert(rows);
    if (itemsError && !/duplicate|unique/i.test(itemsError.message)) {
      throw new Error(itemsError.message);
    }

    return fetchBrief(data.id);
  },

  async saveBrief(briefId: string, draft: BriefDraft): Promise<DesignBrief> {
    if (!isSupabaseConfigured) return demoApi.saveBrief(briefId, draft);
    const supabase = getSupabase();
    const { error } = await supabase
      .from("design_briefs")
      .update({
        owner: draft.owner.trim(),
        status: draft.status,
        start_date: draft.start_date,
        target_date: draft.target_date,
        design_intent: draft.design_intent,
        constraints: draft.constraints,
        open_decisions: draft.open_decisions,
      })
      .eq("id", briefId)
      .is("deleted_at", null);
    requireMessage(error, "Could not save design brief.");

    await Promise.all(
      draft.scope_items.map(async (item) => {
        const { error: itemError } = await supabase
          .from("brief_scope_items")
          .update({ in_scope: item.in_scope, note: item.note })
          .eq("id", item.id);
        requireMessage(itemError, "Could not save checklist row.");
      }),
    );

    return fetchBrief(briefId);
  },

  async getSpaceBundle(projectId: string): Promise<SpaceBundle> {
    if (!isSupabaseConfigured) return demoApi.getSpaceBundle(projectId);
    const { data, error } = await getSupabase()
      .from("project_spaces")
      .select("*, space_system_narratives(*)")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true });
    requireMessage(error, "Could not load spaces.");
    const rows = (data ?? []) as Array<
      ProjectSpace & { space_system_narratives: SpaceSystemNarrative[] | null }
    >;
    return {
      spaces: rows.map((row) => ({
        id: row.id,
        project_id: row.project_id,
        name: row.name,
        sort_order: row.sort_order,
        note: row.note,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
      })),
      narratives: rows.flatMap((row) => row.space_system_narratives ?? []),
    };
  },

  async createSpace(projectId: string, name: string, note = ""): Promise<ProjectSpace> {
    if (!isSupabaseConfigured) return demoApi.createSpace(projectId, name, note);
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Space name is required.");
    const bundle = await api.getSpaceBundle(projectId);
    const sortOrder =
      bundle.spaces.reduce((max, space) => Math.max(max, space.sort_order), 0) + 1;
    const { data, error } = await getSupabase()
      .from("project_spaces")
      .insert({
        project_id: projectId,
        name: trimmed,
        note: note.trim(),
        sort_order: sortOrder,
      })
      .select("*")
      .single();
    requireMessage(error, "Could not add space.");
    await touchProject(projectId);
    return data as ProjectSpace;
  },

  async updateSpace(id: string, draft: SpaceDraft): Promise<ProjectSpace> {
    if (!isSupabaseConfigured) return demoApi.updateSpace(id, draft);
    const name = draft.name.trim();
    if (!name) throw new Error("Space name is required.");
    const { data, error } = await getSupabase()
      .from("project_spaces")
      .update({ name, note: draft.note.trim() })
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();
    requireMessage(error, "Could not update space.");
    const space = data as ProjectSpace;
    await touchProject(space.project_id);
    return space;
  },

  async reorderSpaces(projectId: string, orderedIds: string[]): Promise<void> {
    if (!isSupabaseConfigured) {
      demoApi.reorderSpaces(projectId, orderedIds);
      return;
    }
    const supabase = getSupabase();
    await Promise.all(
      orderedIds.map(async (id, index) => {
        const { error } = await supabase
          .from("project_spaces")
          .update({ sort_order: index + 1 })
          .eq("id", id)
          .eq("project_id", projectId)
          .is("deleted_at", null);
        requireMessage(error, "Could not reorder spaces.");
      }),
    );
    await touchProject(projectId);
  },

  async archiveSpace(id: string): Promise<void> {
    if (!isSupabaseConfigured) {
      demoApi.archiveSpace(id);
      return;
    }
    const now = new Date().toISOString();
    const { data, error } = await getSupabase()
      .from("project_spaces")
      .update({ deleted_at: now })
      .eq("id", id)
      .is("deleted_at", null)
      .select("project_id")
      .single();
    requireMessage(error, "Could not remove space.");
    await touchProject((data as { project_id: string }).project_id);
  },

  async saveNarratives(
    spaceId: string,
    drafts: NarrativeDraft[],
  ): Promise<SpaceSystemNarrative[]> {
    if (!isSupabaseConfigured) return demoApi.saveNarratives(spaceId, drafts);
    const supabase = getSupabase();
    const { data: existing, error } = await supabase
      .from("space_system_narratives")
      .select("*")
      .eq("space_id", spaceId);
    requireMessage(error, "Could not load system narrative.");
    const rows = (existing ?? []) as SpaceSystemNarrative[];

    const saved = await Promise.all(
      drafts.map(async (draft) => {
        const match = rows.find((row) => row.category_key === draft.category_key);
        if (match) {
          const { data, error: updateError } = await supabase
            .from("space_system_narratives")
            .update({ body: draft.body })
            .eq("id", match.id)
            .select("*")
            .single();
          requireMessage(updateError, "Could not save system narrative.");
          return data as SpaceSystemNarrative;
        }
        const { data, error: insertError } = await supabase
          .from("space_system_narratives")
          .insert({
            space_id: spaceId,
            category_key: draft.category_key,
            body: draft.body,
          })
          .select("*")
          .single();
        requireMessage(insertError, "Could not save system narrative.");
        return data as SpaceSystemNarrative;
      }),
    );

    const { data: space, error: spaceError } = await supabase
      .from("project_spaces")
      .select("project_id")
      .eq("id", spaceId)
      .single();
    requireMessage(spaceError, "Could not save system narrative.");
    await touchProject((space as { project_id: string }).project_id);
    return saved;
  },

  async listBomItems(projectId: string): Promise<BomItem[]> {
    if (!isSupabaseConfigured) return demoApi.listBomItems(projectId);
    const { data, error } = await getSupabase()
      .from("bom_items")
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    requireMessage(error, "Could not load bill of materials.");
    return (data ?? []).map((row) => asBomItem(row as RawBomItem));
  },

  async createBomItem(projectId: string, name: string): Promise<BomItem> {
    if (!isSupabaseConfigured) return demoApi.createBomItem(projectId, name);
    const trimmed = prepareBomName(name);
    const supabase = getSupabase();
    const { data: last, error: lastError } = await supabase
      .from("bom_items")
      .select("sort_order")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    requireMessage(lastError, "Could not add equipment line.");
    const sortOrder = ((last as { sort_order: number } | null)?.sort_order ?? 0) + 1;
    const { data, error } = await supabase
      .from("bom_items")
      .insert({
        project_id: projectId,
        name: trimmed,
        sort_order: sortOrder,
      })
      .select("*")
      .single();
    requireMessage(error, "Could not add equipment line.");
    await touchProject(projectId);
    return asBomItem(data as RawBomItem);
  },

  async saveBomItems(projectId: string, updates: BomItemUpdate[]): Promise<BomItem[]> {
    if (!isSupabaseConfigured) return demoApi.saveBomItems(projectId, updates);
    const prepared = updates.map((update) => ({
      id: update.id,
      draft: prepareBomDraft(update.draft),
    }));
    await assertBomSpaces(
      projectId,
      prepared.map((update) => update.draft.space_id),
    );
    const supabase = getSupabase();
    await Promise.all(
      prepared.map(async (update) => {
        const { data, error } = await supabase
          .from("bom_items")
          .update(update.draft)
          .eq("id", update.id)
          .eq("project_id", projectId)
          .is("deleted_at", null)
          .select("id")
          .maybeSingle();
        requireMessage(error, "Could not save bill of materials.");
        if (!data) throw new Error("Equipment line not found.");
      }),
    );
    await touchProject(projectId);
    return api.listBomItems(projectId);
  },

  async reorderBomItems(projectId: string, orderedIds: string[]): Promise<void> {
    if (!isSupabaseConfigured) {
      demoApi.reorderBomItems(projectId, orderedIds);
      return;
    }
    const supabase = getSupabase();
    await Promise.all(
      orderedIds.map(async (id, index) => {
        const { error } = await supabase
          .from("bom_items")
          .update({ sort_order: index + 1 })
          .eq("id", id)
          .eq("project_id", projectId)
          .is("deleted_at", null);
        requireMessage(error, "Could not reorder bill of materials.");
      }),
    );
    await touchProject(projectId);
  },

  async archiveBomItem(id: string): Promise<void> {
    if (!isSupabaseConfigured) {
      demoApi.archiveBomItem(id);
      return;
    }
    const now = new Date().toISOString();
    const { data, error } = await getSupabase()
      .from("bom_items")
      .update({ deleted_at: now })
      .eq("id", id)
      .is("deleted_at", null)
      .select("project_id")
      .single();
    requireMessage(error, "Could not remove equipment line.");
    await touchProject((data as { project_id: string }).project_id);
  },
};

type RawBomItem = Omit<BomItem, "quantity" | "description" | "unit" | "manufacturer" | "model" | "sku" | "notes"> & {
  quantity: number | string;
  description: string | null;
  unit: string | null;
  manufacturer: string | null;
  model: string | null;
  sku: string | null;
  notes: string | null;
};

function asBomItem(row: RawBomItem): BomItem {
  return {
    ...row,
    quantity: Number(row.quantity),
    description: row.description ?? "",
    unit: row.unit || "ea",
    manufacturer: row.manufacturer ?? "",
    model: row.model ?? "",
    sku: row.sku ?? "",
    notes: row.notes ?? "",
    space_id: row.space_id ?? null,
    category_key: row.category_key ?? null,
  };
}

async function assertBomSpaces(projectId: string, spaceIds: Array<string | null>) {
  const needed = [...new Set(spaceIds.filter((id): id is string => Boolean(id)))];
  if (needed.length === 0) return;
  const { data, error } = await getSupabase()
    .from("project_spaces")
    .select("id")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .in("id", needed);
  requireMessage(error, "Could not save bill of materials.");
  const live = new Set((data ?? []).map((row) => (row as { id: string }).id));
  if (needed.some((id) => !live.has(id))) {
    throw new Error("A line points at a space that is no longer on this project.");
  }
}

async function touchProject(projectId: string) {
  const { error } = await getSupabase()
    .from("projects")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .is("deleted_at", null);
  requireMessage(error, "Could not update project.");
}

export type { ScopeItem };
