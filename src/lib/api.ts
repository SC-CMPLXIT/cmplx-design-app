import { prepareBomDraft, prepareBomName } from "./bom";
import { TECHNOLOGY_CATEGORIES } from "./categories";
import { demoApi } from "./demo-store";
import {
  DISCOVERY_ANSWER_LIMIT,
  DISCOVERY_BUCKET,
  DISCOVERY_SIGNED_URL_SECONDS,
  assertDiscoveryFile,
  discoveryExtension,
  discoveryStoragePath,
  prepareDiscrepancyDraft,
  prepareSpaceDraft,
} from "./discovery";
import { getDemoFileUrl, putDemoFile } from "./demo-files";
import { KICKOFF_ANSWER_LIMIT } from "./systems";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import {
  QUESTION_ANSWER_STATUSES,
  type BomItem,
  type BomItemUpdate,
  type BriefDraft,
  type DesignBrief,
  type DiscoveryAnswer,
  type DiscoveryAnswerDraft,
  type DiscoveryAttachment,
  type DiscoveryAttachmentKind,
  type DiscoveryBundle,
  type DiscoveryDiscrepancy,
  type DiscoveryDiscrepancyDraft,
  type DiscoverySpace,
  type DiscoverySpaceDraft,
  type KickoffAnswerDraft,
  type KickoffBundle,
  type KickoffQuestion,
  type KickoffScopeUpdate,
  type NarrativeDraft,
  type Project,
  type ProjectDraft,
  type ProjectQuestionAnswer,
  type ProjectSpace,
  type ProjectSystemScope,
  type QuestionBank,
  type ScopeItem,
  type SpaceBundle,
  type SpaceDraft,
  type SpaceSystemNarrative,
  type StatusUpdate,
  type SystemAppliesTo,
  type TechnologySystem,
} from "./types";

const KICKOFF_SETUP = "Kickoff is not in this database yet. Apply db/006_kickoff.sql.";
const DISCOVERY_SETUP = "Discovery is not in this database yet. Apply db/007_discovery.sql.";

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

  async getKickoff(projectId: string): Promise<KickoffBundle> {
    if (!isSupabaseConfigured) return demoApi.getKickoff(projectId);
    const reference = await loadScopeReference("kickoff");
    await ensureProjectSystemScope(
      projectId,
      reference.systems.map((system) => system.key),
    );
    const supabase = getSupabase();
    const [scopeResult, answerResult] = await Promise.all([
      supabase.from("project_system_scope").select("*").eq("project_id", projectId),
      supabase.from("project_question_answers").select("*").eq("project_id", projectId),
    ]);
    kickoffOrThrow(scopeResult.error, "Could not load kickoff scope.");
    kickoffOrThrow(answerResult.error, "Could not load kickoff answers.");
    return {
      systems: reference.systems,
      questions: reference.questions,
      scope: (scopeResult.data ?? []) as ProjectSystemScope[],
      answers: ((answerResult.data ?? []) as ProjectQuestionAnswer[]).map(asAnswer),
    };
  },

  async saveKickoffAnswer(
    projectId: string,
    draft: KickoffAnswerDraft,
  ): Promise<ProjectQuestionAnswer> {
    if (!isSupabaseConfigured) return demoApi.saveKickoffAnswer(projectId, draft);
    assertKickoffAnswer(draft);
    const { data, error } = await getSupabase()
      .from("project_question_answers")
      .upsert(
        {
          project_id: projectId,
          question_key: draft.question_key,
          body: draft.body,
          status: draft.status,
        },
        { onConflict: "project_id,question_key" },
      )
      .select("*")
      .single();
    kickoffOrThrow(error, "Could not save answer.");
    await touchProject(projectId);
    return asAnswer(data as ProjectQuestionAnswer);
  },

  async setProjectSystemScope(
    projectId: string,
    updates: KickoffScopeUpdate[],
  ): Promise<ProjectSystemScope[]> {
    if (!isSupabaseConfigured) return demoApi.setProjectSystemScope(projectId, updates);
    if (updates.length === 0) return [];
    const supabase = getSupabase();
    const saved = await Promise.all(
      updates.map(async (update) => {
        const { data, error } = await supabase
          .from("project_system_scope")
          .update({ in_scope: update.in_scope })
          .eq("project_id", projectId)
          .eq("system_key", update.system_key)
          .select("*")
          .maybeSingle();
        kickoffOrThrow(error, "Could not update scope.");
        if (!data) throw new Error("That system is not on this project yet.");
        return data as ProjectSystemScope;
      }),
    );
    await touchProject(projectId);
    return saved;
  },

  async getDiscovery(projectId: string): Promise<DiscoveryBundle> {
    if (!isSupabaseConfigured) {
      const bundle = demoApi.getDiscovery(projectId);
      return {
        ...bundle,
        attachments: await attachDemoUrls(bundle.attachments),
      };
    }
    const reference = await loadScopeReference("discovery");
    await ensureProjectSystemScope(
      projectId,
      reference.systems.map((system) => system.key),
    );
    const supabase = getSupabase();
    const [spacesResult, attachmentResult, scopeResult, answerResult, gapResult] = await Promise.all([
      supabase
        .from("discovery_spaces")
        .select("*")
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true }),
      supabase
        .from("discovery_attachments")
        .select("*")
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true }),
      supabase.from("project_system_scope").select("*").eq("project_id", projectId),
      supabase.from("discovery_answers").select("*").eq("project_id", projectId),
      supabase
        .from("discovery_discrepancies")
        .select("*, discovery_spaces(name, deleted_at)")
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true }),
    ]);
    discoveryOrThrow(spacesResult.error, "Could not load discovery spaces.");
    discoveryOrThrow(attachmentResult.error, "Could not load discovery files.");
    discoveryOrThrow(scopeResult.error, "Could not load discovery scope.");
    discoveryOrThrow(answerResult.error, "Could not load discovery answers.");
    discoveryOrThrow(gapResult.error, "Could not load discrepancies.");
    const attachments = await signAttachments(
      ((attachmentResult.data ?? []) as RawAttachment[]).map(asAttachment),
    );
    return {
      spaces: ((spacesResult.data ?? []) as DiscoverySpace[]).map(asDiscoverySpace),
      attachments,
      systems: reference.systems,
      questions: reference.questions,
      scope: (scopeResult.data ?? []) as ProjectSystemScope[],
      answers: ((answerResult.data ?? []) as DiscoveryAnswer[]).map(asDiscoveryAnswer),
      discrepancies: ((gapResult.data ?? []) as RawDiscrepancy[]).map(asDiscrepancy),
    };
  },

  async createDiscoverySpace(
    projectId: string,
    name: string,
    groupName: string,
  ): Promise<DiscoverySpace> {
    const draft = prepareSpaceDraft({
      name,
      group_name: groupName,
      plan_shows: "",
      intended_use: "",
      occupancy: "",
      notes: "",
      thumbnail_attachment_id: null,
    });
    if (!isSupabaseConfigured) return demoApi.createDiscoverySpace(projectId, draft);
    const supabase = getSupabase();
    const { data: existing, error: listError } = await supabase
      .from("discovery_spaces")
      .select("sort_order")
      .eq("project_id", projectId)
      .is("deleted_at", null);
    discoveryOrThrow(listError, "Could not add a space.");
    const sortOrder =
      ((existing ?? []) as { sort_order: number }[]).reduce(
        (max, row) => Math.max(max, row.sort_order),
        0,
      ) + 1;
    const { data, error } = await supabase
      .from("discovery_spaces")
      .insert({
        project_id: projectId,
        name: draft.name,
        group_name: draft.group_name,
        sort_order: sortOrder,
      })
      .select("*")
      .single();
    discoveryOrThrow(error, "Could not add a space.");
    await touchProject(projectId);
    return asDiscoverySpace(data as DiscoverySpace);
  },

  async updateDiscoverySpace(
    projectId: string,
    id: string,
    draft: DiscoverySpaceDraft,
  ): Promise<DiscoverySpace> {
    const prepared = prepareSpaceDraft(draft);
    if (!isSupabaseConfigured) return demoApi.updateDiscoverySpace(projectId, id, prepared);
    const { data, error } = await getSupabase()
      .from("discovery_spaces")
      .update(prepared)
      .eq("id", id)
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .select("*")
      .maybeSingle();
    discoveryOrThrow(error, "Could not save space.");
    if (!data) throw new Error("Space not found.");
    await touchProject(projectId);
    return asDiscoverySpace(data as DiscoverySpace);
  },

  async reorderDiscoverySpaces(projectId: string, orderedIds: string[]): Promise<void> {
    if (!isSupabaseConfigured) {
      demoApi.reorderDiscoverySpaces(projectId, orderedIds);
      return;
    }
    const supabase = getSupabase();
    await Promise.all(
      orderedIds.map(async (id, index) => {
        const { error } = await supabase
          .from("discovery_spaces")
          .update({ sort_order: index + 1 })
          .eq("id", id)
          .eq("project_id", projectId)
          .is("deleted_at", null);
        discoveryOrThrow(error, "Could not reorder spaces.");
      }),
    );
    await touchProject(projectId);
  },

  async archiveDiscoverySpace(projectId: string, id: string): Promise<void> {
    if (!isSupabaseConfigured) {
      demoApi.archiveDiscoverySpace(projectId, id);
      return;
    }
    const now = new Date().toISOString();
    const { data, error } = await getSupabase()
      .from("discovery_spaces")
      .update({ deleted_at: now })
      .eq("id", id)
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();
    discoveryOrThrow(error, "Could not remove space.");
    if (!data) throw new Error("Space not found.");
    await touchProject(projectId);
  },

  async saveDiscoveryAnswer(
    projectId: string,
    draft: DiscoveryAnswerDraft,
  ): Promise<DiscoveryAnswer> {
    assertDiscoveryAnswer(draft);
    if (!isSupabaseConfigured) return demoApi.saveDiscoveryAnswer(projectId, draft);
    const { data, error } = await getSupabase()
      .from("discovery_answers")
      .upsert(
        {
          project_id: projectId,
          space_id: draft.space_id,
          question_key: draft.question_key,
          body: draft.body,
          status: draft.status,
        },
        { onConflict: "space_id,question_key" },
      )
      .select("*")
      .single();
    discoveryOrThrow(error, "Could not save answer.");
    await touchProject(projectId);
    return asDiscoveryAnswer(data as DiscoveryAnswer);
  },

  async uploadDiscoveryFile(
    projectId: string,
    kind: DiscoveryAttachmentKind,
    file: File,
  ): Promise<DiscoveryAttachment> {
    const prepared = assertDiscoveryFile(kind, file);
    const extension = discoveryExtension(prepared.contentType);
    if (!extension) throw new Error("That file type is not supported.");
    if (!isSupabaseConfigured) {
      const row = demoApi.createDiscoveryAttachment(projectId, {
        kind,
        file_name: prepared.fileName,
        content_type: prepared.contentType,
        byte_size: file.size,
        extension,
      });
      try {
        await putDemoFile(row.id, file);
      } catch (error) {
        demoApi.archiveDiscoveryAttachment(projectId, row.id);
        throw error instanceof Error ? error : new Error("Could not store the file.");
      }
      return { ...row, signed_url: await getDemoFileUrl(row.id) };
    }
    const id = crypto.randomUUID();
    const storagePath = discoveryStoragePath(projectId, id, extension);
    const supabase = getSupabase();
    const { data: existing, error: listError } = await supabase
      .from("discovery_attachments")
      .select("sort_order")
      .eq("project_id", projectId)
      .is("deleted_at", null);
    discoveryOrThrow(listError, "Could not upload the file.");
    const sortOrder =
      ((existing ?? []) as { sort_order: number }[]).reduce(
        (max, row) => Math.max(max, row.sort_order),
        0,
      ) + 1;
    const { error: insertError } = await supabase.from("discovery_attachments").insert({
      id,
      project_id: projectId,
      kind,
      storage_path: storagePath,
      file_name: prepared.fileName,
      content_type: prepared.contentType,
      byte_size: file.size,
      sort_order: sortOrder,
    });
    discoveryOrThrow(insertError, "Could not upload the file.");
    const { error: uploadError } = await supabase.storage
      .from(DISCOVERY_BUCKET)
      .upload(storagePath, file, { contentType: prepared.contentType, upsert: false });
    if (uploadError) {
      await supabase
        .from("discovery_attachments")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      discoveryOrThrow(uploadError, "Could not upload the file.");
    }
    await touchProject(projectId);
    const signed = await signAttachments([
      {
        id,
        project_id: projectId,
        kind,
        storage_path: storagePath,
        file_name: prepared.fileName,
        content_type: prepared.contentType,
        byte_size: file.size,
        sort_order: sortOrder,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        signed_url: null,
      },
    ]);
    return signed[0];
  },

  async archiveDiscoveryAttachment(projectId: string, id: string): Promise<void> {
    if (!isSupabaseConfigured) {
      demoApi.archiveDiscoveryAttachment(projectId, id);
      return;
    }
    const now = new Date().toISOString();
    const { data, error } = await getSupabase()
      .from("discovery_attachments")
      .update({ deleted_at: now })
      .eq("id", id)
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();
    discoveryOrThrow(error, "Could not remove the file.");
    if (!data) throw new Error("File not found.");
    await touchProject(projectId);
  },

  async createDiscoveryDiscrepancy(
    projectId: string,
    draft: DiscoveryDiscrepancyDraft,
  ): Promise<DiscoveryDiscrepancy> {
    const prepared = prepareDiscrepancyDraft(draft);
    if (!isSupabaseConfigured) return demoApi.createDiscoveryDiscrepancy(projectId, prepared);
    const { data, error } = await getSupabase()
      .from("discovery_discrepancies")
      .insert({ project_id: projectId, ...prepared })
      .select("*, discovery_spaces(name, deleted_at)")
      .single();
    discoveryOrThrow(error, "Could not add a discrepancy.");
    await touchProject(projectId);
    return asDiscrepancy(data as RawDiscrepancy);
  },

  async updateDiscoveryDiscrepancy(
    projectId: string,
    id: string,
    draft: DiscoveryDiscrepancyDraft,
  ): Promise<DiscoveryDiscrepancy> {
    const prepared = prepareDiscrepancyDraft(draft);
    if (!isSupabaseConfigured) return demoApi.updateDiscoveryDiscrepancy(projectId, id, prepared);
    const { data, error } = await getSupabase()
      .from("discovery_discrepancies")
      .update(prepared)
      .eq("id", id)
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .select("*, discovery_spaces(name, deleted_at)")
      .maybeSingle();
    discoveryOrThrow(error, "Could not save discrepancy.");
    if (!data) throw new Error("Discrepancy not found.");
    await touchProject(projectId);
    return asDiscrepancy(data as RawDiscrepancy);
  },

  async archiveDiscoveryDiscrepancy(projectId: string, id: string): Promise<void> {
    if (!isSupabaseConfigured) {
      demoApi.archiveDiscoveryDiscrepancy(projectId, id);
      return;
    }
    const now = new Date().toISOString();
    const { data, error } = await getSupabase()
      .from("discovery_discrepancies")
      .update({ deleted_at: now })
      .eq("id", id)
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();
    discoveryOrThrow(error, "Could not remove discrepancy.");
    if (!data) throw new Error("Discrepancy not found.");
    await touchProject(projectId);
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

function kickoffOrThrow(error: { message: string } | null, fallback: string) {
  if (!error) return;
  if (
    /does not exist|schema cache|technology_systems|scope_questions|project_system_scope|project_question_answers|system_category_links/i.test(
      error.message,
    )
  ) {
    throw new Error(KICKOFF_SETUP);
  }
  throw new Error(error.message || fallback);
}

function assertKickoffAnswer(draft: KickoffAnswerDraft) {
  if (!QUESTION_ANSWER_STATUSES.includes(draft.status)) {
    throw new Error("Answer status must be open, answered, or locked.");
  }
  if (draft.body.length > KICKOFF_ANSWER_LIMIT) {
    throw new Error("Answer is too long.");
  }
}

function asAnswer(row: ProjectQuestionAnswer): ProjectQuestionAnswer {
  return {
    ...row,
    body: row.body ?? "",
    status: QUESTION_ANSWER_STATUSES.includes(row.status) ? row.status : "open",
  };
}

type RawSystem = {
  key: string;
  name: string;
  description: string | null;
  sort_order: number;
  applies_to: SystemAppliesTo;
};

type RawQuestion = {
  key: string;
  bank: KickoffQuestion["bank"];
  section_key: string;
  section_name: string;
  prompt: string;
  sort_order: number;
};

async function loadScopeReference(
  bank: QuestionBank,
): Promise<Pick<KickoffBundle, "systems" | "questions">> {
  const supabase = getSupabase();
  const setup = bank === "discovery" ? DISCOVERY_SETUP : KICKOFF_SETUP;
  const [systemsResult, questionsResult, linksResult, categoriesResult] = await Promise.all([
    supabase.from("technology_systems").select("*").order("sort_order", { ascending: true }),
    supabase
      .from("scope_questions")
      .select("*")
      .eq("bank", bank)
      .order("sort_order", { ascending: true }),
    supabase.from("scope_question_systems").select("question_key, system_key"),
    supabase.from("system_category_links").select("system_key, category_key"),
  ]);
  kickoffOrThrow(systemsResult.error, setup);
  kickoffOrThrow(questionsResult.error, setup);
  kickoffOrThrow(linksResult.error, setup);
  kickoffOrThrow(categoriesResult.error, setup);

  const systemsRaw = (systemsResult.data ?? []) as RawSystem[];
  const questionsRaw = (questionsResult.data ?? []) as RawQuestion[];
  if (systemsRaw.length === 0 || questionsRaw.length === 0) {
    throw new Error(setup);
  }

  const systemOrder = new Map(systemsRaw.map((system) => [system.key, system.sort_order]));
  const categoryOrder = new Map<string, number>(
    TECHNOLOGY_CATEGORIES.map((category, index) => [category.key, index]),
  );
  const categoriesBySystem = new Map<string, string[]>();
  for (const link of (categoriesResult.data ?? []) as {
    system_key: string;
    category_key: string;
  }[]) {
    const list = categoriesBySystem.get(link.system_key) ?? [];
    list.push(link.category_key);
    categoriesBySystem.set(link.system_key, list);
  }
  const systems: TechnologySystem[] = systemsRaw.map((system) => ({
    key: system.key,
    name: system.name,
    description: system.description ?? "",
    sort_order: system.sort_order,
    applies_to: system.applies_to,
    category_keys: (categoriesBySystem.get(system.key) ?? []).sort(
      (a, b) => (categoryOrder.get(a) ?? 99) - (categoryOrder.get(b) ?? 99),
    ),
  }));

  const systemsByQuestion = new Map<string, string[]>();
  for (const link of (linksResult.data ?? []) as {
    question_key: string;
    system_key: string;
  }[]) {
    const list = systemsByQuestion.get(link.question_key) ?? [];
    list.push(link.system_key);
    systemsByQuestion.set(link.question_key, list);
  }
  const questions: KickoffQuestion[] = questionsRaw.map((question) => ({
    ...question,
    system_keys: (systemsByQuestion.get(question.key) ?? []).sort(
      (a, b) => (systemOrder.get(a) ?? 99) - (systemOrder.get(b) ?? 99),
    ),
  }));

  return { systems, questions };
}

async function ensureProjectSystemScope(projectId: string, systemKeys: string[]) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_system_scope")
    .select("system_key")
    .eq("project_id", projectId);
  kickoffOrThrow(error, "Could not load kickoff scope.");
  const have = new Set((data ?? []).map((row) => (row as { system_key: string }).system_key));
  const missing = systemKeys.filter((key) => !have.has(key));
  if (missing.length === 0) return;
  const { error: insertError } = await supabase.from("project_system_scope").insert(
    missing.map((systemKey) => ({
      project_id: projectId,
      system_key: systemKey,
      in_scope: false,
    })),
  );
  kickoffOrThrow(insertError, "Could not prepare kickoff scope.");
}

async function touchProject(projectId: string) {
  const { error } = await getSupabase()
    .from("projects")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .is("deleted_at", null);
  requireMessage(error, "Could not update project.");
}

function discoveryOrThrow(error: { message: string } | null, fallback: string) {
  if (!error) return;
  if (
    /does not exist|schema cache|discovery_spaces|discovery_attachments|discovery_answers|discovery_discrepancies|Bucket not found|bucket not found/i.test(
      error.message,
    )
  ) {
    throw new Error(DISCOVERY_SETUP);
  }
  throw new Error(error.message || fallback);
}

function assertDiscoveryAnswer(draft: DiscoveryAnswerDraft) {
  if (!QUESTION_ANSWER_STATUSES.includes(draft.status)) {
    throw new Error("Answer status must be open, answered, or locked.");
  }
  if (draft.body.length > DISCOVERY_ANSWER_LIMIT) throw new Error("Answer is too long.");
}

function asDiscoverySpace(row: DiscoverySpace): DiscoverySpace {
  return {
    ...row,
    group_name: row.group_name ?? "",
    plan_shows: row.plan_shows ?? "",
    intended_use: row.intended_use ?? "",
    occupancy: row.occupancy ?? "",
    notes: row.notes ?? "",
    thumbnail_attachment_id: row.thumbnail_attachment_id ?? null,
    deleted_at: row.deleted_at ?? null,
  };
}

type RawAttachment = Omit<DiscoveryAttachment, "byte_size" | "signed_url"> & {
  byte_size: number | string;
};

function asAttachment(row: RawAttachment): DiscoveryAttachment {
  return {
    ...row,
    byte_size: Number(row.byte_size),
    deleted_at: row.deleted_at ?? null,
    signed_url: null,
  };
}

function asDiscoveryAnswer(row: DiscoveryAnswer): DiscoveryAnswer {
  return {
    ...row,
    body: row.body ?? "",
    status: QUESTION_ANSWER_STATUSES.includes(row.status) ? row.status : "open",
  };
}

type RawDiscrepancy = Omit<DiscoveryDiscrepancy, "space_name" | "space_archived"> & {
  discovery_spaces?: { name: string; deleted_at: string | null } | null;
};

function asDiscrepancy(row: RawDiscrepancy): DiscoveryDiscrepancy {
  const space = row.discovery_spaces ?? null;
  return {
    id: row.id,
    project_id: row.project_id,
    space_id: row.space_id ?? null,
    plan_shows: row.plan_shows ?? "",
    notes_say: row.notes_say ?? "",
    severity: row.severity,
    status: row.status,
    resolution_note: row.resolution_note ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at ?? null,
    space_name: space?.name ?? null,
    space_archived: Boolean(space?.deleted_at),
  };
}

async function signAttachments(rows: DiscoveryAttachment[]): Promise<DiscoveryAttachment[]> {
  if (rows.length === 0) return [];
  const { data, error } = await getSupabase()
    .storage
    .from(DISCOVERY_BUCKET)
    .createSignedUrls(
      rows.map((row) => row.storage_path),
      DISCOVERY_SIGNED_URL_SECONDS,
    );
  discoveryOrThrow(error, "Could not open discovery files.");
  const urls = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.path && item.signedUrl && !item.error) urls.set(item.path, item.signedUrl);
  }
  return rows.map((row) => ({ ...row, signed_url: urls.get(row.storage_path) ?? null }));
}

async function attachDemoUrls(rows: DiscoveryAttachment[]): Promise<DiscoveryAttachment[]> {
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      signed_url: await getDemoFileUrl(row.id).catch(() => null),
    })),
  );
}

export type { ScopeItem };
