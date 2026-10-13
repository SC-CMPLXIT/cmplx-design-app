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
  /** Gross area in square feet. Null until known. Column added in db/008_lmnt_seed.sql. */
  area_sf?: number | null;
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

/** `kickoff` is the project questionnaire. `discovery` is the per-space bank. */
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

export const DISCOVERY_ATTACHMENT_KINDS = ["floor_plan", "rendering"] as const;

export type DiscoveryAttachmentKind = (typeof DISCOVERY_ATTACHMENT_KINDS)[number];

export const DISCOVERY_SEVERITIES = ["low", "medium", "high"] as const;

export type DiscoverySeverity = (typeof DISCOVERY_SEVERITIES)[number];

export const DISCOVERY_DISCREPANCY_STATUSES = ["open", "resolved"] as const;

export type DiscoveryDiscrepancyStatus = (typeof DISCOVERY_DISCREPANCY_STATUSES)[number];

export type DiscoveryAttachment = {
  id: string;
  project_id: string;
  kind: DiscoveryAttachmentKind;
  storage_path: string;
  file_name: string;
  content_type: string;
  byte_size: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  /** Time-limited URL. Null when the object is missing. Not a database column. */
  signed_url: string | null;
};

export type DiscoverySpace = {
  id: string;
  project_id: string;
  name: string;
  group_name: string;
  plan_shows: string;
  intended_use: string;
  occupancy: string;
  notes: string;
  thumbnail_attachment_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type DiscoverySpaceDraft = {
  name: string;
  group_name: string;
  plan_shows: string;
  intended_use: string;
  occupancy: string;
  notes: string;
  thumbnail_attachment_id: string | null;
};

export type DiscoveryAnswer = {
  id: string;
  project_id: string;
  space_id: string;
  question_key: string;
  body: string;
  status: QuestionAnswerStatus;
  created_at: string;
  updated_at: string;
};

export type DiscoveryAnswerDraft = {
  space_id: string;
  question_key: string;
  body: string;
  status: QuestionAnswerStatus;
};

export type DiscoveryDiscrepancy = {
  id: string;
  project_id: string;
  space_id: string | null;
  plan_shows: string;
  notes_say: string;
  severity: DiscoverySeverity;
  status: DiscoveryDiscrepancyStatus;
  resolution_note: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  /** Derived from the space row. Not a database column. */
  space_name: string | null;
  space_archived: boolean;
};

export type DiscoveryDiscrepancyDraft = {
  space_id: string | null;
  plan_shows: string;
  notes_say: string;
  severity: DiscoverySeverity;
  status: DiscoveryDiscrepancyStatus;
  resolution_note: string;
};

export type DiscoveryBundle = {
  spaces: DiscoverySpace[];
  attachments: DiscoveryAttachment[];
  systems: TechnologySystem[];
  questions: KickoffQuestion[];
  scope: ProjectSystemScope[];
  answers: DiscoveryAnswer[];
  discrepancies: DiscoveryDiscrepancy[];
};

export type AuthUser = {
  email: string;
  displayName: string;
};

export type DataMode = "demo" | "supabase";
