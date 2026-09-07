-- GMAT Focus-style adaptive scoring, answer-reveal-at-end, and end-of-module
-- review/flag support. Additive & idempotent — safe to run against the live
-- database; existing rows fall back to sensible defaults (0 / null / '[]').
--
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New
-- query, paste, run). See lib/scoring.ts for what these columns drive.

alter table test_attempts
  add column if not exists question_type text,
  add column if not exists current_theta numeric not null default 0,
  add column if not exists quant_theta numeric not null default 0,
  add column if not exists verbal_theta numeric not null default 0,
  add column if not exists quant_answered int not null default 0,
  add column if not exists verbal_answered int not null default 0,
  add column if not exists quant_score smallint,
  add column if not exists verbal_score smallint,
  add column if not exists di_score smallint,
  add column if not exists total_score smallint,
  add column if not exists current_section text,
  add column if not exists di_attempt_id uuid,
  add column if not exists flagged jsonb not null default '[]'::jsonb,
  add column if not exists quant_edits_used int not null default 0,
  add column if not exists verbal_edits_used int not null default 0,
  add column if not exists di_edits_used int not null default 0;

alter table di_attempts
  add column if not exists current_theta numeric not null default 0,
  add column if not exists scaled_score smallint,
  add column if not exists parent_test_attempt_id uuid references test_attempts(id) on delete cascade,
  add column if not exists flagged jsonb not null default '[]'::jsonb,
  add column if not exists edits_used int not null default 0;

create index if not exists idx_di_attempts_parent on di_attempts(parent_test_attempt_id);
