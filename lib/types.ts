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

export interface TestAttempt {
  id: string;
  user_id: string;
  mode: Mode;
  section: Section | null;
  topic: string | null;
  status: "in_progress" | "completed" | "abandoned";
  current_difficulty: number;
  score: number | null;
}

// ---- Data Insights ----------------------------------------------------
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
  score: number | null;
}
