export const PROJECT_STATUSES = [
  "pending",
  "on_track",
  "at_risk",
  "behind",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const BRIEF_STATUSES = [
  "draft",
  "active",
  "in_review",
  "approved",
] as const;

export type BriefStatus = (typeof BRIEF_STATUSES)[number];

export type Project = {
  id: string;
  name: string;
  owner: string;
  status: ProjectStatus;
  start_date: string | null;
  target_date: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type StatusUpdate = {
  id: string;
  project_id: string;
  author: string;
  body: string;
  created_at: string;
};

export type ScopeItem = {
  id: string;
  brief_id: string;
  category_key: string;
  category_name: string;
  sort_order: number;
  in_scope: boolean;
  note: string;
};

export type DesignBrief = {
  id: string;
  project_id: string;
  owner: string;
  status: BriefStatus;
  start_date: string | null;
  target_date: string | null;
  design_intent: string;
  constraints: string;
  open_decisions: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  scope_items: ScopeItem[];
};

export type ProjectDraft = {
  name: string;
  owner: string;
  status: ProjectStatus;
  start_date: string | null;
  target_date: string | null;
};

export type BriefDraft = {
  owner: string;
  status: BriefStatus;
  start_date: string | null;
  target_date: string | null;
  design_intent: string;
  constraints: string;
  open_decisions: string;
  scope_items: Pick<ScopeItem, "id" | "in_scope" | "note">[];
};

export type ProjectSpace = {
  id: string;
  project_id: string;
  name: string;
  sort_order: number;
  note: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

/** category_key null is the whole-space overview. */
export type SpaceSystemNarrative = {
  id: string;
  space_id: string;
  category_key: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};

export type SpaceDraft = {
  name: string;
  note: string;
};

export type NarrativeDraft = {
  category_key: string | null;
  body: string;
};

export type SpaceBundle = {
  spaces: ProjectSpace[];
  narratives: SpaceSystemNarrative[];
};

export type AuthUser = {
  email: string;
  displayName: string;
};

export type DataMode = "demo" | "supabase";
