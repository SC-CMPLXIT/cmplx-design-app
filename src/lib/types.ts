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

export type BomItem = {
  id: string;
  project_id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  manufacturer: string;
  model: string;
  sku: string;
  space_id: string | null;
  category_key: string | null;
  notes: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type BomItemDraft = {
  name: string;
  description: string;
  quantity: number;
  unit: string;
  manufacturer: string;
  model: string;
  sku: string;
  space_id: string | null;
  category_key: string | null;
  notes: string;
};

export type BomItemUpdate = {
  id: string;
  draft: BomItemDraft;
};

export const SYSTEM_APPLIES_TO = ["project", "space", "both"] as const;

export type SystemAppliesTo = (typeof SYSTEM_APPLIES_TO)[number];

/** `discovery` is reserved for the later per-space question bank. */
export const QUESTION_BANKS = ["kickoff", "discovery"] as const;

export type QuestionBank = (typeof QUESTION_BANKS)[number];

export const QUESTION_ANSWER_STATUSES = ["open", "answered", "locked"] as const;

export type QuestionAnswerStatus = (typeof QUESTION_ANSWER_STATUSES)[number];

export type TechnologySystem = {
  key: string;
  name: string;
  description: string;
  sort_order: number;
  applies_to: SystemAppliesTo;
  category_keys: string[];
};

export type KickoffQuestion = {
  key: string;
  bank: QuestionBank;
  section_key: string;
  section_name: string;
  prompt: string;
  sort_order: number;
  system_keys: string[];
};

export type ProjectSystemScope = {
  id: string;
  project_id: string;
  system_key: string;
  in_scope: boolean;
  created_at: string;
  updated_at: string;
};

export type ProjectQuestionAnswer = {
  id: string;
  project_id: string;
  question_key: string;
  body: string;
  status: QuestionAnswerStatus;
  created_at: string;
  updated_at: string;
};

export type KickoffAnswerDraft = {
  question_key: string;
  body: string;
  status: QuestionAnswerStatus;
};

export type KickoffScopeUpdate = {
  system_key: string;
  in_scope: boolean;
};

export type KickoffBundle = {
  systems: TechnologySystem[];
  questions: KickoffQuestion[];
  scope: ProjectSystemScope[];
  answers: ProjectQuestionAnswer[];
};

export type AuthUser = {
  email: string;
  displayName: string;
};

export type DataMode = "demo" | "supabase";
