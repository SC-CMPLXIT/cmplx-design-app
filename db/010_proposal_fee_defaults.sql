-- CMPLX iT Design — lower starting design-fee hours (v1.6.1)
-- Apply after 009. Safe to re-run.
-- Matches src/lib/proposal-fee.ts. Changes column defaults only.
-- Does not UPDATE stored drafts. Rates and ca_site_days (default 4) stay as they are.
alter table public.project_proposals
  alter column bod_design_hours_per_1000 set default 3,
  alter column bod_drafting_hours_per_1000 set default 1,
  alter column dd_design_hours_per_1000 set default 5,
  alter column dd_drafting_hours_per_1000 set default 4,
  alter column ca_design_hours_per_1000 set default 1,
  alter column ca_drafting_hours_per_1000 set default 0.5;
