import { TECHNOLOGY_CATEGORIES } from "./categories";
import type {
  AuthUser,
  BriefDraft,
  DesignBrief,
  Project,
  ProjectDraft,
  ScopeItem,
  StatusUpdate,
} from "./types";

const STORAGE_KEY = "cmplx-design-demo-v1";

type DemoState = {
  user: AuthUser | null;
  projects: Project[];
  statusUpdates: StatusUpdate[];
  briefs: DesignBrief[];
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
  };
}

function load(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    return JSON.parse(raw) as DemoState;
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
};
