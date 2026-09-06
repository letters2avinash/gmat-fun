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
