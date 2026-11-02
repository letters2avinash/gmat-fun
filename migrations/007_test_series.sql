-- sazzag.gmat.fun — test series
--
-- Run once in the Supabase SQL editor. Additive and idempotent.
--
-- Access model: the series is served by server routes only (service role).
-- Both tables have RLS enabled with NO policies, so browsers using the anon
-- key can never read or write them directly.

-- Who may use the series. Add a row per student after they sign up.
create table if not exists series_access (
  email      text primary key,            -- lower-case login email
  series     text not null default 'sazzag',
  created_at timestamptz not null default now()
);

-- One row per attempt at one of the tests.
create table if not exists series_attempts (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,           -- lower-case login email
  test_id       int  not null,
  status        text not null default 'in_progress'
                  check (status in ('in_progress', 'submitted')),
  started_at    timestamptz not null default now(),
  submitted_at  timestamptz,
  answers       jsonb not null default '{}'::jsonb,   -- {"1":"B", ...}
  times_ms      jsonb not null default '{}'::jsonb,   -- {"1": 42000, ...}
  flagged       jsonb not null default '[]'::jsonb,   -- [3, 17]
  correct       int,
  total         int not null default 23,
  time_used_sec int,
  auto_submitted boolean not null default false
);

create index if not exists series_attempts_email_test_idx
  on series_attempts (email, test_id);
create index if not exists series_attempts_email_status_idx
  on series_attempts (email, status);

alter table series_access   enable row level security;
alter table series_attempts enable row level security;
