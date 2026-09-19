/** Standard-15 hospitality-tech checklist. Kept in code and seeded in the DB. */
export const TECHNOLOGY_CATEGORIES = [
  { key: "structured_cabling", name: "Structured cabling & backbone" },
  { key: "network_core", name: "Network core & switching" },
  { key: "wireless", name: "Wireless (guest & staff)" },
  { key: "pms", name: "Property management system (PMS)" },
  { key: "pos", name: "Point of sale (POS)" },
  { key: "access_control", name: "Access control & locks" },
  { key: "cctv", name: "CCTV & security" },
  { key: "iptv", name: "IPTV / in-room entertainment" },
  { key: "av_events", name: "AV (events & meeting rooms)" },
  { key: "audio_bgm", name: "Audio / BGM / paging" },
  { key: "telephony", name: "Telephony / VoIP" },
  { key: "digital_signage", name: "Digital signage" },
  { key: "bms", name: "Building systems (BMS / lighting)" },
  { key: "guest_app", name: "Guest app / digital concierge" },
  { key: "staff_systems", name: "Staff comms & back-of-house systems" },
] as const;

export type CategoryKey = (typeof TECHNOLOGY_CATEGORIES)[number]["key"];
