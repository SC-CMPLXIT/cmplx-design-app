import { prepareBomDraft, prepareBomName } from "./bom";
import { TECHNOLOGY_CATEGORIES } from "./categories";
import { proposalIssues } from "./proposal-document";
import { freshProposal } from "./proposal-draft";
import { clearDemoFiles } from "./demo-files";
import {
  DISCOVERY_ANSWER_LIMIT,
  discoveryStoragePath,
  prepareDiscrepancyDraft,
  prepareSpaceDraft,
} from "./discovery";
import {
  DISCOVERY_QUESTIONS,
  KICKOFF_ANSWER_LIMIT,
  KICKOFF_QUESTIONS,
  TECHNOLOGY_SYSTEMS,
} from "./systems";
import {
  QUESTION_ANSWER_STATUSES,
  type AuthUser,
  type BomFromDiscovery,
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
  type ProjectProposal,
  type ProjectQuestionAnswer,
  type ProjectSpace,
  type ProjectSystemScope,
  type ProposalBundle,
  type ProposalKind,
  type ProposalLine,
  type ScopeItem,
  type SpaceBundle,
  type SpaceDraft,
  type SpaceSystemNarrative,
  type StatusUpdate,
  type TechnologySystem,
} from "./types";

const STORAGE_KEY = "cmplx-design-demo-v1";

type DemoState = {
  user: AuthUser | null;
  projects: Project[];
  statusUpdates: StatusUpdate[];
  briefs: DesignBrief[];
  spaces: ProjectSpace[];
  narratives: SpaceSystemNarrative[];
  bomItems: BomItem[];
  systemScope: ProjectSystemScope[];
  questionAnswers: ProjectQuestionAnswer[];
  discoverySpaces: DiscoverySpace[];
  discoveryAttachments: DiscoveryAttachment[];
  discoveryAnswers: DiscoveryAnswer[];
  discoveryDiscrepancies: DiscoveryDiscrepancy[];
  proposals: ProjectProposal[];
  proposalLines: ProposalLine[];
};

const CLUB_ID = "11111111-1111-4111-8111-111111111111";
const INN_ID = "22222222-2222-4222-8222-222222222222";
const ATRIUM_ID = "33333333-3333-4333-8333-333333333333";
const DEMO_STAMP = "2026-06-02T16:30:00.000Z";

const DEMO_SCOPE_ON: Record<string, readonly string[]> = {
  [CLUB_ID]: [
    "general",
    "carrier_riser",
    "it_infrastructure",
    "network_wifi",
    "display_video",
    "audio",
    "conferencing",
    "control",
    "security",
  ],
  [INN_ID]: ["it_infrastructure", "network_wifi", "display_video", "security"],
};

const DEMO_USER: AuthUser = {
  email: "editor@demo.cmplx",
  displayName: "Demo Editor",
};

const SEED_NARRATIVE_LINK: Record<string, string> = {
  "e1111111-1111-4111-8111-111111111101": "a1111111-1111-4111-8111-111111111101",
  "e1111111-1111-4111-8111-111111111102": "a1111111-1111-4111-8111-111111111102",
  "e1111111-1111-4111-8111-111111111103": "a1111111-1111-4111-8111-111111111103",
  "e2222222-2222-4222-8222-222222222201": "a2222222-2222-4222-8222-222222222201",
  "e2222222-2222-4222-8222-222222222202": "a2222222-2222-4222-8222-222222222202",
};

function isoNow() {
  return new Date().toISOString();
}

function seedScope(
  briefId: string,
  overlays: Partial<Record<string, { in_scope: boolean; note: string }>> = {},
): ScopeItem[] {
  return TECHNOLOGY_CATEGORIES.map((category, index) => {
    const overlay = overlays[category.key];
    return {
      id: crypto.randomUUID(),
      brief_id: briefId,
      category_key: category.key,
      category_name: category.name,
      sort_order: index + 1,
      in_scope: overlay?.in_scope ?? false,
      note: overlay?.note ?? "",
    };
  });
}

function seedSpaces(): ProjectSpace[] {
  const stamp = "2026-06-02T16:30:00.000Z";
  const innStamp = "2026-07-18T11:15:00.000Z";
  return [
    space(
      "a1111111-1111-4111-8111-111111111101",
      "11111111-1111-4111-8111-111111111111",
      "Lobby",
      1,
      "Members arrival",
      stamp,
    ),
    space(
      "a1111111-1111-4111-8111-111111111102",
      "11111111-1111-4111-8111-111111111111",
      "Dock-side room",
      2,
      "Events and meetings",
      stamp,
    ),
    space(
      "a1111111-1111-4111-8111-111111111103",
      "11111111-1111-4111-8111-111111111111",
      "Back of house",
      3,
      "Service corridor IDF",
      stamp,
    ),
    space(
      "a2222222-2222-4222-8222-222222222201",
      "22222222-2222-4222-8222-222222222222",
      "Guest rooms",
      1,
      "84 keys",
      innStamp,
    ),
    space(
      "a2222222-2222-4222-8222-222222222202",
      "22222222-2222-4222-8222-222222222222",
      "Circulation",
      2,
      "Corridors and stairs",
      innStamp,
    ),
  ];
}

function space(
  id: string,
  projectId: string,
  name: string,
  sortOrder: number,
  note: string,
  stamp: string,
): ProjectSpace {
  return {
    id,
    project_id: projectId,
    name,
    sort_order: sortOrder,
    note,
    created_at: stamp,
    updated_at: stamp,
    deleted_at: null,
  };
}

function narrative(
  id: string,
  spaceId: string,
  categoryKey: string | null,
  body: string,
  stamp: string,
): SpaceSystemNarrative {
  return {
    id,
    space_id: spaceId,
    category_key: categoryKey,
    body,
    created_at: stamp,
    updated_at: stamp,
  };
}

function seedNarratives(): SpaceSystemNarrative[] {
  const stamp = "2026-06-02T16:30:00.000Z";
  const innStamp = "2026-07-18T11:15:00.000Z";
  return [
    narrative(
      "d1111111-1111-4111-8111-111111111101",
      "a1111111-1111-4111-8111-111111111101",
      null,
      "Arrival stays quiet. Technology sits in the joinery: a discreet reader, staff radio coverage, and wireless that holds when the door queue builds.",
      stamp,
    ),
    narrative(
      "d1111111-1111-4111-8111-111111111102",
      "a1111111-1111-4111-8111-111111111101",
      "wireless",
      "Ceiling APs clear of the timber truss. Guest SSID in the public volume; staff SSID reaches the host desk.",
      stamp,
    ),
    narrative(
      "d1111111-1111-4111-8111-111111111103",
      "a1111111-1111-4111-8111-111111111101",
      "access_control",
      "One reader on the members door, strike in the existing leaf. No turnstile and no lobby pedestal.",
      stamp,
    ),
    narrative(
      "d1111111-1111-4111-8111-111111111104",
      "a1111111-1111-4111-8111-111111111102",
      null,
      "One room, one purpose: speech and a single image. Nothing else competes with the view to the dock.",
      stamp,
    ),
    narrative(
      "d1111111-1111-4111-8111-111111111105",
      "a1111111-1111-4111-8111-111111111102",
      "av_events",
      "Projection on the long wall and speech reinforcement. No stage-lighting package in this phase.",
      stamp,
    ),
    narrative(
      "d1111111-1111-4111-8111-111111111106",
      "a1111111-1111-4111-8111-111111111103",
      null,
      "The only place racks are allowed. Service corridor IDF, off the guest path.",
      stamp,
    ),
    narrative(
      "d1111111-1111-4111-8111-111111111107",
      "a1111111-1111-4111-8111-111111111103",
      "structured_cabling",
      "New IDF with short runs to the dock-side room and the lobby. No public-facing cabinets.",
      stamp,
    ),
    narrative(
      "d2222222-2222-4222-8222-222222222201",
      "a2222222-2222-4222-8222-222222222201",
      null,
      "Eighty-four keys. The room should feel unchanged; the lock, the set, and the network are the work.",
      innStamp,
    ),
    narrative(
      "d2222222-2222-4222-8222-222222222202",
      "a2222222-2222-4222-8222-222222222201",
      "iptv",
      "Replace the in-room set. Keep the current headend if it can feed the new panels.",
      innStamp,
    ),
    narrative(
      "d2222222-2222-4222-8222-222222222203",
      "a2222222-2222-4222-8222-222222222201",
      "access_control",
      "Lock must mate with the listed door leaf. No new frame, no surface maglock.",
      innStamp,
    ),
    narrative(
      "d2222222-2222-4222-8222-222222222204",
      "a2222222-2222-4222-8222-222222222202",
      null,
      "Circulation carries guest wireless and a staff path back to the service core. No new racks here.",
      innStamp,
    ),
    narrative(
      "d2222222-2222-4222-8222-222222222205",
      "a2222222-2222-4222-8222-222222222202",
      "wireless",
      "Guest coverage along corridors and stairs. Staff SSID stays off the guest ceiling where the fabric allows.",
      innStamp,
    ),
  ];
}

function bomItem(
  id: string,
  projectId: string,
  name: string,
  description: string,
  quantity: number,
  unit: string,
  manufacturer: string,
  model: string,
  sku: string,
  spaceId: string | null,
  categoryKey: string | null,
  notes: string,
  sortOrder: number,
  stamp: string,
): BomItem {
  return {
    id,
    project_id: projectId,
    name,
    description,
    quantity,
    unit,
    manufacturer,
    model,
    sku,
    space_id: spaceId,
    category_key: categoryKey,
    notes,
    discovery_answer_id: null,
    sort_order: sortOrder,
    created_at: stamp,
    updated_at: stamp,
    deleted_at: null,
  };
}

function seedBomItems(): BomItem[] {
  const stamp = "2026-06-02T16:30:00.000Z";
  const innStamp = "2026-07-18T11:15:00.000Z";
  const club = "11111111-1111-4111-8111-111111111111";
  const inn = "22222222-2222-4222-8222-222222222222";
  return [
    bomItem(
      "e1111111-1111-4111-8111-111111111101",
      club,
      "Ceiling access point",
      "Ceiling wireless access point for the public volume.",
      8,
      "ea",
      "DEMO",
      "AP-CEILING",
      "DEMO-AP",
      "a1111111-1111-4111-8111-111111111101",
      "wireless",
      "Count locks after the furniture layout.",
      1,
      stamp,
    ),
    bomItem(
      "e1111111-1111-4111-8111-111111111102",
      club,
      "Members door reader",
      "Reader for the members entrance.",
      1,
      "ea",
      "DEMO",
      "READER-MULLION",
      "",
      "a1111111-1111-4111-8111-111111111101",
      "access_control",
      "Strike in the existing leaf. No turnstile.",
      2,
      stamp,
    ),
    bomItem(
      "e1111111-1111-4111-8111-111111111103",
      club,
      "Dock-side projector",
      "Single projector for speech and image.",
      1,
      "ea",
      "DEMO",
      "PROJECTOR-1",
      "",
      "a1111111-1111-4111-8111-111111111102",
      "av_events",
      "Long wall. No stage lighting in this phase.",
      3,
      stamp,
    ),
    bomItem(
      "e1111111-1111-4111-8111-111111111104",
      club,
      "Service-corridor cabinet",
      "Wall cabinet for the service-corridor IDF.",
      1,
      "ea",
      "DEMO",
      "CAB-12U",
      "",
      "a1111111-1111-4111-8111-111111111103",
      "structured_cabling",
      "Off the guest path. No public-facing racks.",
      4,
      stamp,
    ),
    bomItem(
      "e1111111-1111-4111-8111-111111111105",
      club,
      "Category cable",
      "Horizontal cable from the IDF.",
      500,
      "m",
      "DEMO",
      "CABLE-CAT6A",
      "DEMO-C6A",
      "a1111111-1111-4111-8111-111111111103",
      "structured_cabling",
      "Short runs to the lobby and the dock-side room.",
      5,
      stamp,
    ),
    bomItem(
      "e2222222-2222-4222-8222-222222222201",
      inn,
      "In-room panel",
      "In-room entertainment panel, one per key.",
      84,
      "ea",
      "DEMO",
      "PANEL-ROOM",
      "",
      "a2222222-2222-4222-8222-222222222201",
      "iptv",
      "Headend stays if it can feed these panels.",
      1,
      innStamp,
    ),
    bomItem(
      "e2222222-2222-4222-8222-222222222202",
      inn,
      "Guest-room lock",
      "Lockset for the listed door leaf.",
      84,
      "ea",
      "DEMO",
      "LOCK-LEAF",
      "",
      "a2222222-2222-4222-8222-222222222201",
      "access_control",
      "No new frame and no surface maglock.",
      2,
      innStamp,
    ),
    bomItem(
      "e2222222-2222-4222-8222-222222222203",
      inn,
      "Corridor access point",
      "Guest wireless along corridors and stairs.",
      12,
      "ea",
      "DEMO",
      "AP-CORRIDOR",
      "",
      "a2222222-2222-4222-8222-222222222202",
      "wireless",
      "Staff SSID stays off the guest ceiling where the fabric allows.",
      3,
      innStamp,
    ),
  ];
}

function scopeId(projectId: string, index: number): string {
  const prefix: Record<string, string> = {
    [CLUB_ID]: "c1111111-1111-4111-8111-1111111111",
    [INN_ID]: "c2222222-2222-4222-8222-2222222222",
    [ATRIUM_ID]: "c3333333-3333-4333-8333-3333333333",
  };
  const stem = prefix[projectId];
  if (!stem) return crypto.randomUUID();
  return `${stem}${String(index + 1).padStart(2, "0")}`;
}

function scopeRowsFor(projectId: string, stamp: string): ProjectSystemScope[] {
  const on = new Set(DEMO_SCOPE_ON[projectId] ?? []);
  return TECHNOLOGY_SYSTEMS.map((system, index) => ({
    id: scopeId(projectId, index),
    project_id: projectId,
    system_key: system.key,
    in_scope: on.has(system.key),
    created_at: stamp,
    updated_at: stamp,
  }));
}

function seedQuestionAnswers(): ProjectQuestionAnswer[] {
  const rows: Array<Omit<ProjectQuestionAnswer, "created_at" | "updated_at"> & { stamp: string }> = [
    {
      id: "f1111111-1111-4111-8111-111111111101",
      project_id: CLUB_ID,
      question_key: "general_network_peripherals",
      body: "DEMO — Service-corridor IDF holds the firewall and switches. Models follow the wireless heat map.",
      status: "answered",
      stamp: DEMO_STAMP,
    },
    {
      id: "f1111111-1111-4111-8111-111111111102",
      project_id: CLUB_ID,
      question_key: "general_on_prem_servers",
      body: "DEMO — No on-prem servers. The property system stays in the cloud.",
      status: "answered",
      stamp: DEMO_STAMP,
    },
    {
      id: "f1111111-1111-4111-8111-111111111103",
      project_id: CLUB_ID,
      question_key: "it_cable_count",
      body: "DEMO — Two cables at each data outlet. Access points get two as well.",
      status: "locked",
      stamp: DEMO_STAMP,
    },
    {
      id: "f1111111-1111-4111-8111-111111111104",
      project_id: CLUB_ID,
      question_key: "av_coordination",
      body: "DEMO — Events AV in the dock-side room is in this package: one image and speech. CMPLX iT owns the technology model.",
      status: "answered",
      stamp: DEMO_STAMP,
    },
    {
      id: "f1111111-1111-4111-8111-111111111105",
      project_id: CLUB_ID,
      question_key: "security_nvr_split",
      body: "DEMO — Still confirming who provides the recorder.",
      status: "open",
      stamp: DEMO_STAMP,
    },
  ];
  return rows.map(({ stamp, ...row }) => ({
    ...row,
    created_at: stamp,
    updated_at: stamp,
  }));
}

function systemsForDemo(): TechnologySystem[] {
  return TECHNOLOGY_SYSTEMS.map((system) => ({
    ...system,
    category_keys: [...system.category_keys],
  }));
}

function questionsForDemo(): KickoffQuestion[] {
  return KICKOFF_QUESTIONS.map((question) => ({
    ...question,
    system_keys: [...question.system_keys],
  }));
}

function discoveryQuestionsForDemo(): KickoffQuestion[] {
  return DISCOVERY_QUESTIONS.map((question) => ({
    ...question,
    system_keys: [...question.system_keys],
  }));
}

function seedDiscoverySpaces(): DiscoverySpace[] {
  const rows: Array<
    Omit<DiscoverySpace, "created_at" | "updated_at" | "deleted_at" | "narrative_space_id"> & {
      stamp: string;
    }
  > = [
    {
      id: "e1111111-1111-4111-8111-111111111101",
      project_id: CLUB_ID,
      name: "Lobby",
      group_name: "Public floor",
      plan_shows: "DEMO — Members door and a host desk. No display or data symbol on the plan.",
      intended_use: "DEMO — Arrival and host.",
      occupancy: "DEMO — A short queue at the door.",
      notes: "DEMO — Confirm whether the feature wall stays a static graphic.",
      thumbnail_attachment_id: null,
      sort_order: 1,
      stamp: DEMO_STAMP,
    },
    {
      id: "e1111111-1111-4111-8111-111111111102",
      project_id: CLUB_ID,
      name: "Dock-side room",
      group_name: "Public floor",
      plan_shows: "DEMO — One image on the long wall, with power. No floor box shown.",
      intended_use: "DEMO — Meetings and small events.",
      occupancy: "DEMO — About a dozen seats.",
      notes: "DEMO — Speech and a single image. Nothing else competes with the room.",
      thumbnail_attachment_id: null,
      sort_order: 2,
      stamp: DEMO_STAMP,
    },
    {
      id: "e1111111-1111-4111-8111-111111111103",
      project_id: CLUB_ID,
      name: "Back of house",
      group_name: "Support",
      plan_shows: "DEMO — Service corridor room marked for IT. Power note only.",
      intended_use: "DEMO — Racks and service. Not a guest room.",
      occupancy: "DEMO — Staff only.",
      notes: "",
      thumbnail_attachment_id: null,
      sort_order: 3,
      stamp: DEMO_STAMP,
    },
    {
      id: "e2222222-2222-4222-8222-222222222201",
      project_id: INN_ID,
      name: "Guest rooms",
      group_name: "Guest floors",
      plan_shows: "DEMO — A display in each key. No new data symbols on the plan.",
      intended_use: "DEMO — In-room entertainment and a lock.",
      occupancy: "DEMO — One key per room.",
      notes: "DEMO — Confirm whether the existing headend stays.",
      thumbnail_attachment_id: null,
      sort_order: 1,
      stamp: "2026-07-18T11:15:00.000Z",
    },
    {
      id: "e2222222-2222-4222-8222-222222222202",
      project_id: INN_ID,
      name: "Circulation",
      group_name: "Guest floors",
      plan_shows: "DEMO — Corridors and stairs. No displays drawn.",
      intended_use: "DEMO — Guest movement, with staff wireless separate from the guest network.",
      occupancy: "DEMO — Transient.",
      notes: "",
      thumbnail_attachment_id: null,
      sort_order: 2,
      stamp: "2026-07-18T11:15:00.000Z",
    },
  ];
  return rows.map(({ stamp, ...row }) => ({
    ...row,
    narrative_space_id: SEED_NARRATIVE_LINK[row.id] ?? null,
    created_at: stamp,
    updated_at: stamp,
    deleted_at: null,
  }));
}

function seedDiscoveryAnswers(): DiscoveryAnswer[] {
  const rows: Array<Omit<DiscoveryAnswer, "created_at" | "updated_at"> & { stamp: string }> = [
    {
      id: "e3111111-1111-4111-8111-111111111101",
      project_id: CLUB_ID,
      space_id: "e1111111-1111-4111-8111-111111111101",
      question_key: "display_purpose",
      body: "DEMO — No image. The feature wall stays a static graphic.",
      status: "answered",
      stamp: DEMO_STAMP,
    },
    {
      id: "e3111111-1111-4111-8111-111111111102",
      project_id: CLUB_ID,
      space_id: "e1111111-1111-4111-8111-111111111102",
      question_key: "display_location",
      body: "DEMO — Long wall, one image. Size follows the furniture layout.",
      status: "locked",
      stamp: DEMO_STAMP,
    },
    {
      id: "e3111111-1111-4111-8111-111111111103",
      project_id: CLUB_ID,
      space_id: "e1111111-1111-4111-8111-111111111102",
      question_key: "conferencing_mode",
      body: "DEMO — Still deciding between a room system and a laptop on the table.",
      status: "open",
      stamp: DEMO_STAMP,
    },
    {
      id: "e3222222-2222-4222-8222-222222222201",
      project_id: INN_ID,
      space_id: "e2222222-2222-4222-8222-222222222201",
      question_key: "display_purpose",
      body: "DEMO — One display per key, for the in-room platform. No signage.",
      status: "answered",
      stamp: "2026-07-18T11:15:00.000Z",
    },
  ];
  return rows.map(({ stamp, ...row }) => ({
    ...row,
    created_at: stamp,
    updated_at: stamp,
  }));
}

function seedDiscoveryDiscrepancies(): DiscoveryDiscrepancy[] {
  const rows: Array<
    Omit<DiscoveryDiscrepancy, "created_at" | "updated_at" | "deleted_at"> & { stamp: string }
  > = [
    {
      id: "e4111111-1111-4111-8111-111111111101",
      project_id: CLUB_ID,
      space_id: "e1111111-1111-4111-8111-111111111102",
      plan_shows: "DEMO — One display on the long wall, with power. No floor box.",
      notes_say:
        "DEMO — The events note asks for speech and a single image, which matches the plan. Outlet count is still open.",
      severity: "medium",
      status: "open",
      resolution_note: "",
      space_name: "Dock-side room",
      space_archived: false,
      stamp: DEMO_STAMP,
    },
    {
      id: "e4111111-1111-4111-8111-111111111102",
      project_id: CLUB_ID,
      space_id: null,
      plan_shows: "DEMO — Data is drawn only at the dock-side display.",
      notes_say:
        "DEMO — The kickoff answer says two cables at each data outlet, including access points, but those outlets are not on the plan yet.",
      severity: "high",
      status: "open",
      resolution_note: "",
      space_name: null,
      space_archived: false,
      stamp: DEMO_STAMP,
    },
    {
      id: "e4111111-1111-4111-8111-111111111103",
      project_id: CLUB_ID,
      space_id: "e1111111-1111-4111-8111-111111111101",
      plan_shows: "DEMO — No display on the lobby plan.",
      notes_say: "DEMO — Arrival should stay a static graphic, with no image.",
      severity: "low",
      status: "resolved",
      resolution_note: "DEMO — Agreed on the call. No display in this space.",
      space_name: "Lobby",
      space_archived: false,
      stamp: DEMO_STAMP,
    },
  ];
  return rows.map(({ stamp, ...row }) => ({
    ...row,
    created_at: stamp,
    updated_at: stamp,
    deleted_at: null,
  }));
}

function decorateDiscrepancy(
  state: DemoState,
  row: DiscoveryDiscrepancy,
): DiscoveryDiscrepancy {
  const space = row.space_id
    ? state.discoverySpaces.find((item) => item.id === row.space_id)
    : undefined;
  return {
    ...row,
    space_name: space?.name ?? null,
    space_archived: Boolean(space?.deleted_at),
  };
}

function mergeKickoff(state: DemoState): boolean {
  let changed = false;
  if (!Array.isArray(state.systemScope)) {
    state.systemScope = [];
    changed = true;
  }
  if (!Array.isArray(state.questionAnswers)) {
    const projectIds = new Set(state.projects.map((project) => project.id));
    state.questionAnswers = seedQuestionAnswers().filter((row) => projectIds.has(row.project_id));
    changed = true;
  }
  for (const project of state.projects) {
    const have = new Set(
      state.systemScope
        .filter((row) => row.project_id === project.id)
        .map((row) => row.system_key),
    );
    for (const row of scopeRowsFor(project.id, project.created_at || DEMO_STAMP)) {
      if (have.has(row.system_key)) continue;
      state.systemScope.push(row);
      changed = true;
    }
  }
  return changed;
}

function seedState(): DemoState {
  const clubBriefId = "b1111111-1111-4111-8111-111111111111";
  const innBriefId = "b2222222-2222-4222-8222-222222222222";

  return {
    user: null,
    projects: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "DEMO — North Dock Clubhouse",
        owner: "CMPLX Studio",
        status: "on_track",
        start_date: "2026-03-01",
        target_date: "2026-09-30",
        area_sf: 18000,
        created_at: "2026-03-01T12:00:00.000Z",
        updated_at: "2026-06-02T16:30:00.000Z",
        deleted_at: null,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        name: "DEMO — Harbor Inn Guest Rooms",
        owner: "A. Rivera",
        status: "at_risk",
        start_date: "2026-04-15",
        target_date: "2026-08-01",
        created_at: "2026-04-15T12:00:00.000Z",
        updated_at: "2026-07-18T11:15:00.000Z",
        deleted_at: null,
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        name: "DEMO — Atrium Bar Refresh",
        owner: "CMPLX Studio",
        status: "pending",
        start_date: "2026-10-01",
        target_date: "2027-01-15",
        created_at: "2026-09-01T12:00:00.000Z",
        updated_at: "2026-09-01T12:00:00.000Z",
        deleted_at: null,
      },
    ],
    statusUpdates: [
      {
        id: "aaaaaaa1-0000-4000-8000-000000000001",
        project_id: "11111111-1111-4111-8111-111111111111",
        author: "Demo Editor",
        body: "Kickoff complete. Cabling pathways confirmed with architect. AV package in pricing.",
        created_at: "2026-03-12T14:00:00.000Z",
      },
      {
        id: "aaaaaaa1-0000-4000-8000-000000000002",
        project_id: "11111111-1111-4111-8111-111111111111",
        author: "Demo Editor",
        body: "Wireless heat map issued. Waiting on furniture layout before AP count lock.",
        created_at: "2026-06-02T16:30:00.000Z",
      },
      {
        id: "aaaaaaa2-0000-4000-8000-000000000001",
        project_id: "22222222-2222-4222-8222-222222222222",
        author: "A. Rivera",
        body: "IPTV vendor slipped two weeks. Guest-room lock schedule now on the critical path.",
        created_at: "2026-07-18T11:15:00.000Z",
      },
    ],
    briefs: [
      {
        id: clubBriefId,
        project_id: "11111111-1111-4111-8111-111111111111",
        owner: "CMPLX Studio",
        status: "active",
        start_date: "2026-03-01",
        target_date: "2026-09-30",
        design_intent:
          "A members' clubhouse that feels analog first. Technology should disappear into joinery and landscape — reliable wireless, discreet AV for the dock-side room, and access that members never notice.",
        constraints:
          "Existing timber structure limits riser space. No visible racks in public rooms. Construction window closes before the winter season.",
        open_decisions:
          "Confirm whether events AV is in this package or a later phase. Owner still deciding on guest-app vendor.",
        created_at: "2026-03-04T12:00:00.000Z",
        updated_at: "2026-06-02T16:30:00.000Z",
        deleted_at: null,
        scope_items: seedScope(clubBriefId, {
          structured_cabling: {
            in_scope: true,
            note: "New IDF in service corridor. No public-facing racks.",
          },
          wireless: {
            in_scope: true,
            note: "Guest + staff SSIDs. Heat map after furniture lock.",
          },
          av_events: {
            in_scope: true,
            note: "Dock-side room: 1 projection + speech reinforcement.",
          },
          access_control: {
            in_scope: true,
            note: "Members entrance + staff door. No turnstiles.",
          },
        }),
      },
      {
        id: innBriefId,
        project_id: "22222222-2222-4222-8222-222222222222",
        owner: "A. Rivera",
        status: "in_review",
        start_date: "2026-04-15",
        target_date: "2026-08-01",
        design_intent:
          "Soft-refresh 84 keys: in-room entertainment, locks, and a guest network that does not fight the historic fabric.",
        constraints:
          "Listed building — no chasing in masonry walls. Night-work only on occupied floors. Existing PMS must stay.",
        open_decisions:
          "Lock vendor vs. existing door hardware. Whether IPTV is replaced or the current platform is extended.",
        created_at: "2026-04-20T12:00:00.000Z",
        updated_at: "2026-07-18T11:15:00.000Z",
        deleted_at: null,
        scope_items: seedScope(innBriefId, {
          iptv: {
            in_scope: true,
            note: "Replace in-room TVs; keep existing headend if viable.",
          },
          wireless: {
            in_scope: true,
            note: "Guest rooms + circulation. Staff WLAN separate.",
          },
          access_control: {
            in_scope: true,
            note: "Must mate with existing listed door leafs.",
          },
          pms: {
            in_scope: true,
            note: "Stay-put. Integration only.",
          },
        }),
      },
    ],
    spaces: seedSpaces(),
    narratives: seedNarratives(),
    bomItems: seedBomItems(),
    systemScope: [CLUB_ID, INN_ID, ATRIUM_ID].flatMap((projectId) =>
      scopeRowsFor(projectId, DEMO_STAMP),
    ),
    questionAnswers: seedQuestionAnswers(),
    discoverySpaces: seedDiscoverySpaces(),
    discoveryAttachments: [],
    discoveryAnswers: seedDiscoveryAnswers(),
    discoveryDiscrepancies: seedDiscoveryDiscrepancies(),
    proposals: [],
    proposalLines: [],
  };
}

function mergeDiscovery(state: DemoState): boolean {
  let changed = false;
  const projectIds = new Set(state.projects.map((project) => project.id));
  if (!Array.isArray(state.discoverySpaces)) {
    state.discoverySpaces = seedDiscoverySpaces().filter((row) => projectIds.has(row.project_id));
    changed = true;
  }
  if (!Array.isArray(state.discoveryAttachments)) {
    state.discoveryAttachments = [];
    changed = true;
  }
  if (!Array.isArray(state.discoveryAnswers)) {
    const liveSpaces = new Set(state.discoverySpaces.map((row) => row.id));
    state.discoveryAnswers = seedDiscoveryAnswers().filter(
      (row) => projectIds.has(row.project_id) && liveSpaces.has(row.space_id),
    );
    changed = true;
  }
  if (!Array.isArray(state.discoveryDiscrepancies)) {
    const liveSpaces = new Set(state.discoverySpaces.map((row) => row.id));
    state.discoveryDiscrepancies = seedDiscoveryDiscrepancies().filter(
      (row) => projectIds.has(row.project_id) && (row.space_id == null || liveSpaces.has(row.space_id)),
    );
    changed = true;
  }
  return changed;
}

function mergeProposals(state: DemoState): boolean {
  let changed = false;
  if (!Array.isArray(state.proposals)) {
    state.proposals = [];
    changed = true;
  }
  if (!Array.isArray(state.proposalLines)) {
    state.proposalLines = [];
    changed = true;
  }
  for (const item of state.bomItems) {
    if (item.discovery_answer_id === undefined) {
      item.discovery_answer_id = null;
      changed = true;
    }
  }
  for (const space of state.discoverySpaces) {
    if (!("narrative_space_id" in space) || space.narrative_space_id === undefined) {
      space.narrative_space_id = SEED_NARRATIVE_LINK[space.id] ?? null;
      changed = true;
    }
  }
  const club = state.projects.find((project) => project.id === CLUB_ID);
  if (club && club.area_sf === undefined) {
    club.area_sf = 18000;
    changed = true;
  }
  return changed;
}

function load(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as DemoState;
    if (!parsed || !Array.isArray(parsed.projects) || !Array.isArray(parsed.briefs)) {
      return seedState();
    }
    if (!Array.isArray(parsed.statusUpdates)) parsed.statusUpdates = [];
    let upgraded = false;
    if (!Array.isArray(parsed.spaces)) {
      const seed = seedState();
      parsed.spaces = seed.spaces.filter((row) =>
        parsed.projects.some((project) => project.id === row.project_id),
      );
      parsed.narratives = seed.narratives.filter((row) =>
        parsed.spaces.some((item) => item.id === row.space_id),
      );
      upgraded = true;
    }
    if (!Array.isArray(parsed.narratives)) {
      parsed.narratives = [];
      upgraded = true;
    }
    if (!Array.isArray(parsed.bomItems)) {
      const liveSpaces = new Set(
        parsed.spaces.filter((row) => !row.deleted_at).map((row) => row.id),
      );
      parsed.bomItems = seedBomItems().filter(
        (row) =>
          parsed.projects.some((project) => project.id === row.project_id) &&
          (row.space_id == null || liveSpaces.has(row.space_id)),
      );
      upgraded = true;
    }
    if (mergeKickoff(parsed)) upgraded = true;
    if (mergeDiscovery(parsed)) upgraded = true;
    if (mergeProposals(parsed)) upgraded = true;
    if (upgraded) persist(parsed);
    return parsed;
  } catch {
    return seedState();
  }
}

function persist(state: DemoState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function mutate<T>(fn: (state: DemoState) => T): T {
  const state = load();
  const result = fn(state);
  persist(state);
  return result;
}

export const demoAuth = {
  getUser(): AuthUser | null {
    return load().user;
  },
  signIn(): AuthUser {
    return mutate((state) => {
      state.user = DEMO_USER;
      return state.user;
    });
  },
  signOut() {
    mutate((state) => {
      state.user = null;
    });
  },
  reset() {
    localStorage.removeItem(STORAGE_KEY);
    clearDemoFiles();
  },
};

export const demoApi = {
  listProjects(): Project[] {
    return load()
      .projects.filter((project) => !project.deleted_at)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  },

  getProject(id: string): Project | null {
    return (
      load().projects.find((project) => project.id === id && !project.deleted_at) ??
      null
    );
  },

  createProject(draft: ProjectDraft): Project {
    const now = isoNow();
    const project: Project = {
      id: crypto.randomUUID(),
      name: draft.name.trim(),
      owner: draft.owner.trim(),
      status: draft.status,
      start_date: draft.start_date,
      target_date: draft.target_date,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    return mutate((state) => {
      state.projects.unshift(project);
      state.systemScope.push(...scopeRowsFor(project.id, now));
      return project;
    });
  },

  updateProject(
    id: string,
    draft: Partial<ProjectDraft> & { area_sf?: number | null },
  ): Project {
    return mutate((state) => {
      const project = state.projects.find((row) => row.id === id && !row.deleted_at);
      if (!project) throw new Error("Project not found.");
      Object.assign(project, draft, { updated_at: isoNow() });
      return { ...project };
    });
  },

  archiveProject(id: string) {
    mutate((state) => {
      const project = state.projects.find((row) => row.id === id);
      if (!project) throw new Error("Project not found.");
      project.deleted_at = isoNow();
      project.updated_at = project.deleted_at;
      const brief = state.briefs.find((row) => row.project_id === id);
      if (brief) brief.deleted_at = project.deleted_at;
      for (const item of state.spaces) {
        if (item.project_id === id && !item.deleted_at) {
          item.deleted_at = project.deleted_at;
          item.updated_at = project.deleted_at;
        }
      }
      for (const item of state.bomItems) {
        if (item.project_id === id && !item.deleted_at) {
          item.deleted_at = project.deleted_at;
          item.updated_at = project.deleted_at;
        }
      }
      for (const item of state.discoverySpaces) {
        if (item.project_id === id && !item.deleted_at) {
          item.deleted_at = project.deleted_at;
          item.updated_at = project.deleted_at;
        }
      }
      for (const item of state.discoveryAttachments) {
        if (item.project_id === id && !item.deleted_at) {
          item.deleted_at = project.deleted_at;
          item.updated_at = project.deleted_at;
        }
      }
      for (const item of state.discoveryDiscrepancies) {
        if (item.project_id === id && !item.deleted_at) {
          item.deleted_at = project.deleted_at;
          item.updated_at = project.deleted_at;
        }
      }
    });
  },

  listStatusUpdates(projectId: string): StatusUpdate[] {
    return load()
      .statusUpdates.filter((row) => row.project_id === projectId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  addStatusUpdate(projectId: string, author: string, body: string): StatusUpdate {
    const update: StatusUpdate = {
      id: crypto.randomUUID(),
      project_id: projectId,
      author,
      body: body.trim(),
      created_at: isoNow(),
    };
    return mutate((state) => {
      const project = state.projects.find(
        (row) => row.id === projectId && !row.deleted_at,
      );
      if (!project) throw new Error("Project not found.");
      state.statusUpdates.push(update);
      project.updated_at = update.created_at;
      return update;
    });
  },

  getBriefByProject(projectId: string): DesignBrief | null {
    const brief = load().briefs.find(
      (row) => row.project_id === projectId && !row.deleted_at,
    );
    if (!brief) return null;
    return {
      ...brief,
      scope_items: [...brief.scope_items].sort((a, b) => a.sort_order - b.sort_order),
    };
  },

  createBrief(project: Project, owner: string): DesignBrief {
    const existing = demoApi.getBriefByProject(project.id);
    if (existing) return existing;
    const now = isoNow();
    const briefId = crypto.randomUUID();
    const brief: DesignBrief = {
      id: briefId,
      project_id: project.id,
      owner,
      status: "draft",
      start_date: project.start_date,
      target_date: project.target_date,
      design_intent: "",
      constraints: "",
      open_decisions: "",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      scope_items: seedScope(briefId),
    };
    return mutate((state) => {
      state.briefs.push(brief);
      const row = state.projects.find((p) => p.id === project.id);
      if (row) row.updated_at = now;
      return structuredClone(brief);
    });
  },

  saveBrief(briefId: string, draft: BriefDraft): DesignBrief {
    return mutate((state) => {
      const brief = state.briefs.find((row) => row.id === briefId && !row.deleted_at);
      if (!brief) throw new Error("Design brief not found.");
      brief.owner = draft.owner.trim();
      brief.status = draft.status;
      brief.start_date = draft.start_date;
      brief.target_date = draft.target_date;
      brief.design_intent = draft.design_intent;
      brief.constraints = draft.constraints;
      brief.open_decisions = draft.open_decisions;
      brief.updated_at = isoNow();
      for (const itemDraft of draft.scope_items) {
        const item = brief.scope_items.find((row) => row.id === itemDraft.id);
        if (item) {
          item.in_scope = itemDraft.in_scope;
          item.note = itemDraft.note;
        }
      }
      return structuredClone(brief);
    });
  },

  getSpaceBundle(projectId: string): SpaceBundle {
    const state = load();
    const spaces = state.spaces
      .filter((row) => row.project_id === projectId && !row.deleted_at)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
      .map((row) => ({ ...row }));
    const ids = new Set(spaces.map((row) => row.id));
    const narratives = state.narratives
      .filter((row) => ids.has(row.space_id))
      .map((row) => ({ ...row }));
    return { spaces, narratives };
  },

  createSpace(projectId: string, name: string, note = ""): ProjectSpace {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Space name is required.");
    const now = isoNow();
    return mutate((state) => {
      const project = state.projects.find((row) => row.id === projectId && !row.deleted_at);
      if (!project) throw new Error("Project not found.");
      const sortOrder =
        state.spaces
          .filter((row) => row.project_id === projectId && !row.deleted_at)
          .reduce((max, row) => Math.max(max, row.sort_order), 0) + 1;
      const created: ProjectSpace = {
        id: crypto.randomUUID(),
        project_id: projectId,
        name: trimmed,
        sort_order: sortOrder,
        note: note.trim(),
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      state.spaces.push(created);
      project.updated_at = now;
      return { ...created };
    });
  },

  updateSpace(id: string, draft: SpaceDraft): ProjectSpace {
    const name = draft.name.trim();
    if (!name) throw new Error("Space name is required.");
    return mutate((state) => {
      const row = state.spaces.find((item) => item.id === id && !item.deleted_at);
      if (!row) throw new Error("Space not found.");
      row.name = name;
      row.note = draft.note.trim();
      row.updated_at = isoNow();
      const project = state.projects.find(
        (item) => item.id === row.project_id && !item.deleted_at,
      );
      if (project) project.updated_at = row.updated_at;
      return { ...row };
    });
  },

  reorderSpaces(projectId: string, orderedIds: string[]) {
    mutate((state) => {
      const now = isoNow();
      orderedIds.forEach((id, index) => {
        const row = state.spaces.find(
          (item) => item.id === id && item.project_id === projectId && !item.deleted_at,
        );
        if (!row) throw new Error("Space not found.");
        row.sort_order = index + 1;
        row.updated_at = now;
      });
      const project = state.projects.find((item) => item.id === projectId && !item.deleted_at);
      if (project) project.updated_at = now;
    });
  },

  archiveSpace(id: string) {
    mutate((state) => {
      const row = state.spaces.find((item) => item.id === id && !item.deleted_at);
      if (!row) throw new Error("Space not found.");
      row.deleted_at = isoNow();
      row.updated_at = row.deleted_at;
      for (const line of state.bomItems) {
        if (line.space_id === id && !line.deleted_at) {
          line.space_id = null;
          line.updated_at = row.deleted_at;
        }
      }
      for (const room of state.discoverySpaces) {
        if (room.narrative_space_id === id) {
          room.narrative_space_id = null;
          room.updated_at = row.deleted_at;
        }
      }
      const project = state.projects.find(
        (item) => item.id === row.project_id && !item.deleted_at,
      );
      if (project) project.updated_at = row.deleted_at;
    });
  },

  saveNarratives(spaceId: string, drafts: NarrativeDraft[]): SpaceSystemNarrative[] {
    return mutate((state) => {
      const space = state.spaces.find((item) => item.id === spaceId && !item.deleted_at);
      if (!space) throw new Error("Space not found.");
      const now = isoNow();
      const saved: SpaceSystemNarrative[] = [];
      for (const draft of drafts) {
        const match = state.narratives.find(
          (row) => row.space_id === spaceId && row.category_key === draft.category_key,
        );
        if (match) {
          match.body = draft.body;
          match.updated_at = now;
          saved.push({ ...match });
        } else {
          const created: SpaceSystemNarrative = {
            id: crypto.randomUUID(),
            space_id: spaceId,
            category_key: draft.category_key,
            body: draft.body,
            created_at: now,
            updated_at: now,
          };
          state.narratives.push(created);
          saved.push({ ...created });
        }
      }
      space.updated_at = now;
      const project = state.projects.find(
        (item) => item.id === space.project_id && !item.deleted_at,
      );
      if (project) project.updated_at = now;
      return saved;
    });
  },

  listBomItems(projectId: string): BomItem[] {
    return load()
      .bomItems.filter((row) => row.project_id === projectId && !row.deleted_at)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
      .map((row) => ({ ...row }));
  },

  createBomItem(projectId: string, name: string): BomItem {
    const trimmed = prepareBomName(name);
    const now = isoNow();
    return mutate((state) => {
      const project = state.projects.find((row) => row.id === projectId && !row.deleted_at);
      if (!project) throw new Error("Project not found.");
      const sortOrder =
        state.bomItems
          .filter((row) => row.project_id === projectId && !row.deleted_at)
          .reduce((max, row) => Math.max(max, row.sort_order), 0) + 1;
      const created: BomItem = {
        id: crypto.randomUUID(),
        project_id: projectId,
        name: trimmed,
        description: "",
        quantity: 1,
        unit: "ea",
        manufacturer: "",
        model: "",
        sku: "",
        space_id: null,
        category_key: null,
        discovery_answer_id: null,
        notes: "",
        sort_order: sortOrder,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      state.bomItems.push(created);
      project.updated_at = now;
      return { ...created };
    });
  },

  saveBomItems(projectId: string, updates: BomItemUpdate[]): BomItem[] {
    const prepared = updates.map((update) => ({
      id: update.id,
      draft: prepareBomDraft(update.draft),
    }));
    return mutate((state) => {
      const project = state.projects.find((row) => row.id === projectId && !row.deleted_at);
      if (!project) throw new Error("Project not found.");
      const liveSpaces = new Set(
        state.spaces
          .filter((row) => row.project_id === projectId && !row.deleted_at)
          .map((row) => row.id),
      );
      const now = isoNow();
      for (const update of prepared) {
        if (update.draft.space_id && !liveSpaces.has(update.draft.space_id)) {
          throw new Error("A line points at a space that is no longer on this project.");
        }
        const row = state.bomItems.find(
          (item) => item.id === update.id && item.project_id === projectId && !item.deleted_at,
        );
        if (!row) throw new Error("Equipment line not found.");
        Object.assign(row, update.draft, { updated_at: now });
      }
      project.updated_at = now;
      return state.bomItems
        .filter((row) => row.project_id === projectId && !row.deleted_at)
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
        .map((row) => ({ ...row }));
    });
  },

  reorderBomItems(projectId: string, orderedIds: string[]) {
    mutate((state) => {
      const now = isoNow();
      orderedIds.forEach((id, index) => {
        const row = state.bomItems.find(
          (item) => item.id === id && item.project_id === projectId && !item.deleted_at,
        );
        if (!row) throw new Error("Equipment line not found.");
        row.sort_order = index + 1;
        row.updated_at = now;
      });
      const project = state.projects.find((item) => item.id === projectId && !item.deleted_at);
      if (project) project.updated_at = now;
    });
  },

  archiveBomItem(id: string) {
    mutate((state) => {
      const row = state.bomItems.find((item) => item.id === id && !item.deleted_at);
      if (!row) throw new Error("Equipment line not found.");
      row.deleted_at = isoNow();
      row.updated_at = row.deleted_at;
      const project = state.projects.find(
        (item) => item.id === row.project_id && !item.deleted_at,
      );
      if (project) project.updated_at = row.deleted_at;
    });
  },

  getKickoff(projectId: string): KickoffBundle {
    const state = load();
    return {
      systems: systemsForDemo(),
      questions: questionsForDemo(),
      scope: state.systemScope
        .filter((row) => row.project_id === projectId)
        .map((row) => ({ ...row })),
      answers: state.questionAnswers
        .filter((row) => row.project_id === projectId)
        .map((row) => ({ ...row })),
    };
  },

  saveKickoffAnswer(projectId: string, draft: KickoffAnswerDraft): ProjectQuestionAnswer {
    if (!QUESTION_ANSWER_STATUSES.includes(draft.status)) {
      throw new Error("Answer status must be open, answered, or locked.");
    }
    if (draft.body.length > KICKOFF_ANSWER_LIMIT) throw new Error("Answer is too long.");
    if (!KICKOFF_QUESTIONS.some((question) => question.key === draft.question_key)) {
      throw new Error("Question not found.");
    }
    const now = isoNow();
    return mutate((state) => {
      const project = state.projects.find((row) => row.id === projectId && !row.deleted_at);
      if (!project) throw new Error("Project not found.");
      const existing = state.questionAnswers.find(
        (row) => row.project_id === projectId && row.question_key === draft.question_key,
      );
      if (existing) {
        existing.body = draft.body;
        existing.status = draft.status;
        existing.updated_at = now;
        project.updated_at = now;
        return { ...existing };
      }
      const created: ProjectQuestionAnswer = {
        id: crypto.randomUUID(),
        project_id: projectId,
        question_key: draft.question_key,
        body: draft.body,
        status: draft.status,
        created_at: now,
        updated_at: now,
      };
      state.questionAnswers.push(created);
      project.updated_at = now;
      return { ...created };
    });
  },

  setProjectSystemScope(projectId: string, updates: KickoffScopeUpdate[]): ProjectSystemScope[] {
    if (updates.length === 0) return [];
    const now = isoNow();
    return mutate((state) => {
      const project = state.projects.find((row) => row.id === projectId && !row.deleted_at);
      if (!project) throw new Error("Project not found.");
      const saved: ProjectSystemScope[] = [];
      for (const update of updates) {
        if (!TECHNOLOGY_SYSTEMS.some((system) => system.key === update.system_key)) {
          throw new Error("That system is not on this project yet.");
        }
        const row = state.systemScope.find(
          (item) => item.project_id === projectId && item.system_key === update.system_key,
        );
        if (!row) throw new Error("That system is not on this project yet.");
        row.in_scope = update.in_scope;
        row.updated_at = now;
        saved.push({ ...row });
      }
      project.updated_at = now;
      return saved;
    });
  },

  getDiscovery(projectId: string): DiscoveryBundle {
    const state = load();
    const project = state.projects.find((row) => row.id === projectId && !row.deleted_at);
    if (!project) throw new Error("Project not found.");
    return {
      spaces: state.discoverySpaces
        .filter((row) => row.project_id === projectId && !row.deleted_at)
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
        .map((row) => ({ ...row })),
      attachments: state.discoveryAttachments
        .filter((row) => row.project_id === projectId && !row.deleted_at)
        .sort((a, b) => a.sort_order - b.sort_order || a.file_name.localeCompare(b.file_name))
        .map((row) => ({ ...row, signed_url: null })),
      systems: systemsForDemo(),
      questions: discoveryQuestionsForDemo(),
      scope: state.systemScope
        .filter((row) => row.project_id === projectId)
        .map((row) => ({ ...row })),
      answers: state.discoveryAnswers
        .filter((row) => row.project_id === projectId)
        .map((row) => ({ ...row })),
      discrepancies: state.discoveryDiscrepancies
        .filter((row) => row.project_id === projectId && !row.deleted_at)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((row) => decorateDiscrepancy(state, row)),
    };
  },

  createDiscoverySpace(projectId: string, draft: DiscoverySpaceDraft): DiscoverySpace {
    const prepared = prepareSpaceDraft(draft);
    const now = isoNow();
    return mutate((state) => {
      const project = state.projects.find((row) => row.id === projectId && !row.deleted_at);
      if (!project) throw new Error("Project not found.");
      const sortOrder =
        state.discoverySpaces
          .filter((row) => row.project_id === projectId && !row.deleted_at)
          .reduce((max, row) => Math.max(max, row.sort_order), 0) + 1;
      const created: DiscoverySpace = {
        id: crypto.randomUUID(),
        project_id: projectId,
        ...prepared,
        narrative_space_id: null,
        sort_order: sortOrder,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      state.discoverySpaces.push(created);
      project.updated_at = now;
      return { ...created };
    });
  },

  updateDiscoverySpace(
    projectId: string,
    id: string,
    draft: DiscoverySpaceDraft,
  ): DiscoverySpace {
    const prepared = prepareSpaceDraft(draft);
    const now = isoNow();
    return mutate((state) => {
      const project = state.projects.find((row) => row.id === projectId && !row.deleted_at);
      if (!project) throw new Error("Project not found.");
      const row = state.discoverySpaces.find(
        (item) => item.id === id && item.project_id === projectId && !item.deleted_at,
      );
      if (!row) throw new Error("Space not found.");
      if (prepared.thumbnail_attachment_id) {
        const file = state.discoveryAttachments.find(
          (item) =>
            item.id === prepared.thumbnail_attachment_id &&
            item.project_id === projectId &&
            !item.deleted_at,
        );
        if (!file || file.kind !== "rendering") {
          throw new Error("Thumbnail must be a rendering uploaded on this project.");
        }
      }
      Object.assign(row, prepared, { updated_at: now });
      project.updated_at = now;
      return { ...row };
    });
  },

  reorderDiscoverySpaces(projectId: string, orderedIds: string[]) {
    mutate((state) => {
      const now = isoNow();
      orderedIds.forEach((id, index) => {
        const row = state.discoverySpaces.find(
          (item) => item.id === id && item.project_id === projectId && !item.deleted_at,
        );
        if (!row) throw new Error("Space not found.");
        row.sort_order = index + 1;
        row.updated_at = now;
      });
      const project = state.projects.find((item) => item.id === projectId && !item.deleted_at);
      if (project) project.updated_at = now;
    });
  },

  archiveDiscoverySpace(projectId: string, id: string) {
    mutate((state) => {
      const row = state.discoverySpaces.find(
        (item) => item.id === id && item.project_id === projectId && !item.deleted_at,
      );
      if (!row) throw new Error("Space not found.");
      row.deleted_at = isoNow();
      row.updated_at = row.deleted_at;
      const project = state.projects.find((item) => item.id === projectId && !item.deleted_at);
      if (project) project.updated_at = row.deleted_at;
    });
  },

  saveDiscoveryAnswer(projectId: string, draft: DiscoveryAnswerDraft): DiscoveryAnswer {
    if (!QUESTION_ANSWER_STATUSES.includes(draft.status)) {
      throw new Error("Answer status must be open, answered, or locked.");
    }
    if (draft.body.length > DISCOVERY_ANSWER_LIMIT) throw new Error("Answer is too long.");
    if (!DISCOVERY_QUESTIONS.some((question) => question.key === draft.question_key)) {
      throw new Error("Question not found.");
    }
    const now = isoNow();
    return mutate((state) => {
      const project = state.projects.find((row) => row.id === projectId && !row.deleted_at);
      if (!project) throw new Error("Project not found.");
      const space = state.discoverySpaces.find(
        (row) => row.id === draft.space_id && row.project_id === projectId && !row.deleted_at,
      );
      if (!space) throw new Error("Space not found.");
      const existing = state.discoveryAnswers.find(
        (row) => row.space_id === draft.space_id && row.question_key === draft.question_key,
      );
      if (existing) {
        existing.body = draft.body;
        existing.status = draft.status;
        existing.updated_at = now;
        project.updated_at = now;
        return { ...existing };
      }
      const created: DiscoveryAnswer = {
        id: crypto.randomUUID(),
        project_id: projectId,
        space_id: draft.space_id,
        question_key: draft.question_key,
        body: draft.body,
        status: draft.status,
        created_at: now,
        updated_at: now,
      };
      state.discoveryAnswers.push(created);
      project.updated_at = now;
      return { ...created };
    });
  },

  createDiscoveryAttachment(
    projectId: string,
    input: {
      kind: DiscoveryAttachmentKind;
      file_name: string;
      content_type: string;
      byte_size: number;
      extension: string;
    },
  ): DiscoveryAttachment {
    const now = isoNow();
    return mutate((state) => {
      const project = state.projects.find((row) => row.id === projectId && !row.deleted_at);
      if (!project) throw new Error("Project not found.");
      const id = crypto.randomUUID();
      const sortOrder =
        state.discoveryAttachments
          .filter((row) => row.project_id === projectId && !row.deleted_at)
          .reduce((max, row) => Math.max(max, row.sort_order), 0) + 1;
      const created: DiscoveryAttachment = {
        id,
        project_id: projectId,
        kind: input.kind,
        storage_path: discoveryStoragePath(projectId, id, input.extension),
        file_name: input.file_name,
        content_type: input.content_type,
        byte_size: input.byte_size,
        sort_order: sortOrder,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        signed_url: null,
      };
      state.discoveryAttachments.push(created);
      project.updated_at = now;
      return { ...created };
    });
  },

  archiveDiscoveryAttachment(projectId: string, id: string) {
    mutate((state) => {
      const row = state.discoveryAttachments.find(
        (item) => item.id === id && item.project_id === projectId && !item.deleted_at,
      );
      if (!row) throw new Error("File not found.");
      row.deleted_at = isoNow();
      row.updated_at = row.deleted_at;
      for (const space of state.discoverySpaces) {
        if (space.thumbnail_attachment_id === id) {
          space.thumbnail_attachment_id = null;
          space.updated_at = row.deleted_at;
        }
      }
      const project = state.projects.find((item) => item.id === projectId && !item.deleted_at);
      if (project) project.updated_at = row.deleted_at;
    });
  },

  createDiscoveryDiscrepancy(
    projectId: string,
    draft: DiscoveryDiscrepancyDraft,
  ): DiscoveryDiscrepancy {
    const prepared = prepareDiscrepancyDraft(draft);
    const now = isoNow();
    return mutate((state) => {
      const project = state.projects.find((row) => row.id === projectId && !row.deleted_at);
      if (!project) throw new Error("Project not found.");
      assertDiscrepancySpace(state, projectId, prepared.space_id);
      const created: DiscoveryDiscrepancy = {
        id: crypto.randomUUID(),
        project_id: projectId,
        ...prepared,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        space_name: null,
        space_archived: false,
      };
      state.discoveryDiscrepancies.push(created);
      project.updated_at = now;
      return decorateDiscrepancy(state, created);
    });
  },

  updateDiscoveryDiscrepancy(
    projectId: string,
    id: string,
    draft: DiscoveryDiscrepancyDraft,
  ): DiscoveryDiscrepancy {
    const prepared = prepareDiscrepancyDraft(draft);
    const now = isoNow();
    return mutate((state) => {
      const project = state.projects.find((row) => row.id === projectId && !row.deleted_at);
      if (!project) throw new Error("Project not found.");
      const row = state.discoveryDiscrepancies.find(
        (item) => item.id === id && item.project_id === projectId && !item.deleted_at,
      );
      if (!row) throw new Error("Discrepancy not found.");
      assertDiscrepancySpace(state, projectId, prepared.space_id);
      Object.assign(row, prepared, { updated_at: now });
      project.updated_at = now;
      return decorateDiscrepancy(state, row);
    });
  },

  archiveDiscoveryDiscrepancy(projectId: string, id: string) {
    mutate((state) => {
      const row = state.discoveryDiscrepancies.find(
        (item) => item.id === id && item.project_id === projectId && !item.deleted_at,
      );
      if (!row) throw new Error("Discrepancy not found.");
      row.deleted_at = isoNow();
      row.updated_at = row.deleted_at;
      const project = state.projects.find((item) => item.id === projectId && !item.deleted_at);
      if (project) project.updated_at = row.deleted_at;
    });
  },

  linkDiscoveryNarrative(
    projectId: string,
    discoverySpaceId: string,
    narrativeSpaceId: string | null,
  ): DiscoverySpace {
    return mutate((state) => {
      const project = state.projects.find((row) => row.id === projectId && !row.deleted_at);
      if (!project) throw new Error("Project not found.");
      const room = state.discoverySpaces.find(
        (item) => item.id === discoverySpaceId && item.project_id === projectId && !item.deleted_at,
      );
      if (!room) throw new Error("Discovery room not found.");
      if (narrativeSpaceId) {
        const space = state.spaces.find(
          (item) => item.id === narrativeSpaceId && item.project_id === projectId && !item.deleted_at,
        );
        if (!space) throw new Error("Narrative space must be a live space on this project.");
      }
      room.narrative_space_id = narrativeSpaceId;
      room.updated_at = isoNow();
      project.updated_at = room.updated_at;
      return { ...room };
    });
  },

  createNarrativeFromDiscovery(
    projectId: string,
    discoverySpaceId: string,
  ): { space: ProjectSpace; discovery: DiscoverySpace } {
    return mutate((state) => {
      const project = state.projects.find((row) => row.id === projectId && !row.deleted_at);
      if (!project) throw new Error("Project not found.");
      const room = state.discoverySpaces.find(
        (item) => item.id === discoverySpaceId && item.project_id === projectId && !item.deleted_at,
      );
      if (!room) throw new Error("Discovery room not found.");
      if (room.narrative_space_id) {
        const existing = state.spaces.find(
          (item) => item.id === room.narrative_space_id && item.project_id === projectId && !item.deleted_at,
        );
        if (existing) return { space: { ...existing }, discovery: { ...room } };
      }
      const now = isoNow();
      const sortOrder =
        state.spaces
          .filter((item) => item.project_id === projectId && !item.deleted_at)
          .reduce((max, item) => Math.max(max, item.sort_order), 0) + 1;
      const space: ProjectSpace = {
        id: crypto.randomUUID(),
        project_id: projectId,
        name: room.name.trim(),
        note: room.intended_use.trim().slice(0, 400),
        sort_order: sortOrder,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      state.spaces.push(space);
      room.narrative_space_id = space.id;
      room.updated_at = now;
      project.updated_at = now;
      return { space: { ...space }, discovery: { ...room } };
    });
  },

  createBomFromDiscovery(projectId: string, input: BomFromDiscovery): BomItem {
    const prepared = prepareBomDraft({
      name: input.name,
      description: input.description,
      quantity: input.quantity,
      unit: input.unit,
      manufacturer: "",
      model: "",
      sku: "",
      space_id: input.space_id,
      category_key: input.category_key,
      notes: input.notes,
    });
    return mutate((state) => {
      const project = state.projects.find((row) => row.id === projectId && !row.deleted_at);
      if (!project) throw new Error("Project not found.");
      const answer = state.discoveryAnswers.find(
        (item) => item.id === input.answer_id && item.project_id === projectId,
      );
      if (!answer || answer.status !== "locked") {
        throw new Error("Only a locked discovery answer can be added to the bill of materials.");
      }
      if (
        state.bomItems.some(
          (item) => item.discovery_answer_id === input.answer_id && !item.deleted_at,
        )
      ) {
        throw new Error("That locked answer is already on the bill of materials.");
      }
      if (prepared.space_id) {
        const space = state.spaces.find(
          (item) => item.id === prepared.space_id && item.project_id === projectId && !item.deleted_at,
        );
        if (!space) throw new Error("A line points at a space that is no longer on this project.");
      }
      const now = isoNow();
      const sortOrder =
        state.bomItems
          .filter((item) => item.project_id === projectId && !item.deleted_at)
          .reduce((max, item) => Math.max(max, item.sort_order), 0) + 1;
      const created: BomItem = {
        id: crypto.randomUUID(),
        project_id: projectId,
        ...prepared,
        discovery_answer_id: input.answer_id,
        sort_order: sortOrder,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      state.bomItems.push(created);
      project.updated_at = now;
      return { ...created };
    });
  },

  getProposal(projectId: string, kind: ProposalKind): ProposalBundle {
    return mutate((state) => {
      const project = state.projects.find((row) => row.id === projectId && !row.deleted_at);
      if (!project) throw new Error("Project not found.");
      let proposal = state.proposals.find(
        (row) => row.project_id === projectId && row.kind === kind,
      );
      if (!proposal) {
        const now = isoNow();
        const inScope = state.systemScope
          .filter((row) => row.project_id === projectId && row.in_scope)
          .map((row) => row.system_key);
        proposal = {
          id: crypto.randomUUID(),
          ...freshProposal(project, kind, inScope),
          created_at: now,
          updated_at: now,
        };
        state.proposals.push(proposal);
      }
      return {
        proposal: { ...proposal, scope_keys: [...proposal.scope_keys], assumption_keys: [...proposal.assumption_keys], exclusion_keys: [...proposal.exclusion_keys], term_keys: [...proposal.term_keys] },
        lines: state.proposalLines
          .filter((line) => line.proposal_id === proposal.id && !line.deleted_at)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((line) => ({ ...line })),
      };
    });
  },

  saveProposal(projectId: string, proposal: ProjectProposal, lines: ProposalLine[]): ProposalBundle {
    const issues = proposalIssues(proposal);
    if (issues.length) throw new Error(issues[0]);
    if (proposal.project_id !== projectId) throw new Error("Proposal is not on this project.");
    return mutate((state) => {
      const project = state.projects.find((row) => row.id === projectId && !row.deleted_at);
      if (!project) throw new Error("Project not found.");
      const row = state.proposals.find((item) => item.id === proposal.id && item.project_id === projectId);
      if (!row) throw new Error("Proposal not found.");
      const now = isoNow();
      Object.assign(row, proposal, { updated_at: now });
      if (row.kind === "design") {
        project.updated_at = now;
        return { proposal: { ...row }, lines: [] };
      }
      const keep = new Set<string>();
      const saved: ProposalLine[] = [];
      lines.forEach((line, index) => {
        const name = line.name.trim();
        if (!name) throw new Error("Each fee line needs a name.");
        const quantity = Math.round(Number(line.quantity) * 1000) / 1000;
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new Error(`Quantity for “${name}” must be greater than zero.`);
        }
        keep.add(line.id);
        const existing = state.proposalLines.find(
          (item) => item.id === line.id && item.proposal_id === row.id,
        );
        const next: ProposalLine = {
          ...(existing ?? line),
          ...line,
          proposal_id: row.id,
          name,
          quantity,
          unit: line.unit.trim() || "ea",
          system_key: line.system_key.trim(),
          space_label: line.space_label.trim(),
          notes: line.notes.trim(),
          sort_order: index + 1,
          updated_at: now,
          deleted_at: null,
          created_at: existing?.created_at ?? line.created_at ?? now,
        };
        if (existing) Object.assign(existing, next);
        else state.proposalLines.push(next);
        saved.push({ ...next });
      });
      for (const line of state.proposalLines) {
        if (line.proposal_id === row.id && !line.deleted_at && !keep.has(line.id)) {
          line.deleted_at = now;
          line.updated_at = now;
        }
      }
      project.updated_at = now;
      return { proposal: { ...row }, lines: saved };
    });
  },
};

function assertDiscrepancySpace(state: DemoState, projectId: string, spaceId: string | null) {
  if (!spaceId) return;
  const space = state.discoverySpaces.find(
    (row) => row.id === spaceId && row.project_id === projectId,
  );
  if (!space) throw new Error("Discrepancy space is not on this project.");
}
