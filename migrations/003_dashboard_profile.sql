-- Dashboard: extended profile fields (contact info, academic & work
-- history) used by the new /dashboard page. Additive & idempotent — safe
-- to run against the live database; existing rows fall back to sensible
-- defaults (null / '[]').
--
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New
-- query, paste, run).

alter table profiles
  add column if not exists phone text,
  add column if not exists phone_verified boolean not null default false,
  add column if not exists academic_history jsonb not null default '[]'::jsonb,
  add column if not exists work_experience jsonb not null default '[]'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

-- academic_history entries: { degree, field, institution, start_year, end_year }
-- work_experience entries: { title, company, industry, start_year, end_year, is_current }
