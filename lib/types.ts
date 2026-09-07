export type Section = "quant" | "verbal" | "data_insights";
export type Mode = "topic" | "sectional" | "full-length";

export interface Question {
  id: string;
  section: Section;
  topic: string;
  question_type: string;
  difficulty: number; // 1-5
  prompt: string;
  choices: { key: string; text: string }[];
  correct_choice: string;
  explanation: string | null;
}

// A question as returned mid-test — never carries the answer key.
export type SafeQuestion = Omit<Question, "correct_choice" | "explanation">;

export interface TestAttempt {
  id: string;
  user_id: string;
  mode: Mode;
  section: Section | null;
  topic: string | null;
  question_type: string | null;
  status: "in_progress" | "completed" | "abandoned";
  current_difficulty: number;

  // GMAT Focus-style adaptive scoring state — see lib/scoring.ts.
  current_theta: number; // used by topic/sectional (single-section) attempts
  quant_theta: number; // used by full-length's quant module
  verbal_theta: number; // used by full-length's verbal module
  quant_answered: number;
  verbal_answered: number;
  quant_score: number | null; // 60-90 scaled score
  verbal_score: number | null; // 60-90 scaled score
  di_score: number | null; // 60-90 scaled score (pulled from the linked di_attempts row)
  total_score: number | null; // 205-805, full-length only
  current_section: Section | null; // full-length: which module is active
  di_attempt_id: string | null; // full-length: linked di_attempts row for the DI module
  flagged: string[]; // question ids flagged for end-of-module review
  quant_edits_used: number;
  verbal_edits_used: number;
  di_edits_used: number;

  score: number | null; // legacy single-section score, kept for backward compat
}

export interface ReviewResponse {
  questionId: string;
  section: Section;
  topic: string;
  prompt: string;
  choices: { key: string; text: string }[];
  selectedChoice: string | null;
  correctChoice: string;
  isCorrect: boolean;
  explanation: string | null;
  flagged: boolean;
}

// ---- Data Insights ------------------------------------------------------
// DI content doesn't fit the single-question/single-choice `questions`
// model above (multi-part answers, tables, charts) — it lives in its own
// `di_items` table and gets its own practice flow. See lib/di.ts.

export type DiType =
  | "two_part_analysis"
  | "multi_source_reasoning"
  | "table_analysis"
  | "graphics_interpretation";

export type DiCategory = "math" | "non-math";

export interface DiAttempt {
  id: string;
  user_id: string;
  di_type: DiType | "mixed";
  category: DiCategory | "mixed";
  status: "in_progress" | "completed" | "abandoned";
  total: number;
  correct: number;
  score: number | null; // legacy percentage score

  current_theta: number;
  scaled_score: number | null; // 60-90 GMAT Focus-style Data Insights score
  parent_test_attempt_id: string | null; // set when this is the DI module of a full-length test
  flagged: string[];
  edits_used: number;
}

// ---- Dashboard: profile, contact & history --------------------------

export interface AcademicEntry {
  degree: string;
  field: string;
  institution: string;
  start_year: string;
  end_year: string;
}

export interface WorkEntry {
  title: string;
  company: string;
  industry: string;
  start_year: string;
  end_year: string;
  is_current: boolean;
}

export interface Profile {
  id: string;
  full_name: string | null;
  target_score: number | null;
  target_test_date: string | null;
  phone: string | null;
  phone_verified: boolean;
  academic_history: AcademicEntry[];
  work_experience: WorkEntry[];
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author_name: string;
  cover_emoji: string;
  published_at: string;
}

export interface ForumCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
}

export interface ForumThread {
  id: string;
  category_id: string;
  author_name: string;
  title: string;
  body: string;
  created_at: string;
}

export interface ForumPost {
  id: string;
  thread_id: string;
  author_name: string;
  body: string;
  created_at: string;
}
