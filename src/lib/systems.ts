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
 * Keep this file in sync with db/006_kickoff.sql (systems and kickoff
 * questions) and db/007_discovery.sql (discovery questions).
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
 * Shared scope checklist. `applies_to` says where a system shows:
 * project-level kickoff, the per-space discovery checklist, or both.
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

/**
 * Per-space discovery bank. A question shows on a space when one of its
 * systems is in scope and that system applies to a space (`space` or `both`).
 * Prompts are generic — they follow the usual room checklist (image, sound,
 * meetings, control, network, security, acoustics) without a client write-up.
 */
export const DISCOVERY_QUESTIONS: readonly KickoffQuestionDefinition[] = [
  {
    key: "it_drops",
    bank: "discovery",
    section_key: "it_infrastructure",
    section_name: "IT infrastructure",
    sort_order: 101,
    system_keys: ["it_infrastructure"],
    prompt:
      "How many wired outlets does this space need, and where do they land (desk, display, table, floor box, equipment)? Who pulls the cable?",
  },
  {
    key: "it_pathway",
    bank: "discovery",
    section_key: "it_infrastructure",
    section_name: "IT infrastructure",
    sort_order: 102,
    system_keys: ["it_infrastructure"],
    prompt:
      "How does cable enter this space — floor, ceiling, furniture, or wall — and is that pathway already drawn?",
  },
  {
    key: "it_equipment",
    bank: "discovery",
    section_key: "it_infrastructure",
    section_name: "IT infrastructure",
    sort_order: 103,
    system_keys: ["it_infrastructure"],
    prompt:
      "Where does the equipment for this space live (in the room, in millwork, or in an IT room), and what power, heat, and clearance does that location need?",
  },
  {
    key: "network_ap",
    bank: "discovery",
    section_key: "network_wifi",
    section_name: "Network / Wi-Fi",
    sort_order: 104,
    system_keys: ["network_wifi"],
    prompt:
      "Where should a wireless access point go in this space, and what ceiling or finish does it have to meet?",
  },
  {
    key: "network_coverage",
    bank: "discovery",
    section_key: "network_wifi",
    section_name: "Network / Wi-Fi",
    sort_order: 105,
    system_keys: ["network_wifi"],
    prompt:
      "Is everyday coverage enough, or does this space need signal inside an enclosure (glass, a booth) or extra density for an event?",
  },
  {
    key: "network_wireless_devices",
    bank: "discovery",
    section_key: "network_wifi",
    section_name: "Network / Wi-Fi",
    sort_order: 106,
    system_keys: ["network_wifi"],
    prompt:
      "Which devices here belong on wireless rather than a cable — handhelds, fitness equipment, signage players, or something else?",
  },
  {
    key: "display_purpose",
    bank: "discovery",
    section_key: "display_video",
    section_name: "Display / video",
    sort_order: 107,
    system_keys: ["display_video"],
    prompt:
      "What should people see here: a single display, a video wall, projection, digital signage, or no image? What is the content for?",
  },
  {
    key: "display_location",
    bank: "discovery",
    section_key: "display_video",
    section_name: "Display / video",
    sort_order: 108,
    system_keys: ["display_video"],
    prompt:
      "Where does that image sit, what size fits the wall or millwork, and how is the display serviced (structure, recess, ventilation, access)?",
  },
  {
    key: "display_sources",
    bank: "discovery",
    section_key: "display_video",
    section_name: "Display / video",
    sort_order: 109,
    system_keys: ["display_video"],
    prompt:
      "How does content arrive: a wired input, wireless presentation, a player or content system, or a mix? Who supplies the content?",
  },
  {
    key: "display_sightlines",
    bank: "discovery",
    section_key: "display_video",
    section_name: "Display / video",
    sort_order: 110,
    system_keys: ["display_video"],
    prompt:
      "Who has to see the image, from where, and does the plan already show power and data at that spot?",
  },
  {
    key: "audio_role",
    bank: "discovery",
    section_key: "audio",
    section_name: "Audio",
    sort_order: 111,
    system_keys: ["audio"],
    prompt:
      "Is this space background music, paging, speech reinforcement, a quiet zone, or no audio? Does it share a source and volume with its neighbors?",
  },
  {
    key: "audio_speakers",
    bank: "discovery",
    section_key: "audio",
    section_name: "Audio",
    sort_order: 112,
    system_keys: ["audio"],
    prompt:
      "Where can speakers go given the ceiling and finishes, and do they need a moisture, impact, or heat rating?",
  },
  {
    key: "audio_inputs",
    bank: "discovery",
    section_key: "audio",
    section_name: "Audio",
    sort_order: 113,
    system_keys: ["audio"],
    prompt:
      "Are live inputs required (a microphone, a presenter laptop, a music service)? Is a consumer platform acceptable, or does the use need a commercial system?",
  },
  {
    key: "audio_control",
    bank: "discovery",
    section_key: "audio",
    section_name: "Audio",
    sort_order: 114,
    system_keys: ["audio"],
    prompt: "Who changes volume and source, and is there a control in the space itself?",
  },
  {
    key: "conferencing_mode",
    bank: "discovery",
    section_key: "conferencing",
    section_name: "Conferencing",
    sort_order: 115,
    system_keys: ["conferencing"],
    prompt:
      "Is this a video-meeting room, a bring-your-own-device room, content only, or not a meeting space? Which meeting platform is the standard?",
  },
  {
    key: "conferencing_capture",
    bank: "discovery",
    section_key: "conferencing",
    section_name: "Conferencing",
    sort_order: 116,
    system_keys: ["conferencing"],
    prompt:
      "What camera and microphone coverage does the seating need — a video bar, a front-of-room camera, ceiling microphones, table microphones?",
  },
  {
    key: "conferencing_hybrid",
    bank: "discovery",
    section_key: "conferencing",
    section_name: "Conferencing",
    sort_order: 117,
    system_keys: ["conferencing"],
    prompt:
      "Do people in the room need voice lift, and will remote participants, a recording, or a stream join?",
  },
  {
    key: "conferencing_cabling",
    bank: "discovery",
    section_key: "conferencing",
    section_name: "Conferencing",
    sort_order: 118,
    system_keys: ["conferencing"],
    prompt:
      "Where do a laptop connection and any table cables land, and is a floor box, wall plate, or furniture feed already on the plan?",
  },
  {
    key: "control_panel",
    bank: "discovery",
    section_key: "control",
    section_name: "Control",
    sort_order: 119,
    system_keys: ["control"],
    prompt:
      "What should an occupant control here (sources, volume, lighting, shades, a preset), and from where (table, wall, door)?",
  },
  {
    key: "control_schedule",
    bank: "discovery",
    section_key: "control",
    section_name: "Control",
    sort_order: 120,
    system_keys: ["control"],
    prompt:
      "Is a scheduling panel or an in-use indicator needed outside the room, and who runs the space day to day?",
  },
  {
    key: "control_building",
    bank: "discovery",
    section_key: "control",
    section_name: "Control",
    sort_order: 121,
    system_keys: ["control"],
    prompt:
      "Should lighting, shades, or another building system follow the room control, and who owns that interface?",
  },
  {
    key: "security_entry",
    bank: "discovery",
    section_key: "security",
    section_name: "Security",
    sort_order: 122,
    system_keys: ["security"],
    prompt:
      "Who may enter, on what credential, and during which hours? Does the door need a reader, a lock, or an intercom?",
  },
  {
    key: "security_cameras",
    bank: "discovery",
    section_key: "security",
    section_name: "Security",
    sort_order: 123,
    system_keys: ["security"],
    prompt:
      "Is a camera appropriate here? Call out privacy uses — restroom, treatment, changing, wellness — where a camera must not be placed or aimed.",
  },
  {
    key: "security_monitoring",
    bank: "discovery",
    section_key: "security",
    section_name: "Security",
    sort_order: 124,
    system_keys: ["security"],
    prompt:
      "Who watches the image, how long is it kept, and does this space need an emergency call or alarm device?",
  },
  {
    key: "security_desk",
    bank: "discovery",
    section_key: "security",
    section_name: "Security",
    sort_order: 125,
    system_keys: ["security"],
    prompt:
      "Does this space include a staffed desk, a visitor process, or an after-hours unlock?",
  },
  {
    key: "acoustics_privacy",
    bank: "discovery",
    section_key: "acoustics",
    section_name: "Acoustics",
    sort_order: 126,
    system_keys: ["acoustics"],
    prompt:
      "What speech privacy or noise isolation does this space need from its neighbors, and who is specifying it?",
  },
  {
    key: "acoustics_finishes",
    bank: "discovery",
    section_key: "acoustics",
    section_name: "Acoustics",
    sort_order: 127,
    system_keys: ["acoustics"],
    prompt:
      "Which finishes (glass, stone, wood, an open ceiling) will fight speakers, microphones, or privacy, and where can treatment go?",
  },
  {
    key: "acoustics_masking",
    bank: "discovery",
    section_key: "acoustics",
    section_name: "Acoustics",
    sort_order: 128,
    system_keys: ["acoustics"],
    prompt:
      "Is sound masking in scope, and is the goal privacy for the people inside, for the people outside, or both?",
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

/** Systems that can appear on a per-space discovery checklist. */
export function systemAppliesToSpace(appliesTo: SystemAppliesTo): boolean {
  return appliesTo === "space" || appliesTo === "both";
}

export function exportAnswerText(body: string): string {
  const trimmed = body.trim();
  return trimmed || "No answer yet.";
}

export function kickoffDocxFilename(projectName: string): string {
  const safe = projectName.replace(/[^\w\s.—-]+/g, "").trim().slice(0, 80);
  return `${safe || "Project"} — kickoff questionnaire.docx`;
}
