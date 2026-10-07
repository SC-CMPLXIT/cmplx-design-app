import { prepareBomDraft, prepareBomName } from "./bom";
import { TECHNOLOGY_CATEGORIES } from "./categories";
import type {
  AuthUser,
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

const STORAGE_KEY = "cmplx-design-demo-v1";

type DemoState = {
  user: AuthUser | null;
  projects: Project[];
  statusUpdates: StatusUpdate[];
  briefs: DesignBrief[];
  spaces: ProjectSpace[];
  narratives: SpaceSystemNarrative[];
  bomItems: BomItem[];
};

const DEMO_USER: AuthUser = {
  email: "editor@demo.cmplx",
  displayName: "Demo Editor",
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
  };
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
      return project;
    });
  },

  updateProject(id: string, draft: Partial<ProjectDraft>): Project {
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
};
