/**
 * Proposal library. Scope files are the CMPLX iT scope-of-services set.
 * Assumptions, exclusions, and the extra term sections are the standard
 * language from the contract and proposal templates, with bracketed
 * placeholders filled (30-day validity, 1-year warranty, 10 business days,
 * 5% cost notice, $500 expense approval, 30-day OFE lead time).
 *
 * Payment milestones and consulting net terms are generated from the draft
 * so a percent on screen cannot drift from a paragraph.
 * The Master Subcontractor Agreement summary is fixed. It is a draft template,
 * not an executed contract.
 */
import designAndImplementation from "../content/proposals/scopes/design-and-implementation.md?raw";
import designServices from "../content/proposals/scopes/design-services.md?raw";
import hospitalityConsulting from "../content/proposals/scopes/hospitality-consulting.md?raw";
import hospitalitySimple from "../content/proposals/scopes/hospitality-simple.md?raw";
import implementation from "../content/proposals/scopes/implementation.md?raw";
import itInfrastructure from "../content/proposals/scopes/it-infrastructure-design.md?raw";
import physicalSecurityDesign from "../content/proposals/scopes/physical-security-design.md?raw";
import physicalSecurityInstall from "../content/proposals/scopes/physical-security-install.md?raw";
import technicalProgram from "../content/proposals/scopes/technical-program-management.md?raw";
import type { ProposalKind } from "./types";

export type ScopeBlock = {
  key: string;
  title: string;
  /** Which proposal lists this block. `both` can be suggested on either. */
  kind: ProposalKind | "both";
  /** Suggested when any of these systems is in scope. Empty means listed, not suggested. */
  systemKeys: readonly string[];
  body: string;
};

export type ClauseBlock = {
  key: string;
  title: string;
  group: "assumption" | "exclusion" | "term";
  body: string;
};

function clientScope(raw: string): string {
  const rule = raw.indexOf("\n---\n");
  let body = rule >= 0 ? raw.slice(rule + 5) : raw;
  const appendix = body.search(/\n---\s*\n+## Appendix/);
  if (appendix >= 0) body = body.slice(0, appendix);
  return body.replace(/^>\s.*$/gm, "").trim();
}

export const SCOPE_BLOCKS: readonly ScopeBlock[] = [
  {
    key: "design_it_av_security",
    title: "Design services: IT, AV, and security",
    kind: "design",
    systemKeys: [
      "it_infrastructure",
      "network_wifi",
      "display_video",
      "audio",
      "conferencing",
      "control",
      "security",
      "carrier_riser",
    ],
    body: clientScope(designServices),
  },
  {
    key: "technical_program_management",
    title: "Technical program management",
    kind: "design",
    systemKeys: ["general"],
    body: clientScope(technicalProgram),
  },
  {
    key: "it_infrastructure_design",
    title: "IT infrastructure consulting and design",
    kind: "design",
    systemKeys: ["it_infrastructure", "carrier_riser", "network_wifi"],
    body: clientScope(itInfrastructure),
  },
  {
    key: "physical_security",
    title: "Physical security design",
    kind: "design",
    systemKeys: ["security"],
    body: clientScope(physicalSecurityDesign),
  },
  {
    key: "physical_security_install",
    title: "Physical security installation",
    kind: "implementation",
    systemKeys: ["security"],
    body: clientScope(physicalSecurityInstall),
  },
  {
    key: "implementation_services",
    title: "Technology implementation services",
    kind: "implementation",
    systemKeys: [
      "it_infrastructure",
      "network_wifi",
      "display_video",
      "audio",
      "conferencing",
      "control",
      "security",
      "carrier_riser",
    ],
    body: clientScope(implementation),
  },
  {
    key: "hospitality_consulting",
    title: "Hospitality technology consulting",
    kind: "design",
    systemKeys: [],
    body: clientScope(hospitalityConsulting),
  },
  {
    key: "hospitality_simple",
    title: "Hospitality technology services",
    kind: "design",
    systemKeys: [],
    body: clientScope(hospitalitySimple),
  },
  {
    key: "design_and_implementation",
    title: "Technology design and implementation",
    kind: "both",
    systemKeys: [],
    body: clientScope(designAndImplementation),
  },
];

export const CLAUSE_BLOCKS: readonly ClauseBlock[] = [
  {
    key: "general_assumptions",
    title: "General project assumptions",
    group: "assumption",
    body: [
      "This proposal is based on the scope of work, drawings, and specifications provided at the time of submission. Any change to the scope, design intent, or project requirements after acceptance may result in additional cost through a formal change order.",
      "Work is performed during normal business hours (Monday through Friday, 8:00 AM to 5:00 PM local time) unless otherwise agreed in writing. Overtime, weekend, holiday, or shift work is excluded and will be quoted separately if required.",
      "This proposal assumes unimpeded access to the work areas during scheduled periods. Delays caused by other trades, restricted access, or site conditions not disclosed at the time of proposal are addressed through change orders.",
      "The client designates a single point of contact with decision-making authority for the duration of the project.",
      "This proposal assumes the project is awarded in its entirety. Pricing is not valid for a partial award unless separately quoted.",
      "Design documents, system narratives, riser diagrams, equipment schedules, and control interface layouts require written approval before CMPLX iT proceeds to the next phase. Revisions after that approval are additional services.",
      "This proposal is valid for 30 days from the date of issue. Material and labor pricing may change after that date.",
    ].join("\n"),
  },
  {
    key: "facility_readiness",
    title: "Facility readiness assumptions",
    group: "assumption",
    body: [
      "Work areas shall be broom-clean, climate-controlled, and free of active construction debris before technology installation starts.",
      "Permanent power shall be available and energized at the designated equipment locations before installation. Power for technology equipment shall be clean, conditioned power on dedicated circuits as specified in the design documents.",
      "Ceiling grids, drywall, flooring, and architectural finishes in the work areas shall be substantially complete before technology installation, unless rough-in phasing has been mutually agreed.",
      "Conference and meeting spaces should achieve a noise criterion (NC) of 35 dBA or less and a reverberation time (RT60) under 0.6 seconds in the 125 Hz to 4,000 Hz octave bands. Ambient light on participants' faces should be evenly distributed at 40 to 50 foot-candles within the camera field of view.",
      "Network infrastructure, including switches, patch panels, and active ports with the appropriate VLAN and QoS configuration, shall be installed, tested, and operational before technology commissioning, unless that network work is in this scope.",
      "Furniture, millwork, and architectural elements referenced in the design shall be installed and in final position before trim-out and commissioning, unless otherwise coordinated.",
      "Cable pathways, including conduits, raceways, floor boxes, and above-ceiling pathways, shall be installed and accessible per the approved design before cable is pulled.",
    ].join("\n"),
  },
  {
    key: "design_approvals",
    title: "Design approvals and change orders",
    group: "assumption",
    body: [
      "After the programming requirements meeting, CMPLX iT provides screenshots or mockups of proposed touch-panel layouts and control interfaces. Those stand as the functional narrative and need the client's written approval before programming starts. Further submittal rounds beyond that review are additional services.",
      "Changes to the approved scope, equipment selections, room configurations, or design intent after written approval go through a formal change order, priced at CMPLX iT's then-current rates, and need written approval before the work proceeds.",
      "Ownership of deliverables and of CMPLX iT background intellectual property is the Master Subcontractor Agreement summary in the Agreement section of this proposal.",
    ].join("\n"),
  },
  {
    key: "electrical_exclusions",
    title: "Electrical and low-voltage exclusions",
    group: "exclusion",
    body: [
      "Provision or installation of conduits, raceways, junction boxes, high-voltage wiring, panels, breakers, relays, receptacles, or any related electrical work, including 110/208/220 VAC power circuits.",
      "Electrical permits, inspections, and code-compliance certification for high-voltage work.",
      "Dedicated circuit provisioning and labeling, unless explicitly included in the scope of work.",
      "UPS or power-conditioning equipment beyond what is specified in the equipment schedule.",
      "Voice and data cabling, including analog phone lines, ISDN, fiber, and horizontal copper to network ports, unless network infrastructure is included as its own scope item.",
    ].join("\n"),
  },
  {
    key: "network_exclusions",
    title: "Network and IT infrastructure exclusions",
    group: "exclusion",
    body: [
      "Network connectivity, routing, switching, port configuration, VLAN provisioning, QoS, firewall rules, and IP address management for audiovisual, unified communications, and video-conferencing equipment, unless explicitly included as a separate scope item.",
      "Configuration or management of third-party cloud services, SaaS platforms, or manufacturer-hosted portals, unless specified in the scope of work.",
      "Software licensing, subscriptions, and renewals for video conferencing, digital signage, room booking, or other software-dependent systems, unless specified in the scope of work.",
      "Wireless access-point installation, configuration, or survey work, unless explicitly included in the scope of work.",
      "Cybersecurity assessments, penetration testing, or network vulnerability scanning.",
    ].join("\n"),
  },
  {
    key: "architectural_exclusions",
    title: "Structural and architectural exclusions",
    group: "exclusion",
    body: [
      "Rough-in, bracing, framing, blocking, or finish trim carpentry for equipment.",
      "Drywall replacement, repair, or patching.",
      "Painting, patching, or finishing of architectural surfaces.",
      "Furniture, millwork, or cabinetry modifications, including cut-ins and finish work.",
      "Platforms, custom mounting fixtures, or structural supports beyond standard manufacturer mounting hardware.",
      "Firewall, ceiling, roof, and floor penetrations, patching, removal, or firestopping.",
      "Concrete trenching, saw cutting, and core drilling.",
      "Facility X-rays or structural scanning that may be required before penetrations.",
      "HVAC relocation, modification, or supplemental cooling for equipment rooms or racks.",
      "Plumbing relocation or modification.",
      "Modifications to lighting or lighting-control systems, or fixture relocation, unless explicitly included in the scope of work.",
      "Any finish other than the standard factory finish on installed equipment.",
    ].join("\n"),
  },
  {
    key: "ofe",
    title: "Owner-furnished equipment",
    group: "exclusion",
    body: [
      "This proposal does not include integration of owner-furnished equipment unless that equipment is named in the scope and on the equipment schedule.",
      "Owner-furnished equipment shall arrive new or fully functional, with original packaging, accessories, mounting hardware, and documentation. CMPLX iT is not responsible for repair, replacement, or warranty of that equipment.",
      "The client provides a complete inventory, including model numbers, serial numbers, and firmware versions, at least 30 days before the scheduled installation.",
      "CMPLX iT will list the accessories, brackets, cables, adapters, and licenses required to mount and connect owner-furnished equipment. The client procures those items unless otherwise agreed.",
      "Repairs, firmware updates, or configuration required to make owner-furnished equipment usable may be a change order at CMPLX iT's then-current rates.",
      "CMPLX iT's warranty and performance statements do not extend to owner-furnished equipment, or to performance lost because of it.",
    ].join("\n"),
  },
  {
    key: "labor_logistics",
    title: "Labor and logistics",
    group: "term",
    body: [
      "This proposal is based on non-prevailing-wage, non-union labor unless otherwise specified. If the project requires union labor, prevailing wage, or certified payroll, pricing will be adjusted.",
      "Overtime, weekend, holiday, or shift-differential work is excluded. If the client or the schedule requires it, overtime is quoted separately.",
      "The client provides a secure, lockable storage room for the installation, sized for equipment staging and on the same floor as the primary work, accessible only to authorized client personnel and CMPLX iT.",
      "Composite cleanup and debris removal beyond packaging from this scope is excluded.",
      "Mobilization and demobilization are included for a single mobilization. Further mobilizations caused by site readiness or schedule changes may be additional.",
      "If conference or meeting tables are movable rather than fixed, the client provides the floor boxes defined in the design. Disconnect hardware for movable furniture is quoted in addition.",
    ].join("\n"),
  },
  {
    key: "workmanship",
    title: "Workmanship standards",
    group: "term",
    body: [
      "Work by CMPLX iT or its subcontractors is executed in a professional, neat, and workmanlike manner consistent with AVIXA, BICSI, TIA, NEC, and NFPA.",
      "Equipment is installed to the manufacturer's guidelines. A voided warranty caused by ignoring those procedures is the installing party's responsibility.",
      "Cable installation meets or exceeds TIA-568 and BICSI. Cables are dressed, supported, labeled, and terminated, keep minimum bend radius, avoid electromagnetic interference, and use approved pathways.",
      "Racks are plumb and level, with consistent dressing, cable management, clear labels, and service loops at terminations.",
      "Visible work in guest and public areas is finished to a hospitality standard. Exposed hardware, cabling, conduit, or mounting hardware is not acceptable unless the design documents approve it.",
      "Installations comply with applicable local, state, and federal codes, including NEC, NFPA, ADA, and the authority having jurisdiction. CMPLX iT obtains or coordinates permits and inspections for its own scope unless the proposal says otherwise.",
      "CMPLX iT may inspect and reject substandard work by its subcontractors or vendors before acceptance. The client has the same right.",
      "Work that does not conform to the approved documents, the manufacturer guidelines, or these standards is corrected at no additional cost within a time both parties agree.",
      "CMPLX iT keeps photographic documentation of concealed infrastructure before other trades close it in, and includes that record in closeout.",
      "Structured cabling is tested and certified with industry-standard equipment. Results are part of closeout.",
      "Work areas are kept clean. Packaging and waste from this scope are removed daily.",
    ].join("\n"),
  },
  {
    key: "insurance",
    title: "Insurance, bonds, and compliance",
    group: "term",
    body: [
      "This proposal assumes a standard agreement, or terms the parties agree, without liquidated damages or penalties.",
      "Contractor-controlled and owner-controlled insurance programs are excluded. If participation is required, the cost is quoted.",
      "Payment and performance bonds are excluded unless specified. If required, the bond cost is added.",
      "Taxes, tariffs, permits, and inspection fees are excluded unless stated. Where they are included, a later change in rate is passed through with documentation and at least 10 business days' written notice.",
      "CMPLX iT carries commercial general liability, professional liability, and workers' compensation insurance. Certificates are provided on request.",
    ].join("\n"),
  },
  {
    key: "warranty",
    title: "Warranty and liability",
    group: "term",
    body: [
      "CMPLX iT provides a one-year labor warranty on installed systems, starting at substantial completion or client acceptance, whichever is first. Manufacturer warranties follow each manufacturer's terms.",
      "Warranty service is during normal business hours. After-hours or emergency warranty service is additional unless an extended service agreement is in place.",
      "CMPLX iT's liability is limited to the contract value of its scope. CMPLX iT is not liable for indirect, incidental, consequential, or punitive damages from system performance, downtime, or delay.",
      "The warranty does not cover misuse, unauthorized modification, power surges, conditions outside manufacturer specifications, or acts of God.",
      "Performance statements depend on the client keeping the facility conditions in the facility-readiness assumptions, including acoustics, lighting, and network performance.",
    ].join("\n"),
  },
  {
    key: "supply_chain",
    title: "Supply chain and pricing",
    group: "term",
    body: [
      "Equipment pricing is the unit MSRP entered on this proposal, based on manufacturer list pricing and availability at issue. CMPLX iT will write within 10 business days if material cost rises by more than 5% because of tariffs, supply chain disruption, or a manufacturer price change, and will document the difference.",
      "Schedules follow current product availability. CMPLX iT will say promptly when a delay is expected and will look for an alternative or a schedule change with the client.",
      "A substitution because a product is discontinued or the lead time is too long is proposed for written approval before it is ordered. The substitute is equal or better specification, at the closest available price.",
      "The hardware total on this proposal is quantity times the unit MSRP entered for each line. Lines without an MSRP are listed and left out of the total. This draft does not add a markup.",
    ].join("\n"),
  },
  {
    key: "payment_conditions",
    title: "Payment conditions",
    group: "term",
    body: [
      "If an invoice remains unpaid more than 15 days past its due date, CMPLX iT may suspend work on 5 business days' written notice. Work resumes within 5 business days after the outstanding amount is received. Schedule impact from that suspension is the client's, and may include a remobilization charge.",
      "Where CMPLX iT is a subcontractor to a general contractor, retention shall not exceed 10% of each progress payment, and retention is released within 30 days of substantial completion of CMPLX iT's scope, regardless of other trades. Pay-if-paid and pay-when-paid are not accepted unless agreed in writing.",
      "The client does not withhold, offset, or deduct from a CMPLX iT invoice for claims about other trades unless agreed in writing. A dispute about an invoice is sent in writing within 10 business days of receipt. Undisputed amounts stay due on the original terms.",
      "Final payment, including retention, is due within 30 days of substantial completion of CMPLX iT's scope and delivery of closeout. CMPLX iT may withhold system passwords, control source code, and as-built documentation until final payment is received.",
      "If the client cancels after execution, work completed, materials ordered or received, and reasonable restocking or cancellation charges are invoiced and due within 30 days. A deposit already paid is non-refundable and is applied to amounts owed.",
    ].join("\n"),
  },
];

export const AGREEMENT_PARAGRAPHS: readonly string[] = [
  "The terms of this proposal are subject to the CMPLX iT Master Subcontractor Agreement. That agreement is a draft template. This proposal is not an executed contract, and signing it does not execute the agreement.",
  "When CMPLX iT is engaged as subcontractor, undisputed fees are due within 15 days of the invoice. CMPLX iT retains its background intellectual property. Background intellectual property is not work made for hire and is not assigned. Drawings, specifications, and other materials prepared as deliverables become the client's property only after full payment of the fees and expenses for those deliverables.",
  "The draft agreement permits CMPLX iT to use artificial-intelligence tools while performing the services. Those tools, including modifications to them, remain CMPLX iT background intellectual property. CMPLX iT takes measures designed to protect confidential information when using them.",
];

export function scopeBlocksFor(kind: ProposalKind): ScopeBlock[] {
  return SCOPE_BLOCKS.filter((block) => block.kind === kind || block.kind === "both");
}

export function suggestedScopeKeys(kind: ProposalKind, inScope: ReadonlySet<string>): string[] {
  return scopeBlocksFor(kind)
    .filter(
      (block) =>
        block.systemKeys.length > 0 && block.systemKeys.some((key) => inScope.has(key)),
    )
    .map((block) => block.key);
}

/**
 * Keys that belong on this proposal kind. A saved implementation draft may
 * still say `physical_security` from before that block was design-only; show
 * the installation block until the editor saves the new key.
 */
export function scopeKeysForKind(kind: ProposalKind, keys: readonly string[]): string[] {
  const allowed = new Set(scopeBlocksFor(kind).map((block) => block.key));
  const seen = new Set<string>();
  const next: string[] = [];
  for (const key of keys) {
    const mapped = kind === "implementation" && key === "physical_security" ? "physical_security_install" : key;
    if (!allowed.has(mapped) || seen.has(mapped)) continue;
    seen.add(mapped);
    next.push(mapped);
  }
  return next;
}

export function clausesFor(group: ClauseBlock["group"]): ClauseBlock[] {
  return CLAUSE_BLOCKS.filter((block) => block.group === group);
}

export function defaultClauseKeys(group: ClauseBlock["group"]): string[] {
  return clausesFor(group).map((block) => block.key);
}

export type ProposalTextBlock = {
  kind: "heading" | "bullet" | "paragraph";
  text: string;
  level: number;
};

export function proposalTextBlocks(body: string): ProposalTextBlock[] {
  const blocks: ProposalTextBlock[] = [];
  for (const line of body.split("\n")) {
    if (!line.trim()) continue;
    const heading = /^(#{1,4})\s+(.*)$/.exec(line.trim());
    if (heading) {
      blocks.push({
        kind: "heading",
        text: heading[2].replace(/\*\*/g, ""),
        level: heading[1].length,
      });
      continue;
    }
    const bullet = /^(\s*)[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      const depth = Math.min(3, Math.floor(bullet[1].replace(/\t/g, "  ").length / 2));
      blocks.push({
        kind: "bullet",
        text: bullet[2].replace(/\*\*/g, ""),
        level: depth,
      });
      continue;
    }
    blocks.push({
      kind: "paragraph",
      text: line.trim().replace(/\*\*/g, ""),
      level: 0,
    });
  }
  return blocks;
}
