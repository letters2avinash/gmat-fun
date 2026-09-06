-- gmat.fun database schema — run this once in the Supabase SQL editor
-- (Project > SQL Editor > New query, paste, run)

create extension if not exists "uuid-ossp";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  target_score int,
  target_test_date date,
  created_at timestamptz not null default now()
);

create table if not exists questions (
  id uuid primary key default uuid_generate_v4(),
  section text not null check (section in ('quant', 'verbal', 'data_insights')),
  topic text not null,
  question_type text not null, -- e.g. 'problem_solving', 'critical_reasoning', 'data_sufficiency'
  difficulty smallint not null check (difficulty between 1 and 5),
  prompt text not null,
  choices jsonb not null,       -- [{ "key": "A", "text": "..." }, ...]
  correct_choice text not null,
  explanation text,
  source text,                  -- 'original' | 'extracted:thegmatco' | etc — track provenance
  created_at timestamptz not null default now()
);

create index if not exists idx_questions_section_difficulty
  on questions (section, difficulty);

create table if not exists test_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  mode text not null check (mode in ('topic', 'sectional', 'full-length')),
  section text,                 -- required for topic/sectional, null for full-length
  topic text,                   -- required for topic mode only
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  current_difficulty smallint not null default 3,
  score numeric,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists attempt_responses (
  id uuid primary key default uuid_generate_v4(),
  attempt_id uuid not null references test_attempts(id) on delete cascade,
  question_id uuid not null references questions(id),
  selected_choice text,
  is_correct boolean,
  difficulty_at_time smallint not null,
  time_taken_seconds int,
  answered_at timestamptz not null default now()
);

create index if not exists idx_attempt_responses_attempt
  on attempt_responses (attempt_id);

-- Row Level Security: users can only see/write their own attempts.
alter table test_attempts enable row level security;
alter table attempt_responses enable row level security;
alter table profiles enable row level security;

create policy "own profile" on profiles
  for all using (auth.uid() = id);

create policy "own attempts" on test_attempts
  for all using (auth.uid() = user_id);

create policy "own responses" on attempt_responses
  for all using (
    exists (
      select 1 from test_attempts
      where test_attempts.id = attempt_responses.attempt_id
      and test_attempts.user_id = auth.uid()
    )
  );

-- questions table is readable by anyone signed in, writable only via the
-- service role key (used server-side by the admin content pipeline).
alter table questions enable row level security;
create policy "read questions" on questions
  for select using (auth.role() = 'authenticated');
