-- Blog + Forum: content tables to support the new /blog and /forum sections.
-- Additive & idempotent — safe to run against the live database.

-- ---------- Blog ----------
create table if not exists blog_posts (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  excerpt text not null,
  content text not null, -- markdown-ish plain text, rendered as paragraphs
  author_name text not null default 'GMAT PREP Team',
  cover_emoji text not null default '📈',
  published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table blog_posts enable row level security;

drop policy if exists "public can read published posts" on blog_posts;
create policy "public can read published posts"
  on blog_posts for select
  using (published = true);

-- ---------- Forum ----------
create table if not exists forum_categories (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  description text not null default '',
  sort_order int not null default 0
);

alter table forum_categories enable row level security;

drop policy if exists "public can read categories" on forum_categories;
create policy "public can read categories"
  on forum_categories for select
  using (true);

create table if not exists forum_threads (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid not null references forum_categories(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Member',
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table forum_threads enable row level security;

drop policy if exists "public can read threads" on forum_threads;
create policy "public can read threads"
  on forum_threads for select
  using (true);

drop policy if exists "authenticated users can create threads" on forum_threads;
create policy "authenticated users can create threads"
  on forum_threads for insert
  with check (auth.uid() = author_id);

create table if not exists forum_posts (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid not null references forum_threads(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Member',
  body text not null,
  created_at timestamptz not null default now()
);

alter table forum_posts enable row level security;

drop policy if exists "public can read posts" on forum_posts;
create policy "public can read posts"
  on forum_posts for select
  using (true);

drop policy if exists "authenticated users can create posts" on forum_posts;
create policy "authenticated users can create posts"
  on forum_posts for insert
  with check (auth.uid() = author_id);

-- ---------- Seed categories ----------
insert into forum_categories (slug, name, description, sort_order) values
  ('strategy', 'Strategy & Study Plans', 'Timelines, study plans, and how to balance prep with work or school.', 1),
  ('quant', 'Quant', 'Problem Solving, Data Sufficiency, and quant-specific questions.', 2),
  ('verbal', 'Verbal', 'Critical Reasoning, Reading Comprehension, and verbal strategy.', 3),
  ('data-insights', 'Data Insights', 'Multi-Source Reasoning, Table Analysis, Two-Part Analysis, Graphics.', 4),
  ('admissions', 'Admissions & Applications', 'Scores, schools, SOPs, and everything after the test.', 5)
on conflict (slug) do nothing;

-- ---------- Seed blog posts ----------
insert into blog_posts (slug, title, excerpt, content, author_name, cover_emoji, published_at) values
(
  'how-adaptive-scoring-works',
  'How GMAT Focus adaptive scoring actually works',
  'A section-by-section walkthrough of how your answers move your score in real time — and why "harder questions are worth more" is a myth.',
  E'The GMAT Focus Edition uses a section-adaptive model: your performance on earlier questions shifts the difficulty (and information value) of what you see next.\n\nEach of the three sections — Quant, Verbal, and Data Insights — is scored independently on a 60-90 scale, then combined into your 205-805 total. There is no separate "essay" or unscored section anymore, so every question you see counts.\n\nThe most common misconception is that a single hard question, answered correctly, can dramatically swing your score. In practice the engine is closer to a running estimate of your ability (a theta score, in psychometric terms) that gets refined with every response — one question rarely moves the needle much on its own. What matters far more is consistency: strong accuracy sustained across the section outperforms a few lucky guesses on hard questions offset by careless errors on easy ones.\n\nPractically, this means your prep should optimize for consistency under time pressure, not for "surviving" a few landmine questions. Build the habit of moving on quickly from questions you are unsure of rather than burning your clock — a rushed, panicked last five questions will cost you more than the one hard question you skipped.',
  'GMAT PREP Team',
  '📊',
  now() - interval '9 days'
),
(
  'data-insights-two-part-analysis-strategy',
  'A 3-step framework for Two-Part Analysis',
  'Two-Part Analysis questions look intimidating because of the table format — here is a repeatable way to break them down fast.',
  E'Two-Part Analysis (TPA) is one of the more format-heavy question types in Data Insights, and a lot of test-takers lose time simply figuring out what is being asked before they even start solving.\n\nHere is a three-step framework that works for the vast majority of TPA questions:\n\n1. Read the prompt once for structure only. Identify the two things you are solving for (they are almost always related — one depends on the other, or they are two ends of the same relationship) before you read any answer choices.\n\n2. Set up the relationship algebraically or logically before touching the table. Most TPA questions are really a single equation or logical constraint wearing a table costume. Write it down.\n\n3. Use the answer choices as a shortcut, not a last resort. Once you know the relationship, plug in values from the shared answer column rather than solving from scratch — this is often faster than isolating variables by hand, especially under time pressure.\n\nThe biggest time sink is re-reading the prompt multiple times because the two-column format feels unfamiliar. Practicing the "read for structure first" habit on even a handful of questions makes the format stop feeling foreign.',
  'GMAT PREP Team',
  '🧮',
  now() - interval '5 days'
),
(
  'building-a-12-week-study-plan',
  'Building a realistic 12-week GMAT study plan around a full-time job',
  'Most study plans assume you have unlimited free time. This one assumes you have an actual job — here is how to structure it.',
  E'If you are studying for the GMAT while working full-time, the constraint is never really "how much do I need to know" — it is "how do I protect consistent study time without burning out before test day."\n\nA structure that works well for a 12-week runway:\n\nWeeks 1-3: Diagnose and rebuild foundations. Take one full-length test in week 1 to get a real baseline (not a guess), then spend the next two weeks on the weakest of the three sections using topic-wise practice rather than full sections — you want reps on the specific skill, not more timed pressure yet.\n\nWeeks 4-8: Structured section work. Rotate through Quant, Verbal, and Data Insights on a weekly cycle, using sectional-length practice (not full-length) so each session fits into an evening. This is where most of your score improvement happens — it is unglamorous, repetitive skill-building.\n\nWeeks 9-11: Full-length simulation. Take a full-length adaptive test roughly once a week, at the same time of day as your actual exam if possible, and spend the days between reviewing every miss — not just redoing similar questions, but understanding the specific reasoning gap that caused the error.\n\nWeek 12: Taper. Light review only, protect your sleep, and treat the last 2-3 days before the test as recovery, not cramming.\n\nThe single highest-leverage habit across all 12 weeks: review every practice attempt in detail rather than just checking the score. The score tells you where you stand; the review tells you what to actually do about it.',
  'GMAT PREP Team',
  '🗓️',
  now() - interval '2 days'
)
on conflict (slug) do nothing;
