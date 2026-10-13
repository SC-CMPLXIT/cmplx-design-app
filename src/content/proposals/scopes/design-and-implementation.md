# Scope List — Technology Design & Implementation (IT, AV, Physical Security, Network)

> **Source:** Claude conversation `63578d9c` — "AV installation scope and exclusions review" (2026-02-13). Extracted from the final generator script `generate_it_av_sec_net` (text of the .docx deliverable). Design + implementation version; superseded for implementation-only work by technology-implementation-it-av-sec-net.md.

---

**Technology Design & Implementation Services**

IT Infrastructure, Audio Visual, Physical Security & Network

[Property Name] | [Date]

**Scope includes:**

**Discovery & Project Coordination**

- Meet with the client team to discern their technical requirements across IT infrastructure, audio visual, physical security, and network systems.
- Attend focused design meetings with Architect, MEP, and other project team members.
  - Lead or participate in page turn and design review meetings.
  - Review brand standards, management company requirements, and operator technology specifications for compliance.
- Coordinate technology infrastructure requirements (power, data, conduit, pathways, cooling) with MEP engineer, architect, and general contractor.
- Review architectural and MEP drawings for technology impacts and issue comments during each design phase (SD, DD, CD).
- Attend regular OAC and trade coordination meetings as the owner’s technology representative.

**IT Infrastructure**

**IT Room Design & Coordination**

- IT/Telecom room layout design including rack placement, hot/cold aisle configuration, and coordination of services.
  - Rack elevations and equipment placement drawings for MDF, IDF, and satellite closets.
  - Termination schedules and patch panel assignments.
  - Power requirements including dedicated circuits, UPS sizing, and PDU specifications.
  - Cooling and ventilation requirements and coordination with MEP for supplemental HVAC.
  - Physical security requirements for IT rooms (access control, monitoring).
  - Grounding and bonding requirements per TIA-607 standards.

**Carrier & ISP Infrastructure**

- Carrier infrastructure design for ISP service delivery into the property.
  - Demarc location, pathway, and conduit design from building entry to MDF.
  - ISP circuit recommendations including primary and redundant connections, bandwidth sizing, and SLA requirements.
  - Carrier coordination for circuit ordering, installation scheduling, and turn-up testing.

**Structured Cabling Plant**

- Fiber and copper structured cabling plant design.
  - Fiber backbone design including strand count, fiber type (single-mode/multimode), and pathway routing between telecom rooms.
  - Horizontal copper cabling design including cable category specification, home run lengths, and outlet placement.
  - Cable pathway design including conduit, cable tray, J-hooks, sleeves, and riser pathways.
  - Outlet and faceplate specifications by room type and use case.
  - Labeling and color-coding standards for cables, outlets, and patch panels.
  - Testing and certification requirements (Fluke or equivalent) for all installed cabling.

**Infrastructure Requirements**

- Conduit, electrical boxes, and pathway requirements for all IT infrastructure.
  - Dedicated electrical circuit and receptacle specifications for telecom rooms and equipment locations.
  - Floor box and in-furniture pathway requirements for workstations and conference tables.
  - Above-ceiling pathway coordination for cable tray and conduit routing.
  - Fire stopping and sleeve requirements at all rated wall and floor penetrations.

**Server, Switching & Core Equipment**

- Network switch specification and port density calculations for each telecom room.
  - PoE budget calculations and switch sizing for powered devices (APs, cameras, phones, displays).
  - Server and compute requirements for on-premise applications (PMS, POS, VMS, etc.).
  - Firewall and security appliance specification and placement.
  - Network management and monitoring platform recommendations.
  - Equipment rack and cabinet specification including depth, RU count, power distribution, and cable management.

**Audio Visual Systems**

**Conference & Meeting Rooms**

- AV system design for conference rooms, boardrooms, and huddle spaces.
  - Display specification and placement including sizing calculations based on AVIXA/InfoComm viewing distance standards.
  - Video conferencing system design including cameras, microphones, speakers, codecs, and USB/BYOD connectivity.
  - Projection system design including projector specification, screen sizing, throw distance calculations, and ambient light considerations.
  - Wireless presentation and content sharing system specification (ClickShare, Crestron AirMedia, Mersive).
  - Conference room acoustic treatment recommendations.
  - Table connectivity design including cable cubby/pocket specifications, floor box requirements, and cable management.

**Ballroom, Event & Multi-Purpose Spaces**

- AV system design for ballrooms, event spaces, and divisible multi-purpose rooms.
  - Distributed audio system design including speaker models, locations, zone configuration, and amplifier sizing.
  - Projection and display design for presentation, digital signage, and event support.
  - Portable and rigging infrastructure for event production (power drops, signal plates, rigging points).
  - Room combining and dividing system design for divisible spaces including partition sensors and automatic system reconfiguration.
  - Stage lighting and theatrical dimming system coordination.
  - Assistive listening system design per ADA requirements.

**Public Areas & Food & Beverage**

- Background music and paging system design for lobbies, restaurants, bars, pools, and common areas.
  - Speaker models and locations with coverage calculations.
  - Music source and streaming platform specification.
  - Zone configuration and volume control design.
  - Digital signage display specification for lobby, wayfinding, menu boards, and elevator cabs.
  - Outdoor audio and weather-rated equipment specification for pools, patios, and rooftop venues.
  - Video distribution system design for bars and sports viewing areas (IPTV, CATV, matrix switching).

**Control Systems**

- Control system specification and platform selection (Crestron, Q-SYS, Extron, Biamp).
  - Control processor placement and location design.
  - Touch panel specification, interface design, and user experience layout.
  - System programming scope definition and narrative.
  - Scheduling and room booking system integration (EMS, Robin, Appspace).
  - Remote monitoring and management system design.
  - Control system network requirements including dedicated VLAN and port assignments.

**AV Infrastructure & IT Room Requirements**

- AV system cabling requirements including signal types, cable specifications, and maximum run lengths.
  - Infrastructure requirements for AV systems:
    - Conduit, electrical boxes, pathways, back boxes, and in-wall rough-in.
  - Power requirements at AV equipment locations and in IT rooms.
  - AV equipment rack placement and space allocation in IT/telecom rooms.
  - Rack elevations showing AV equipment, signal processors, amplifiers, and network switches.
  - Heat load calculations for AV equipment in enclosed racks and rooms.
  - Define requirements for additional system inputs (aux inputs, wall plates, tie lines).

**Physical Security & Access Control**

**Video Surveillance (CCTV)**

- Video surveillance system design and camera placement plan.
  - Camera specification by location including type (fixed, PTZ, multi-sensor), resolution, lens, and housing.
  - Field of view calculations and coverage maps for all surveilled areas.
  - Camera placement for key areas: entrances/exits, parking, loading dock, elevators, corridors, pool, F&B, back-of-house, and cash handling.
  - License plate recognition (LPR) camera specification and placement for parking and vehicle entry.
  - Video analytics specification including motion detection, line crossing, loitering, people counting, and facial detection.
  - Low-light and specialty camera requirements for exterior, garage, and stairwell applications.

**Video Management System (VMS)**

- VMS platform specification and selection (Genetec, Milestone, Avigilon, Verkada).
  - Server and storage sizing calculations based on camera count, resolution, frame rate, and retention policy.
  - Client workstation specification for security operations center (SOC) and remote viewing.
  - Video wall and multi-monitor display design for SOC.
  - Remote and mobile viewing requirements and configuration.
  - Video export, evidence management, and incident workflow design.
  - Cloud vs. on-premise vs. hybrid VMS deployment model advisory.

**Access Control**

- Access control system design and door schedule.
  - Door hardware specification including lock type (electric strike, mag lock, electrified mortise), request-to-exit devices, and door position switches.
  - Reader specification and placement by location including credential type (key card, mobile, biometric, PIN).
  - Controller architecture design including panel locations, reader capacity, and communication topology.
  - Door elevation drawings with hardware placement details.
  - Access level and cardholder group configuration planning.
  - Elevator floor access control integration and cab reader placement.
  - Integration with PMS and guest digital key systems for unified credential management.
  - Visitor management system evaluation and integration.

**Intrusion Detection & Alarm Monitoring**

- Intrusion detection system design for perimeter, high-value areas, and after-hours zones.
  - Sensor specification and placement (door/window contacts, motion detectors, glass break, duress buttons).
  - Alarm panel specification and zone configuration.
  - Central station monitoring integration and communication path design.
  - Alarm event correlation between intrusion, access control, and video systems.

**Emergency & Life Safety Integration**

- Emergency notification and mass communication system advisory.
  - Fire alarm interface design for door release, elevator recall, and CCTV event triggering.
  - Lockdown and emergency response procedure integration with access control.
  - Emergency phone and intercom system specification and placement.
  - Coordination with fire protection engineer and AHJ for code compliance.

**Security Infrastructure & IT Room Requirements**

- System cabling requirements including cable type, PoE class, and maximum run lengths.
  - Infrastructure requirements for security systems:
    - Conduit, electrical boxes, pathways, and junction box placement.
  - IT room requirements and rack elevations for security servers, NVRs, panels, and network switches.
  - PoE switch sizing and port budget calculations for cameras and access control devices.
  - Dedicated VLAN and network segmentation design for security systems.
  - Cybersecurity hardening requirements for security devices on the network.
  - UPS and power redundancy requirements for security systems.

**Network Design & Implementation**

**Network Architecture**

- Network topology design including core, distribution, and access layers.
  - VLAN architecture and segmentation strategy for all property systems (guest, admin, POS, IPTV, security, BMS, AV, VoIP).
  - Inter-VLAN routing and firewall rule design.
  - Quality of Service (QoS) policy design for traffic prioritization (voice, video, signage, POS transactions).
  - Redundancy and high-availability design including link aggregation, spanning tree, and failover paths.
  - Network addressing and DHCP scope design per VLAN.
  - DNS, NTP, and RADIUS/802.1X authentication design.

**Wireless Network**

- Provide Predictive Wireless Access Point Study for guest rooms, public areas, meeting spaces, and back-of-house.
  - Access point specification, placement, and mounting detail design.
  - Channel planning and RF interference mitigation.
  - Guest Wi-Fi tier structure and bandwidth management design.
  - Captive portal and authentication integration with PMS (ANTlabs, Nomadix, cloud gateway).
  - Wireless LAN controller specification and deployment model (on-premise, cloud-managed).
  - Outdoor wireless coverage for pools, patios, gardens, and event lawns.
  - Site survey coordination and post-installation validation testing.

**Internet & WAN**

- Internet bandwidth sizing based on property size, room count, and concurrent user projections.
  - Primary and redundant ISP circuit specification and failover design.
  - SD-WAN evaluation for multi-property or hybrid cloud environments.
  - VPN and remote access design for vendor support, property management, and corporate connectivity.
  - Content filtering and acceptable use policy implementation advisory.

**Network Security**

- Firewall specification, placement, and rule set design.
  - Network access control (NAC) and device profiling for IoT and operational technology devices.
  - Guest network isolation and containment design.
  - Intrusion detection/prevention system (IDS/IPS) advisory.
  - PCI-DSS network segmentation for payment card environment.
  - Vulnerability scanning and penetration testing coordination.

**Network Monitoring & Management**

- Network management and monitoring platform specification (SNMP, syslog, NetFlow).
  - Alerting and escalation workflow design for network events.
  - Dashboard and reporting requirements for uptime, utilization, and performance metrics.
  - Configuration backup and change management procedures.
  - Vendor support and maintenance contract advisory for network equipment.

**Procurement & Bid Management**

- Design Drawings for IT Infrastructure, Audio Visual, Physical Security, and Network through Construction Drawings.
- Provide an Issue for Bid Bill of Materials for approval that includes a Request for Proposal and Bill of Materials for accurate scope alignment across all technology disciplines.
- Review and level technology bids across all system categories.
- Vendor contract review and negotiation support including scope, schedule, payment terms, warranties, and SLAs.
- Equipment substitution evaluation and approval for discontinued or long-lead items.

**Coordination & Responsibility Matrix**

- Provide a draft responsibility matrix (RACI) to delineate responsibilities between Owner, Consultant, General Contractor, Sub-Contractors, Integrator, and Hotel Operator.
- Develop and maintain the master technology schedule aligned with the construction schedule.
- Conduct regular technology coordination meetings and produce meeting minutes and action item logs.
- Review and approve technology vendor submittals, shop drawings, and RFI responses.
- Perform site visits for installation quality assurance and progress verification.
- Manage the technology budget, tracking committed costs, change orders, and forecasted expenditures against the approved budget.

**Testing, Commissioning & Turnover**

- Develop system-specific test scripts and acceptance criteria for all technology systems.
- Witness and verify vendor system testing and demonstrations.
- Manage technology punch list through resolution and sign-off.
- Integration testing across all connected systems (PMS-to-door locks, POS-to-PMS, IPTV-to-PMS, etc.).
- Network performance validation including throughput testing, latency measurements, and wireless coverage verification.
- Coordinate technology staff training sessions with vendors.
- Review and verify as-built documentation, system manuals, warranty registrations, and login credential packages.
- Post-opening stabilization support for [30/60/90] days following property opening.
