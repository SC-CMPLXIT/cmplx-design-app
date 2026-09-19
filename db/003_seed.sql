-- DEMO / seed data only. Not live client records.
-- Safe to re-run: fixed UUIDs + on conflict do nothing.
-- After applying, create a matching Auth user for editor@demo.cmplx
-- (or replace that email with a real editor before going live).

insert into public.editors (id, email, display_name)
values (
  '00000000-0000-4000-8000-000000000001',
  'editor@demo.cmplx',
  'Demo Editor'
)
on conflict (email) do nothing;

insert into public.projects (
  id, name, owner, status, start_date, target_date
) values
  (
    '11111111-1111-4111-8111-111111111111',
    'DEMO — North Dock Clubhouse',
    'CMPLX Studio',
    'on_track',
    '2026-03-01',
    '2026-09-30'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'DEMO — Harbor Inn Guest Rooms',
    'A. Rivera',
    'at_risk',
    '2026-04-15',
    '2026-08-01'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'DEMO — Atrium Bar Refresh',
    'CMPLX Studio',
    'pending',
    '2026-10-01',
    '2027-01-15'
  )
on conflict (id) do nothing;

insert into public.status_updates (id, project_id, author, body, created_at) values
  (
    'aaaaaaa1-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    'Demo Editor',
    'Kickoff complete. Cabling pathways confirmed with architect. AV package in pricing.',
    '2026-03-12T14:00:00Z'
  ),
  (
    'aaaaaaa1-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    'Demo Editor',
    'Wireless heat map issued. Waiting on furniture layout before AP count lock.',
    '2026-06-02T16:30:00Z'
  ),
  (
    'aaaaaaa2-0000-4000-8000-000000000001',
    '22222222-2222-4222-8222-222222222222',
    'A. Rivera',
    'IPTV vendor slipped two weeks. Guest-room lock schedule now on the critical path.',
    '2026-07-18T11:15:00Z'
  )
on conflict (id) do nothing;

insert into public.design_briefs (
  id, project_id, owner, status, start_date, target_date,
  design_intent, constraints, open_decisions
) values
  (
    'b1111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'CMPLX Studio',
    'active',
    '2026-03-01',
    '2026-09-30',
    'A members'' clubhouse that feels analog first. Technology should disappear into joinery and landscape — reliable wireless, discreet AV for the dock-side room, and access that members never notice.',
    'Existing timber structure limits riser space. No visible racks in public rooms. Construction window closes before the winter season.',
    'Confirm whether events AV is in this package or a later phase. Owner still deciding on guest-app vendor.'
  ),
  (
    'b2222222-2222-4222-8222-222222222222',
    '22222222-2222-4222-8222-222222222222',
    'A. Rivera',
    'in_review',
    '2026-04-15',
    '2026-08-01',
    'Soft-refresh 84 keys: in-room entertainment, locks, and a guest network that does not fight the historic fabric.',
    'Listed building — no chasing in masonry walls. Night-work only on occupied floors. Existing PMS must stay.',
    'Lock vendor vs. existing door hardware. Whether IPTV is replaced or the current platform is extended.'
  )
on conflict (id) do nothing;

-- Trigger already inserted empty checklist rows; overlay demo scope notes.
update public.brief_scope_items set
  in_scope = true,
  note = 'New IDF in service corridor. No public-facing racks.'
where brief_id = 'b1111111-1111-4111-8111-111111111111'
  and category_key = 'structured_cabling';

update public.brief_scope_items set
  in_scope = true,
  note = 'Guest + staff SSIDs. Heat map after furniture lock.'
where brief_id = 'b1111111-1111-4111-8111-111111111111'
  and category_key = 'wireless';

update public.brief_scope_items set
  in_scope = true,
  note = 'Dock-side room: 1 projection + speech reinforcement.'
where brief_id = 'b1111111-1111-4111-8111-111111111111'
  and category_key = 'av_events';

update public.brief_scope_items set
  in_scope = true,
  note = 'Members entrance + staff door. No turnstiles.'
where brief_id = 'b1111111-1111-4111-8111-111111111111'
  and category_key = 'access_control';

update public.brief_scope_items set
  in_scope = true,
  note = 'Replace in-room TVs; keep existing headend if viable.'
where brief_id = 'b2222222-2222-4222-8222-222222222222'
  and category_key = 'iptv';

update public.brief_scope_items set
  in_scope = true,
  note = 'Guest rooms + circulation. Staff WLAN separate.'
where brief_id = 'b2222222-2222-4222-8222-222222222222'
  and category_key = 'wireless';

update public.brief_scope_items set
  in_scope = true,
  note = 'Must mate with existing listed door leafs.'
where brief_id = 'b2222222-2222-4222-8222-222222222222'
  and category_key = 'access_control';

update public.brief_scope_items set
  in_scope = true,
  note = 'Stay-put. Integration only.'
where brief_id = 'b2222222-2222-4222-8222-222222222222'
  and category_key = 'pms';
