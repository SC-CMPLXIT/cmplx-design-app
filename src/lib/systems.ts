/**
 * Canonical systems for kickoff and later discovery.
 *
 * The question prompts are the CMPLX iT basis-of-design questionnaire
 * (General, Carrier service & riser, IT infrastructure, Audio visual,
 * Access control, Video surveillance), written so any project can use them.
 * System names follow the space-guide taxonomy: display/video, audio,
 * conferencing, control, network/Wi-Fi, security, acoustics, plus the
 * project-level systems the questionnaire adds.
 *
 * Keep this file and db/006_kickoff.sql in sync.
 */
import type { QuestionAnswerStatus, QuestionBank, SystemAppliesTo } from "./types";

export const KICKOFF_ANSWER_LIMIT = 8000;

export const APPLIES_TO_LABEL: Record<SystemAppliesTo, string> = {
  project: "Project",
  space: "Space",
  both: "Project + space",
};

export const ANSWER_STATUS_LABEL: Record<QuestionAnswerStatus, string> = {
  open: "Open",
  answered: "Answered",
  locked: "Locked",
};

export type SystemDefinition = {
  key: string;
  name: string;
  description: string;
  sort_order: number;
  applies_to: SystemAppliesTo;
  /** Standard-15 keys this system matches on a design brief. */
  category_keys: readonly string[];
};

/**
 * Shared scope checklist. `applies_to` is how discovery will reuse a row:
 * project-level kickoff, a future per-space checklist, or both.
 */
export const TECHNOLOGY_SYSTEMS: readonly SystemDefinition[] = [
  {
    key: "general",
    name: "General",
    description: "Coordination, IT rooms, MEP load, and who orders services.",
    sort_order: 1,
    applies_to: "project",
    category_keys: ["staff_systems", "telephony"],
  },
  {
    key: "carrier_riser",
    name: "Carrier & riser",
    description: "ISP, diverse routes, risers, and onsite carrier vendors.",
    sort_order: 2,
    applies_to: "project",
    category_keys: ["telephony"],
  },
  {
    key: "it_infrastructure",
    name: "IT infrastructure",
    description: "Copper, fiber, cabinets, pathways, and outlet standards.",
    sort_order: 3,
    applies_to: "both",
    category_keys: ["structured_cabling"],
  },
  {
    key: "network_wifi",
    name: "Network / Wi-Fi",
    description: "Core, switching, firewalls, and wireless coverage.",
    sort_order: 4,
    applies_to: "both",
    category_keys: ["network_core", "wireless"],
  },
  {
    key: "display_video",
    name: "Display / video",
    description: "Displays, video walls, signage, and program image.",
    sort_order: 5,
    applies_to: "space",
    category_keys: ["digital_signage", "iptv", "av_events"],
  },
  {
    key: "audio",
    name: "Audio",
    description: "Background music, paging, and speech reinforcement.",
    sort_order: 6,
    applies_to: "space",
    category_keys: ["audio_bgm"],
  },
  {
    key: "conferencing",
    name: "Conferencing",
    description: "Room video, cameras, microphones, and meeting platforms.",
    sort_order: 7,
    applies_to: "space",
    category_keys: ["av_events"],
  },
  {
    key: "control",
    name: "Control",
    description: "Touch panels, scheduling, and lighting or shade tie-in.",
    sort_order: 8,
    applies_to: "space",
    category_keys: ["bms"],
  },
  {
    key: "security",
    name: "Security",
    description: "Access control, video surveillance, and alarm monitoring.",
    sort_order: 9,
    applies_to: "both",
    category_keys: ["access_control", "cctv"],
  },
  {
    key: "acoustics",
    name: "Acoustics",
    description: "Speech privacy, finishes, and the acoustical-engineer scope.",
    sort_order: 10,
    applies_to: "space",
    category_keys: [],
  },
] as const;

export type KickoffQuestionDefinition = {
  key: string;
  bank: QuestionBank;
  section_key: string;
  section_name: string;
  prompt: string;
  sort_order: number;
  /** Visible when any of these systems is in scope. */
  system_keys: readonly string[];
};

export const KICKOFF_QUESTIONS: readonly KickoffQuestionDefinition[] = [
  {
    key: "general_network_peripherals",
    bank: "kickoff",
    section_key: "general",
    section_name: "General",
    sort_order: 1,
    system_keys: ["general", "network_wifi"],
    prompt:
      "The design intent defines the wireless access points. Does the team have the rest of the network and peripherals (firewall, switches, and similar equipment)? Can the client provide the models for CMPLX iT to review and carry into the design?",
  },
  {
    key: "general_on_prem_servers",
    bank: "kickoff",
    section_key: "general",
    section_name: "General",
    sort_order: 2,
    system_keys: ["general", "it_infrastructure"],
    prompt:
      "Does the client host local or on-prem servers that need to be accounted for in the IT room(s)?",
  },
  {
    key: "general_load_letter",
    bank: "kickoff",
    section_key: "general",
    section_name: "General",
    sort_order: 3,
    system_keys: ["general", "it_infrastructure"],
    prompt:
      "Will the design team need CMPLX iT to develop a load letter for the MEP designer, covering cooling and power for the IDF rooms?",
  },
  {
    key: "general_client_procurement",
    bank: "kickoff",
    section_key: "general",
    section_name: "General",
    sort_order: 4,
    system_keys: ["general", "carrier_riser"],
    prompt:
      "Will the client handle ordering internet service, phone (VoIP or analog), software licenses, and similar items?",
  },
  {
    key: "carrier_requirements",
    bank: "kickoff",
    section_key: "carrier_riser",
    section_name: "Carrier service & riser",
    sort_order: 5,
    system_keys: ["carrier_riser"],
    prompt:
      "Does the client have ISP or carrier requirements that should be accounted for, such as diverse routes or separate risers for redundancy?",
  },
  {
    key: "carrier_vendor_management",
    bank: "kickoff",
    section_key: "carrier_riser",
    section_name: "Carrier service & riser",
    sort_order: 6,
    system_keys: ["carrier_riser"],
    prompt: "Is onsite vendor management required for the carrier installation?",
  },
  {
    key: "carrier_count",
    bank: "kickoff",
    section_key: "carrier_riser",
    section_name: "Carrier service & riser",
    sort_order: 7,
    system_keys: ["carrier_riser"],
    prompt:
      "How many carriers does the client intend to use, and will the client order those circuits directly?",
  },
  {
    key: "it_manufacturers",
    bank: "kickoff",
    section_key: "it_infrastructure",
    section_name: "IT infrastructure",
    sort_order: 8,
    system_keys: ["it_infrastructure"],
    prompt:
      "Does the client have a preferred manufacturer for copper, fiber, and cabinets, or a design standard CMPLX iT should follow? If a reference set names racks or cable, confirm whether that standard applies on this project.",
  },
  {
    key: "it_data_locations",
    bank: "kickoff",
    section_key: "it_infrastructure",
    section_name: "IT infrastructure",
    sort_order: 9,
    system_keys: ["it_infrastructure", "network_wifi"],
    prompt:
      "Will the client provide a markup of data locations and a wireless heatmap for access-point coverage?",
  },
  {
    key: "it_cable_count",
    bank: "kickoff",
    section_key: "it_infrastructure",
    section_name: "IT infrastructure",
    sort_order: 10,
    system_keys: ["it_infrastructure", "network_wifi"],
    prompt:
      "Unless noted otherwise, is the default two cables at each data location? Do access points get that same count?",
  },
  {
    key: "av_coordination",
    bank: "kickoff",
    section_key: "audio_visual",
    section_name: "Audio visual",
    sort_order: 11,
    system_keys: ["display_video", "audio", "conferencing", "control"],
    prompt:
      "Who designs the audio-visual system for this project, and how should CMPLX iT integrate that design into the technology model for coordination?",
  },
  {
    key: "security_access_doors",
    bank: "kickoff",
    section_key: "access_control",
    section_name: "Access control",
    sort_order: 12,
    system_keys: ["security"],
    prompt:
      "Access control will follow the client's specification. Will the client provide a markup of the required doors, or should CMPLX iT take a first pass from the reference drawing set?",
  },
  {
    key: "security_nvr_split",
    bank: "kickoff",
    section_key: "video_surveillance",
    section_name: "Video surveillance",
    sort_order: 13,
    system_keys: ["security"],
    prompt:
      "Confirm the video-surveillance split: who provides cameras and cabling, and who provides the NVR? Will anyone need information from CMPLX iT to calculate NVR storage?",
  },
  {
    key: "security_alarm_sensors",
    bank: "kickoff",
    section_key: "video_surveillance",
    section_name: "Video surveillance",
    sort_order: 14,
    system_keys: ["security"],
    prompt:
      "Where the camera or NVR platform also acts as the burglar alarm, does the system require other sensors, such as door position or glass break?",
  },
  {
    key: "security_alarm_monitoring",
    bank: "kickoff",
    section_key: "video_surveillance",
    section_name: "Video surveillance",
    sort_order: 15,
    system_keys: ["security"],
    prompt:
      "Does the burglar alarm need to call out to emergency services or a third-party monitoring service?",
  },
];

export function systemKeysFromBrief(
  systems: readonly { key: string; category_keys: readonly string[] }[],
  items: readonly { category_key: string; in_scope: boolean }[],
): string[] {
  const on = new Set(items.filter((item) => item.in_scope).map((item) => item.category_key));
  return systems
    .filter((system) => system.category_keys.some((key) => on.has(key)))
    .map((system) => system.key);
}

export function questionIsVisible(
  question: { system_keys: readonly string[] },
  inScope: ReadonlySet<string>,
): boolean {
  return question.system_keys.some((key) => inScope.has(key));
}

export function exportAnswerText(body: string): string {
  const trimmed = body.trim();
  return trimmed || "No answer yet.";
}

export function kickoffDocxFilename(projectName: string): string {
  const safe = projectName.replace(/[^\w\s.—-]+/g, "").trim().slice(0, 80);
  return `${safe || "Project"} — kickoff questionnaire.docx`;
}
