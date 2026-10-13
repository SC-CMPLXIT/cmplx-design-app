-- CMPLX iT Design — private project seed (v1.5)
-- Apply after 001 → 002 → 003 → 004 → 005 → 006 → 007.
-- Idempotent and non-destructive. Safe to re-run. Applied by hand in the SQL editor.
--
-- Adds projects.area_sf when it is missing (gross square feet, for later fee estimates).
-- Seeds one project on a fixed UUID. Re-runs do not insert a second copy.
-- New projects already receive project_system_scope rows, so scope is turned on
-- with updates. Re-applying sets those systems in scope again and leaves every
-- other system flag alone.
-- Rooms, answers, discrepancies, and the status note insert with on conflict do
-- nothing, so a later edit is kept. Drawings are not seeded.

alter table public.projects
  add column if not exists area_sf integer;

comment on column public.projects.area_sf is
  'Gross area in square feet for later proposal fee estimates. Null until it is known.';

do $$
begin
  alter table public.projects
    add constraint projects_area_sf_positive
    check (area_sf is null or area_sf > 0);
exception
  when duplicate_object then null;
end $$;

-- New column inherits the table grants. Signed-out visitors still have none.
revoke all on table public.projects from anon;
revoke all on all tables in schema public from anon;

insert into public.projects as p (
  id, name, owner, status, start_date, target_date, area_sf
)
values (
  '11000000-1100-4110-8110-000000000110',
  'LMNT — 110 Worcester',
  'Sam Conklin',
  'pending',
  null,
  null,
  11500
)
on conflict (id) do update
set area_sf = excluded.area_sf
where p.area_sf is null;

-- Site is 110 Worcester St, Wellesley, MA. Opening window in the source notes
-- is Mar/Apr 2027. Commercial state is the status note, not a contract date.
-- 11,500 is the gross area.

update public.project_system_scope
set in_scope = true
where project_id = '11000000-1100-4110-8110-000000000110'
  and system_key in (
    'general',
    'carrier_riser',
    'it_infrastructure',
    'network_wifi',
    'display_video',
    'audio',
    'conferencing',
    'control',
    'security',
    'acoustics'
  )
  and in_scope is distinct from true;

insert into public.status_updates (id, project_id, author, body, created_at)
select
  '11000000-1100-4110-8110-000000000201',
  '11000000-1100-4110-8110-000000000110',
  'Sam Conklin',
  'NDA only, no contract',
  '2026-10-12T21:00:00Z'
where exists (
  select 1
  from public.projects p
  where p.id = '11000000-1100-4110-8110-000000000110'
    and p.deleted_at is null
)
on conflict (id) do nothing;

insert into public.discovery_spaces (
  id, project_id, name, group_name, plan_shows, intended_use, occupancy, notes, sort_order, created_at, updated_at
)
select
  v.id,
  '11000000-1100-4110-8110-000000000110',
  v.name,
  v.group_name,
  v.plan_shows,
  v.intended_use,
  v.occupancy,
  v.notes,
  v.sort_order,
  '2026-10-12T21:00:00Z',
  '2026-10-12T21:00:00Z'
from (
  values
    (
      '11000000-1100-4110-8110-000000000001'::uuid,
      'Entry + Reception',
      'Office',
      'ENTRY at the suite door, shared with the gym-side corridor. RECEPTION with a round desk and lounge seating. LMNT brand wall along the east wall. No TV or data shown.',
      'Arrival, reception, and the brand wall.',
      'Reception desk and lounge seating.',
      'Rendering: wood-framed glass entry with a sliding door, lightbox ceiling, stone-clad round desk, lit product cooler and shelving.',
      1
    ),
    (
      '11000000-1100-4110-8110-000000000002'::uuid,
      'Conference Room',
      'Office',
      'CONFERENCE with a long table of about 12. One 86" TV with power and data on the east wall (A-111). No floor box or ceiling devices shown.',
      'Meetings for about twelve people. Video-wall tier is still open.',
      'About 12 seats.',
      'Rendering: wood coffered grid ceiling, grasscloth and wood slat walls, fluted glass and drapery, large black end-wall panel with the LMNT logo that looks larger than a single 86".',
      2
    ),
    (
      '11000000-1100-4110-8110-000000000003'::uuid,
      'Meeting Room',
      'Office',
      'MTG RM between Office 6 and Office 7. Round table and 4 chairs. One 86" TV with power and data (A-111).',
      'Small meeting. Content-only versus full video conferencing is still open.',
      '4 seats.',
      'No rendering for this room.',
      3
    ),
    (
      '11000000-1100-4110-8110-000000000004'::uuid,
      'Offices 1–8',
      'Office',
      'Eight closed offices on the west facade and north core. Offices 1 and 6 have an 86" TV, data, and a round meeting table. Offices 2–5, 7, and 8 show desks only. A-112 says to confirm power with the desk spec. No data is shown at the desks.',
      'Closed offices. Whether 1 and 6 are executive offices or huddle rooms is still open.',
      '8 offices. Offices 1 and 6 also have a meeting table.',
      'Typical office rendering: wood grid ceiling, full-height windows with roller shades, sit-stand desk, millwork brand wall.',
      4
    ),
    (
      '11000000-1100-4110-8110-000000000005'::uuid,
      'Open Work',
      'Office',
      'Twelve open seats in four three-person pinwheel pods. A-112 shows power at the desks and says to confirm it with the desk spec. No data symbols at the desks.',
      'Open office work.',
      '12 seats in 4 pods of 3.',
      'Rendering: wood plank ceiling, linear skylight lightboxes, black track lighting, timber columns, wood and fluted-glass screens.',
      5
    ),
    (
      '11000000-1100-4110-8110-000000000006'::uuid,
      'Phone Booths',
      'Office',
      'PB1 and PB2 next to the IT room. PB3 and PB4 between Office 8 and Conference. Small single-person rooms. No TV or data shown.',
      'Single-person phone rooms. Built rooms versus prefabricated pods, and audio versus video, are still open.',
      '1 person, 4 rooms.',
      'No rendering of the booths.',
      6
    ),
    (
      '11000000-1100-4110-8110-000000000007'::uuid,
      $$Mother's Room$$,
      'Office',
      'MOTHER''S ROOM / PB on the north side near Office 8. A small counter or fixture is shown. No TV or data.',
      'Mother''s room, also labeled for phone-booth use. Whether that dual use is acceptable is still open.',
      '1 person.',
      'No rendering.',
      7
    ),
    (
      '11000000-1100-4110-8110-000000000008'::uuid,
      'Lounge',
      'Office',
      'LOUNGE between Office 3 and Office 4 on the west facade, with a built-in L-shaped banquette. A-112 shows in-surface booth power. No TV or data.',
      'Casual lounge. The notes also name a library; whether this room is that quiet zone is still open.',
      'Banquette. Headcount is not on the plan.',
      'Rendering "The Cabin" (name still to confirm): upholstered banquette, cafe tables, framed photo, sconces, wood ceiling, fluted-glass screens, window wall. No display in the rendering.',
      8
    ),
    (
      '11000000-1100-4110-8110-000000000009'::uuid,
      'Flex Lounge',
      'Office',
      'FLEX LOUNGE with a 10-seat table, between Reception and Pantry Lounge. An 86" TV with power and data is drawn on the west wall at the Marketing Break Out side. Which room it faces is still open.',
      'Work and hosting. The kinds of events are still open.',
      '10-seat table.',
      'Rendering: wood-paneled walls, wood grid ceiling with a skylight, pendant, built-in credenza, long communal table. No display is visible in the rendering.',
      9
    ),
    (
      '11000000-1100-4110-8110-000000000010'::uuid,
      'Pantry + Marketing Break Out',
      'Office',
      'MARKETING BREAK OUT with a counter and 6 stools, PANTRY with a curved island and counter seating, and PANTRY LOUNGE. A-112 shows 24" under-counter seating power, in-surface counter power, and a note to confirm pantry-appliance power. An 86" TV with data is on the wall shared with Flex Lounge.',
      'Possible all-hands and marketing space. Headcount and how often it is used that way are still open.',
      'Break-out stools, pantry counter, and lounge seats.',
      'Pantry rendering: dark green millwork, curved island, exposed beams, sliding whiteboards. Pantry Lounge: stone feature wall and lounge chairs. Marketing Break Out: long banquette and a black end panel that may be a display or a chalkboard.',
      10
    ),
    (
      '11000000-1100-4110-8110-000000000011'::uuid,
      'Gym',
      'Gym',
      'TURF / ACTIVE MOVEMENT with 2 treadmills, a stairmaster, ski erg, rower, weights, rack, and cable machine. A-113 shows equipment power, to confirm with the spec, and no TV or data. Notes say about 2,500 sf. Verify the area.',
      'Turf, cardio, and strength, including the gym entry and lobby.',
      'Turf, cardio, and strength. Area still to verify.',
      'Rendering: charred wood walls, open black ceiling with a strut grid, LED-lined mirrors, rubber floor with a turf sled lane. Wall-mounted display(s) beside the logo are in the rendering and not on the plan. Gym entry has a glass sliding door. Gym lobby is oak millwork with a sink.',
      11
    ),
    (
      '11000000-1100-4110-8110-000000000012'::uuid,
      'Wet Areas',
      'Gym',
      '4-person sauna, mech, and washer/dryer near the gym entry. Two water closets on the gym side. The program lists two showers that are not labeled on the plan.',
      'Sauna, restrooms, showers, and laundry. Shower locations are still open.',
      '4-person sauna, 2 water closets, 2 showers.',
      'Rendering: sauna corridor and anteroom in dark wood, glazed sauna door, wood benches.',
      12
    ),
    (
      '11000000-1100-4110-8110-000000000013'::uuid,
      'Treatment Rooms',
      'Gym',
      'Two treatment rooms, each about 14 ft 11 in by 10 ft 2 in, on the north side of the gym. No TV or data shown.',
      'Treatment. Who uses the rooms, and whether a practitioner is in house, is still open.',
      '2 rooms plus a small waiting nook.',
      'Rendering: wood ceiling with cove lighting, treatment table, oak counter. A small reception nook with armchairs.',
      13
    ),
    (
      '11000000-1100-4110-8110-000000000014'::uuid,
      'IT Room',
      'Office',
      'IT room about 6 ft wide, next to Mech and Storage, behind PB1 and PB2 and backing onto the Marketing Break Out counter. A-112 says the electrical engineer will confirm power for IT. A separate note says LMNT will verify storage availability.',
      'Racks and service. Not a workplace.',
      'Staff only. Room is about 6 ft wide.',
      'Cooling, UPS, rack size, and the carrier path are not on the drawings.',
      14
    )
) as v(id, name, group_name, plan_shows, intended_use, occupancy, notes, sort_order)
where exists (
  select 1
  from public.projects p
  where p.id = '11000000-1100-4110-8110-000000000110'
    and p.deleted_at is null
)
on conflict (id) do nothing;

insert into public.discovery_answers (
  id, project_id, space_id, question_key, body, status, created_at, updated_at
)
select
  v.id,
  '11000000-1100-4110-8110-000000000110',
  v.space_id,
  v.question_key,
  v.body,
  v.status::public.question_answer_status,
  '2026-10-12T21:00:00Z',
  '2026-10-12T21:00:00Z'
from (
  values
    (
      '11000000-1100-4110-8110-000000000401'::uuid,
      '11000000-1100-4110-8110-000000000001'::uuid,
      'display_sightlines',
      'No display is drawn. The plan shows no TV and no data at the entry, the reception desk, or the brand wall.',
      'answered'
    ),
    (
      '11000000-1100-4110-8110-000000000402'::uuid,
      '11000000-1100-4110-8110-000000000001'::uuid,
      'acoustics_finishes',
      'Stone reception desk, glass entry, and a lightbox ceiling. A speaker here has to miss the lightbox.',
      'answered'
    ),
    (
      '11000000-1100-4110-8110-000000000403'::uuid,
      '11000000-1100-4110-8110-000000000002'::uuid,
      'display_sightlines',
      'One 86" TV with power and data on the east wall, seen from a long table of about 12. No floor box or ceiling device is drawn. The rendering end wall looks larger than 86".',
      'answered'
    ),
    (
      '11000000-1100-4110-8110-000000000404'::uuid,
      '11000000-1100-4110-8110-000000000002'::uuid,
      'display_purpose',
      'Notes call for a video wall. Three tiers were discussed: custom LED, an all-in-one 136" or 163", or dual large displays or laser projection. The plan shows a single 86".',
      'open'
    ),
    (
      '11000000-1100-4110-8110-000000000405'::uuid,
      '11000000-1100-4110-8110-000000000002'::uuid,
      'conferencing_cabling',
      'No floor box, wall plate, or furniture feed is drawn. Data is shown only at the 86" TV.',
      'answered'
    ),
    (
      '11000000-1100-4110-8110-000000000406'::uuid,
      '11000000-1100-4110-8110-000000000002'::uuid,
      'acoustics_finishes',
      'Wood coffered grid ceiling, grasscloth and wood slat walls, fluted glass, and drapery.',
      'answered'
    ),
    (
      '11000000-1100-4110-8110-000000000407'::uuid,
      '11000000-1100-4110-8110-000000000003'::uuid,
      'display_sightlines',
      'One 86" TV with power and data, for four people at a round table.',
      'answered'
    ),
    (
      '11000000-1100-4110-8110-000000000408'::uuid,
      '11000000-1100-4110-8110-000000000003'::uuid,
      'display_purpose',
      'Whether an 86" is the right image for four people, and whether it is content only or full video conferencing, is not decided.',
      'open'
    ),
    (
      '11000000-1100-4110-8110-000000000409'::uuid,
      '11000000-1100-4110-8110-000000000004'::uuid,
      'display_sightlines',
      'Offices 1 and 6 show an 86" TV and data, with a round meeting table. The other six offices show no display and no data at the desk.',
      'answered'
    ),
    (
      '11000000-1100-4110-8110-000000000410'::uuid,
      '11000000-1100-4110-8110-000000000004'::uuid,
      'display_purpose',
      'Who sits in Offices 1 and 6, and whether those TVs are for video calls, content review, or both, is not decided.',
      'open'
    ),
    (
      '11000000-1100-4110-8110-000000000411'::uuid,
      '11000000-1100-4110-8110-000000000005'::uuid,
      'display_sightlines',
      'No display and no data symbols are shown at the desks. Power is shown, with a note to confirm it against the desk spec.',
      'answered'
    ),
    (
      '11000000-1100-4110-8110-000000000412'::uuid,
      '11000000-1100-4110-8110-000000000005'::uuid,
      'it_drops',
      'No data drops are drawn at the desks. Power is shown. Outlet count and who pulls the cable are not decided.',
      'open'
    ),
    (
      '11000000-1100-4110-8110-000000000413'::uuid,
      '11000000-1100-4110-8110-000000000006'::uuid,
      'display_sightlines',
      'No TV or data is shown in PB1, PB2, PB3, or PB4.',
      'answered'
    ),
    (
      '11000000-1100-4110-8110-000000000414'::uuid,
      '11000000-1100-4110-8110-000000000006'::uuid,
      'network_coverage',
      'These are small enclosed rooms. Whether Wi-Fi has to work inside them, and whether each booth gets a cable, is not decided.',
      'open'
    ),
    (
      '11000000-1100-4110-8110-000000000415'::uuid,
      '11000000-1100-4110-8110-000000000007'::uuid,
      'display_sightlines',
      'No TV or data is shown.',
      'answered'
    ),
    (
      '11000000-1100-4110-8110-000000000416'::uuid,
      '11000000-1100-4110-8110-000000000007'::uuid,
      'security_cameras',
      'This is a privacy room. A camera must not be placed in it or aimed into it.',
      'answered'
    ),
    (
      '11000000-1100-4110-8110-000000000417'::uuid,
      '11000000-1100-4110-8110-000000000008'::uuid,
      'display_sightlines',
      'No TV or data. In-surface booth power is shown on A-112.',
      'answered'
    ),
    (
      '11000000-1100-4110-8110-000000000418'::uuid,
      '11000000-1100-4110-8110-000000000008'::uuid,
      'display_purpose',
      'No display is shown on the plan or in the rendering.',
      'answered'
    ),
    (
      '11000000-1100-4110-8110-000000000419'::uuid,
      '11000000-1100-4110-8110-000000000008'::uuid,
      'audio_role',
      'This may be the library or quiet zone from the notes, or a casual lounge with low background music. Not confirmed. The rendering name "The Cabin" is also unconfirmed.',
      'open'
    ),
    (
      '11000000-1100-4110-8110-000000000420'::uuid,
      '11000000-1100-4110-8110-000000000009'::uuid,
      'display_sightlines',
      'An 86" TV with power and data is drawn on the west wall on the Marketing Break Out side. Which room that image faces is not clear, and the Flex Lounge rendering shows no display.',
      'open'
    ),
    (
      '11000000-1100-4110-8110-000000000421'::uuid,
      '11000000-1100-4110-8110-000000000009'::uuid,
      'audio_role',
      'Hosting may need background music and a wireless mic, possibly tied to an all-hands system. Not confirmed.',
      'open'
    ),
    (
      '11000000-1100-4110-8110-000000000422'::uuid,
      '11000000-1100-4110-8110-000000000010'::uuid,
      'display_sightlines',
      'An 86" TV with power and data sits on the wall shared with Flex Lounge. Which room it faces is not clear. The Marketing Break Out rendering shows a black end panel that may be a display or a chalkboard.',
      'open'
    ),
    (
      '11000000-1100-4110-8110-000000000423'::uuid,
      '11000000-1100-4110-8110-000000000010'::uuid,
      'audio_role',
      'Notes list an open lounge or auditorium audio zone. This pantry, pantry lounge, and break out are the likely match. Separate volumes versus one event mode is not decided.',
      'open'
    ),
    (
      '11000000-1100-4110-8110-000000000424'::uuid,
      '11000000-1100-4110-8110-000000000010'::uuid,
      'it_drops',
      'Power is shown for under-counter seating, the counter, and pantry appliances, which the electrical engineer still has to confirm. Data is shown only at the 86" TV.',
      'open'
    ),
    (
      '11000000-1100-4110-8110-000000000425'::uuid,
      '11000000-1100-4110-8110-000000000011'::uuid,
      'display_sightlines',
      'A-113 shows no TV and no data. The rendering shows one or more wall-mounted displays on the back wall beside the logo.',
      'open'
    ),
    (
      '11000000-1100-4110-8110-000000000426'::uuid,
      '11000000-1100-4110-8110-000000000011'::uuid,
      'display_purpose',
      'Fitness displays are not on the plan. Count, size, and content, and whether the cardio equipment is connected, are not decided.',
      'open'
    ),
    (
      '11000000-1100-4110-8110-000000000427'::uuid,
      '11000000-1100-4110-8110-000000000011'::uuid,
      'audio_role',
      'Notes treat the gym as its own background-music zone, louder than the office, with a trainer mic. Not confirmed on the drawings.',
      'open'
    ),
    (
      '11000000-1100-4110-8110-000000000428'::uuid,
      '11000000-1100-4110-8110-000000000011'::uuid,
      'security_cameras',
      'Cameras for liability were discussed. They must stay out of changing and sauna areas. Placement is not decided.',
      'open'
    ),
    (
      '11000000-1100-4110-8110-000000000429'::uuid,
      '11000000-1100-4110-8110-000000000012'::uuid,
      'security_cameras',
      'No cameras in the sauna, showers, or water closets.',
      'answered'
    ),
    (
      '11000000-1100-4110-8110-000000000430'::uuid,
      '11000000-1100-4110-8110-000000000012'::uuid,
      'audio_speakers',
      'If these rooms get audio, showers and water closets need moisture-rated speakers, and the sauna needs a heat-rated speaker or the manufacturer system. Not confirmed.',
      'open'
    ),
    (
      '11000000-1100-4110-8110-000000000431'::uuid,
      '11000000-1100-4110-8110-000000000012'::uuid,
      'audio_role',
      'Notes include restrooms and showers as audio zones. The plan labels two water closets and does not label the two showers.',
      'open'
    ),
    (
      '11000000-1100-4110-8110-000000000432'::uuid,
      '11000000-1100-4110-8110-000000000013'::uuid,
      'security_cameras',
      'No cameras inside the treatment rooms.',
      'answered'
    ),
    (
      '11000000-1100-4110-8110-000000000433'::uuid,
      '11000000-1100-4110-8110-000000000013'::uuid,
      'audio_role',
      'Per-room background music with a local volume, and speech privacy from the waiting nook, were discussed and are not confirmed.',
      'open'
    ),
    (
      '11000000-1100-4110-8110-000000000434'::uuid,
      '11000000-1100-4110-8110-000000000013'::uuid,
      'display_purpose',
      'No TV or data is shown in either treatment room.',
      'answered'
    ),
    (
      '11000000-1100-4110-8110-000000000435'::uuid,
      '11000000-1100-4110-8110-000000000014'::uuid,
      'it_equipment',
      'The IT room is about 6 feet wide, beside Mech and Storage. The plan says the electrical engineer will confirm power. Cooling, UPS size, rack size, and the carrier path are not drawn.',
      'open'
    ),
    (
      '11000000-1100-4110-8110-000000000436'::uuid,
      '11000000-1100-4110-8110-000000000014'::uuid,
      'security_entry',
      'Whether the IT room door gets a card reader is not decided.',
      'open'
    ),
    (
      '11000000-1100-4110-8110-000000000437'::uuid,
      '11000000-1100-4110-8110-000000000014'::uuid,
      'it_drops',
      'Low voltage for the floor is not drawn. Data on the power plans is only at five TVs. Who draws the technology plan is still open.',
      'open'
    )
) as v(id, space_id, question_key, body, status)
where exists (
  select 1
  from public.discovery_spaces s
  where s.id = v.space_id
    and s.project_id = '11000000-1100-4110-8110-000000000110'
    and s.deleted_at is null
)
on conflict (space_id, question_key) do nothing;

insert into public.discovery_discrepancies (
  id, project_id, space_id, plan_shows, notes_say, severity, status, resolution_note, created_at, updated_at
)
select
  v.id,
  '11000000-1100-4110-8110-000000000110',
  v.space_id,
  v.plan_shows,
  v.notes_say,
  v.severity::public.discovery_severity,
  'open'::public.discovery_discrepancy_status,
  '',
  '2026-10-12T21:00:00Z',
  '2026-10-12T21:00:00Z'
from (
  values
    (
      '11000000-1100-4110-8110-000000000301'::uuid,
      '11000000-1100-4110-8110-000000000002'::uuid,
      'A single 86" TV with power and data on the east wall (A-111).',
      'The 12-person room should get a video wall: custom LED, an all-in-one 136" or 163", or dual large displays or laser projection. The rendering shows a large black end-wall panel that looks bigger than 86". Whether that panel is a video-wall placeholder is still open.',
      'high'
    ),
    (
      '11000000-1100-4110-8110-000000000302'::uuid,
      null::uuid,
      'Neither an open lounge / auditorium nor a library is labeled on the plan.',
      'The notes list both as audio zones. Possible matches: Pantry Lounge plus Marketing Break Out as the all-hands area, and the Lounge or Flex Lounge as the library.',
      'high'
    ),
    (
      '11000000-1100-4110-8110-000000000303'::uuid,
      '11000000-1100-4110-8110-000000000011'::uuid,
      'Turf and equipment on A-113, with no area given and no TV or data.',
      'Notes say a gym of about 2,500 sf. The rendering shows wall-mounted display(s) on the back wall.',
      'high'
    ),
    (
      '11000000-1100-4110-8110-000000000304'::uuid,
      '11000000-1100-4110-8110-000000000012'::uuid,
      'A 4-person sauna and two water closets on the gym side. Two showers are in the program and are not labeled.',
      'Notes include restrooms and showers as audio zones. Speakers here would need a moisture rating. Shower locations are still open.',
      'medium'
    ),
    (
      '11000000-1100-4110-8110-000000000305'::uuid,
      null::uuid,
      'Data symbols are only at five 86" TVs: Conference, Meeting Room, Office 1, Office 6, and the Marketing Break Out / Flex Lounge wall.',
      'Nothing is shown for workstations, the other offices, phone booths, reception, gym equipment, Wi-Fi access points, cameras, or access control. Who draws the low-voltage plan, and whether it is in the CD set, is still open.',
      'high'
    ),
    (
      '11000000-1100-4110-8110-000000000306'::uuid,
      '11000000-1100-4110-8110-000000000014'::uuid,
      'A small IT room, about 6 feet wide, next to Mech and Storage. The note says the electrical engineer will confirm power.',
      'Cooling, UPS, rack size, and the carrier path are not on the drawings.',
      'medium'
    ),
    (
      '11000000-1100-4110-8110-000000000307'::uuid,
      null::uuid,
      'The drawings do not name an audio platform.',
      'The CEO prefers Sonos. Notes flag limits: an aux or live-mic input, zone matrixing, licensed music, and public-assembly use. Whether Sonos stays for casual zones and a commercial system covers events and the gym is still open.',
      'medium'
    ),
    (
      '11000000-1100-4110-8110-000000000308'::uuid,
      null::uuid,
      'The plan labels Lounge, the gym entry, the treatment rooms, Reception, and the base-building corridor.',
      'Renderings also use The Cabin, Gym Lobby, Treatment Area Reception, Reception + Product Display, and Communal Hallway. Which of those names are in scope is still open.',
      'low'
    ),
    (
      '11000000-1100-4110-8110-000000000309'::uuid,
      '11000000-1100-4110-8110-000000000004'::uuid,
      'Offices 1 and 6 each show an 86" TV, data, and a round meeting table. The other six offices show desks only.',
      'Whether Offices 1 and 6 are executive offices or huddle rooms with video conferencing is still open.',
      'medium'
    ),
    (
      '11000000-1100-4110-8110-000000000310'::uuid,
      null::uuid,
      'Floor plans are dated 9/30/26 and marked draft. Renderings are dated 10/5/26 and marked design intent.',
      'Notes name the architect of record as Studio Lords and said the set was moving to CDs that Friday. Another note says Studio Lourdes. Current CD status is still open.',
      'low'
    )
) as v(id, space_id, plan_shows, notes_say, severity)
where exists (
  select 1
  from public.projects p
  where p.id = '11000000-1100-4110-8110-000000000110'
    and p.deleted_at is null
)
and (
  v.space_id is null
  or exists (
    select 1
    from public.discovery_spaces s
    where s.id = v.space_id
      and s.project_id = '11000000-1100-4110-8110-000000000110'
  )
)
on conflict (id) do nothing;
