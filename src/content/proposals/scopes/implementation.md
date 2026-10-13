# Scope List — Technology Implementation Services (IT, AV, Physical Security, Network; no design)

> **Source:** Claude conversation `63578d9c` — "AV installation scope and exclusions review" (2026-02-13). Extracted from the final generator script `generate_implementation` (text of the .docx deliverable). Final version in the chat (design language removed).

---

**Technology Implementation Services**

IT Infrastructure, Audio Visual, Physical Security & Network

[Property Name] | [Date]

**Scope includes:**

**Pre-Implementation Coordination**

- Conduct technology kick-off meeting with client, general contractor, integrators, and subcontractors to align on scope, schedule, and logistics.
- Review approved design documents, equipment schedules, and construction drawings with all technology vendors to confirm scope alignment.
- Verify site readiness conditions including power, pathways, conduit, backing, and environmental controls prior to mobilization.
- Confirm equipment lead times and delivery schedules with all vendors and coordinate staging logistics.
  - Review and approve vendor submittals and shop drawings for specification compliance.
  - Coordinate technology rough-in requirements with general contractor and electrical subcontractor.
- Establish RFI process and response workflow for field-condition changes and coordination conflicts.
- Verify IT room, MDF, and IDF spaces are built to specification including rack placement, power, cooling, and access control.

**IT Infrastructure Implementation**

**IT Room & Equipment Installation**

- Oversee installation of equipment racks, cabinets, and cable management in MDF, IDF, and satellite closets.
  - Verify rack placement, grounding, and bonding per approved drawings and TIA-607 standards.
  - Coordinate power circuit termination and UPS installation with electrical subcontractor.
  - Verify PDU installation, labeling, and circuit mapping.
  - Confirm supplemental HVAC and cooling systems are operational prior to equipment energization.
  - Oversee equipment mounting and rack dressing per approved rack elevations.

**Carrier & ISP Coordination**

- Coordinate ISP circuit installation, demarc termination, and pathway routing from building entry to MDF.
  - Witness and verify circuit turn-up testing for primary and redundant connections.
  - Confirm bandwidth delivery, latency, and SLA compliance with carrier.

**Structured Cabling**

- Oversee fiber and copper structured cabling installation including horizontal runs, backbone, and riser pathways.
  - Verify cable routing, pathway utilization, J-hook spacing, and fire stopping at all rated penetrations.
  - Confirm outlet and faceplate installation per approved drawings.
  - Verify labeling and color-coding compliance for cables, outlets, and patch panels.
  - Review and verify cable testing and certification results (Fluke or equivalent) for all installed cabling.
  - Confirm fiber termination, splice, and OTDR test results.
  - Manage cabling punch list through resolution and sign-off.

**Server, Switching & Core Equipment**

- Oversee installation and rack mounting of network switches, firewalls, servers, and security appliances.
  - Verify switch port patching, uplink connections, and fiber cross-connects per termination schedules.
  - Coordinate VLAN, QoS, and port configuration with network vendor or client IT team.
  - Verify PoE delivery and budget allocation for powered devices (APs, cameras, phones, displays).
  - Confirm firewall rules, NAT, and routing tables are configured per approved network architecture.
  - Oversee DHCP scope configuration, DNS, NTP, and RADIUS/802.1X setup.
  - Verify network management and monitoring platform installation and alerting configuration.

**Audio Visual Implementation**

**Conference & Meeting Rooms**

- Oversee AV equipment installation in conference rooms, boardrooms, and huddle spaces.
  - Verify display mounting, alignment, and signal connectivity.
  - Confirm video conferencing system installation including cameras, microphones, speakers, and codec configuration.
  - Verify projector installation, alignment, focus, and image geometry on projection surfaces.
  - Confirm wireless presentation system installation and functionality (ClickShare, AirMedia, Mersive).
  - Verify table connectivity including cable cubby, floor box, and input plate installation.
  - Confirm system powers up, sources route correctly, and all endpoints respond.

**Ballroom, Event & Multi-Purpose Spaces**

- Oversee distributed audio system installation including speaker placement, amplifier mounting, and zone wiring.
  - Verify speaker locations, aiming, and coverage against approved design.
  - Confirm amplifier configuration, zone assignment, and signal routing.
  - Verify projection and display installation for event and presentation use.
  - Confirm room combining/dividing system functionality including partition sensor response and automatic reconfiguration.
  - Verify assistive listening system installation and ADA compliance.
  - Coordinate rigging infrastructure and portable connection point installation.

**Public Areas & Food & Beverage**

- Oversee background music and paging system installation across lobbies, restaurants, bars, pools, and common areas.
  - Verify speaker installation, placement, and coverage.
  - Confirm zone configuration, volume control, and music source connectivity.
  - Verify digital signage display installation, media player configuration, and content management system setup.
  - Confirm outdoor and weather-rated equipment installation for pools, patios, and rooftop venues.
  - Verify video distribution system installation for bars and sports viewing areas.

**Control Systems**

- Oversee control system processor installation, network connectivity, and firmware updates.
  - Verify touch panel installation, mounting, and network enrollment.
  - Coordinate control system programming with integrator per approved UI layouts and system narrative.
  - Witness programming demonstration and verify all control functions operate per approved scope.
  - Verify scheduling and room booking system integration functionality.
  - Confirm remote monitoring and management system connectivity and alerting.

**AV Infrastructure & IT Room**

- Verify AV cabling installation including signal type, cable specification, and termination quality.
  - Confirm conduit, back box, and in-wall rough-in completion per approved drawings.
  - Verify power availability and circuit dedication at all AV equipment locations.
  - Confirm AV rack equipment installation, dressing, and labeling in IT/telecom rooms.
  - Verify heat load and ventilation adequacy for enclosed AV rack locations.

**Physical Security & Access Control Implementation**

**Video Surveillance (CCTV)**

- Oversee camera installation, mounting, and aiming at all approved locations.
  - Verify camera field of view, focus, and image quality against coverage maps and design intent.
  - Confirm PoE delivery, network connectivity, and camera enrollment into VMS.
  - Verify LPR camera installation, capture zone, and plate recognition accuracy.
  - Confirm video analytics configuration including motion zones, line crossing, loitering, and people counting.
  - Verify low-light and IR performance at exterior, garage, and stairwell locations.
  - Review recorded footage at each camera for image quality, storage, and retention compliance.

**Video Management System (VMS)**

- Oversee VMS server installation, storage provisioning, and software licensing activation.
  - Verify all cameras are recording per configured resolution, frame rate, and retention schedule.
  - Confirm client workstation installation and multi-monitor/video wall configuration in SOC.
  - Verify remote and mobile viewing functionality.
  - Confirm video export, evidence management, and incident workflow configuration.
  - Verify failover and redundancy functionality if applicable.

**Access Control**

- Oversee access control hardware installation including readers, controllers, locks, REX devices, and door position switches.
  - Verify door hardware installation and operation per door schedule.
  - Confirm reader placement, credential enrollment, and access level configuration.
  - Verify controller communication, panel programming, and system connectivity.
  - Confirm elevator floor access control and cab reader functionality.
  - Verify PMS and digital key integration for guest credential management.
  - Test all doors for proper lock/unlock, REX, relock timing, forced door, and held door alarms.
  - Confirm visitor management system integration if applicable.

**Intrusion Detection & Alarm Monitoring**

- Oversee intrusion detection sensor installation and zone wiring.
  - Verify sensor placement and functionality (door/window contacts, motion, glass break, duress).
  - Confirm alarm panel programming, zone configuration, and arm/disarm schedules.
  - Verify central station monitoring communication path and signal delivery.
  - Test alarm event correlation between intrusion, access control, and video systems.

**Emergency & Life Safety Integration**

- Verify fire alarm interface functionality for door release, elevator recall, and CCTV event triggers.
  - Confirm lockdown and emergency response integration with access control system.
  - Verify emergency phone and intercom system installation and functionality.
  - Coordinate with fire protection engineer and AHJ for final inspection and acceptance.

**Security Infrastructure & IT Room**

- Verify security system cabling, PoE delivery, and network segmentation.
  - Confirm rack installation, equipment mounting, and cable dressing for security servers, NVRs, and panels.
  - Verify dedicated VLAN configuration and cybersecurity hardening for security devices.
  - Confirm UPS and power redundancy for security systems.

**Network Implementation**

**Network Infrastructure**

- Oversee network switch, firewall, and core equipment installation per approved rack elevations.
  - Verify VLAN configuration and segmentation for all property systems (guest, admin, POS, IPTV, security, BMS, AV, VoIP).
  - Confirm inter-VLAN routing, firewall rules, and ACL implementation.
  - Verify QoS policy implementation and traffic prioritization (voice, video, signage, POS).
  - Confirm redundancy and failover path functionality (link aggregation, spanning tree).
  - Verify DHCP scope assignments, DNS resolution, and NTP synchronization.
  - Confirm RADIUS/802.1X authentication and NAC configuration.

**Wireless Network**

- Oversee wireless access point installation, mounting, and cabling.
  - Verify AP placement matches predictive study and approved drawings.
  - Confirm AP enrollment into wireless LAN controller and firmware consistency.
  - Verify channel assignments and RF performance against predictive study.
  - Confirm guest Wi-Fi tier structure, bandwidth limits, and captive portal functionality.
  - Verify PMS authentication integration for guest network access.
  - Confirm outdoor AP installation and coverage for pools, patios, and event areas.
  - Coordinate post-installation wireless validation survey and remediate any coverage gaps.

**Internet & WAN**

- Coordinate ISP circuit activation and verify bandwidth delivery on primary and redundant connections.
  - Confirm automatic failover between primary and secondary circuits.
  - Verify SD-WAN configuration if applicable.
  - Confirm VPN tunnel establishment for vendor support, property management, and corporate connectivity.
  - Verify content filtering and acceptable use policy enforcement.

**Network Security**

- Verify firewall installation, rule set implementation, and logging configuration.
  - Confirm guest network isolation and containment.
  - Verify PCI-DSS network segmentation for payment card environment.
  - Coordinate vulnerability scan or penetration test if required by client.

**Network Monitoring & Management**

- Verify network monitoring platform installation and SNMP/syslog/NetFlow collection.
  - Confirm alerting thresholds and escalation notification workflows.
  - Verify dashboard configuration for uptime, utilization, and performance metrics.
  - Confirm configuration backup and change management procedures are in place.

**Procurement & Vendor Management**

- Review and level technology bids across all system categories for specification compliance and pricing competitiveness.
- Vendor contract review and negotiation support including scope, schedule, payment terms, warranties, and SLAs.
- Equipment substitution evaluation and approval for discontinued or long-lead items.
- Track equipment procurement, shipping, and delivery against the project schedule.
  - Coordinate equipment receiving, inspection, and inventory verification at the project site.
  - Manage vendor change order process including scope review, pricing validation, and approval.

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
- Conduct integration testing across all connected systems (PMS-to-door locks, POS-to-PMS, IPTV-to-PMS, network-to-all endpoints, etc.).
- Perform network performance validation including throughput testing, latency measurements, and wireless coverage verification.
- Verify all system redundancy and failover scenarios.
- Coordinate technology staff training sessions with vendors.
- Review and verify as-built documentation, system manuals, warranty registrations, and login credential packages.
- Compile and deliver technology closeout package to the owner.
- Post-opening stabilization support for [30/60/90] days following property opening.
