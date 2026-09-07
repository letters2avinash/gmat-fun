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
  -- Critical Reasoning metadata (null for PS/DS rows)
  cr_subtype text,               -- e.g. 'Assumption', 'Weaken' — also used as `topic` for CR rows
  structure_tag text,
  near_miss_choice text,
  near_miss_note text,
  item_ref text,                 -- original item id from the content generator, for traceability
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

-- Data Insights: doesn't fit the single-question/single-choice `questions`
-- model above (multi-part answers, tables, charts), so it gets its own
-- table. `raw` is the full original record from the content generator —
-- see lib/di.ts for the fields each di_type expects inside it.
create table if not exists di_items (
  id uuid primary key default uuid_generate_v4(),
  di_type text not null check (di_type in ('two_part_analysis', 'multi_source_reasoning', 'table_analysis', 'graphics_interpretation')),
  category text,                -- 'math' | 'non-math'
  difficulty text,               -- 'Easy' | 'Medium' | 'Hard' (text, unlike questions.difficulty)
  topic text,
  item_ref text,
  raw jsonb not null,
  source_file text,
  created_at timestamptz not null default now()
);

create index if not exists idx_di_items_type on di_items(di_type);

alter table di_items enable row level security;
create policy "read di_items" on di_items
  for select using (auth.role() = 'authenticated');

create table if not exists di_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  di_type text not null default 'mixed',   -- one of the di_items.di_type values, or 'mixed'
  category text not null default 'mixed',  -- 'math' | 'non-math' | 'mixed'
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  total int not null default 0,
  correct int not null default 0,
  score numeric,                            -- percentage, set on finish
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists di_attempt_responses (
  id uuid primary key default uuid_generate_v4(),
  attempt_id uuid not null references di_attempts(id) on delete cascade,
  item_id uuid not null references di_items(id),
  submission jsonb not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);

create index if not exists idx_di_attempt_responses_attempt
  on di_attempt_responses (attempt_id);

alter table di_attempts enable row level security;
alter table di_attempt_responses enable row level security;

create policy "own di attempts" on di_attempts
  for all using (auth.uid() = user_id);

create policy "own di responses" on di_attempt_responses
  for all using (
    exists (
      select 1 from di_attempts
      where di_attempts.id = di_attempt_responses.attempt_id
      and di_attempts.user_id = auth.uid()
    )
  );
