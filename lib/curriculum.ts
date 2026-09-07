// Phase 1 of the Learn / LMS section: a static, hand-curated lesson
// library organizing existing Quant / Verbal / Data Insights content into
// a real curriculum path. Each lesson links back into the existing
// practice flows; per-section progress is computed from real attempt
// data (see app/learn/page.tsx), not from anything stored here.
//
// Phase 2 (deferred until real video content exists): uploadable/embeddable
// video lessons, modules, and enrollment — this file is where that would
// plug in, alongside these text lessons.

export interface Lesson {
  slug: string;
  title: string;
  summary: string;
  content: string[]; // paragraphs
}

export interface CurriculumSection {
  key: "quant" | "verbal" | "data_insights";
  label: string;
  blurb: string;
  practiceHref: string;
  lessons: Lesson[];
}

export const CURRICULUM: CurriculumSection[] = [
  {
    key: "quant",
    label: "Quant",
    blurb: "Problem Solving and Data Sufficiency — arithmetic, algebra, and word-problem reasoning.",
    practiceHref: "/practice/quant",
    lessons: [
      {
        slug: "data-sufficiency-fundamentals",
        title: "Data Sufficiency: the four-step approach",
        summary: "Why DS is a logic test wearing a math costume, and how to attack it consistently.",
        content: [
          "Data Sufficiency questions don't ask you to solve — they ask whether you *could* solve, given each statement. That distinction is the entire game: test-takers who instinctively start calculating usually do unnecessary work and run out of time.",
          "A reliable four-step approach: (1) simplify the question stem into its simplest logical form before looking at the statements, (2) evaluate Statement (1) alone, (3) evaluate Statement (2) alone — forgetting everything you learned from Statement (1), and (4) only if needed, combine them.",
          "The most common error is 'statement carryover' — letting information from Statement (1) leak into your evaluation of Statement (2). Cover Statement (1) with your hand (physically, if it helps) while judging Statement (2) in isolation.",
          "Practice recognizing sufficiency without fully solving: if a statement pins a variable to exactly one value (even if you don't compute it), that's sufficient. You rarely need the actual number — you need to know a unique answer exists.",
        ],
      },
      {
        slug: "algebra-translation",
        title: "Translating word problems into algebra",
        summary: "A repeatable process for turning dense word problems into equations you can actually solve.",
        content: [
          "Most Quant word problems are not hard once translated correctly — they're hard because the translation step is rushed. Read the entire problem once before writing anything, identifying what is being asked before you define variables.",
          "Assign variables to the actual unknowns the question asks about, not to intermediate quantities mentioned in the setup. This keeps your final equation directly answerable instead of requiring an extra conversion step at the end.",
          "Watch for 'of' (multiplication), 'is'/'was' (equals), and ratio language ('for every,' 'per') — these are the highest-value words to translate literally and immediately, since misreading them is the single most common source of algebra errors on this test.",
          "When a problem feels unsolvable algebraically under time pressure, backsolving from the answer choices is a legitimate, fast strategy — start from the middle answer choice and adjust up or down based on whether it's too large or too small.",
        ],
      },
      {
        slug: "number-properties",
        title: "Number properties: the shortcuts worth memorizing",
        summary: "Even/odd, divisibility, and remainders — the recurring building blocks of quant questions.",
        content: [
          "A large share of quant questions test number properties indirectly, inside a word problem or DS statement. Knowing a handful of rules cold — even × even = even, odd × odd = odd, the sum of two odds is even, and so on — turns a multi-step algebra problem into a 10-second logic check.",
          "Divisibility and remainders show up constantly in 'what is the smallest/largest value of...' questions. If a number is divisible by both 4 and 6, it must be divisible by their least common multiple (12) — not merely their product (24).",
          "Prime factorization is the single highest-leverage tool for LCM/GCD, divisor-counting, and 'is this a perfect square' questions. Practice breaking numbers into primes quickly rather than relying on trial and error.",
        ],
      },
    ],
  },
  {
    key: "verbal",
    label: "Verbal",
    blurb: "Critical Reasoning and Reading Comprehension — argument structure and evidence-based reading.",
    practiceHref: "/practice/verbal",
    lessons: [
      {
        slug: "critical-reasoning-argument-structure",
        title: "Breaking down a Critical Reasoning argument",
        summary: "Separate premise, assumption, and conclusion before you ever look at the answer choices.",
        content: [
          "Every Critical Reasoning argument has a conclusion (the author's claim), premises (the stated evidence), and — critically — an unstated assumption bridging the two. Most wrong answers are wrong because they attack the premises, which the question never asked you to do.",
          "Before reading the answer choices, state the assumption in your own words. If asked to weaken the argument, the correct answer will attack that specific assumption — not just introduce vaguely related negative information.",
          "For Strengthen and Weaken questions, correct answers usually address the *gap* between premise and conclusion, not the premise or conclusion individually. If an answer choice would matter even in a world where the assumption were true, it's very likely a trap.",
          "Assumption questions have a useful reverse-check: negate the answer choice you think is correct. If the negation destroys the argument, you've found the assumption; if the argument still stands, that answer was not actually necessary.",
        ],
      },
      {
        slug: "reading-comprehension-strategy",
        title: "Reading Comprehension without re-reading everything",
        summary: "How to read a dense passage once, efficiently, and still answer detail questions accurately.",
        content: [
          "The instinct to re-read the entire passage for every question is what kills RC pacing. Instead, read actively the first time: track the author's main point, the structure (does paragraph 2 support or complicate paragraph 1?), and any obvious shifts in tone or argument.",
          "Detail questions are open-book — you're allowed, and expected, to go back and verify the exact wording rather than trusting memory. The failure mode isn't forgetting details; it's not noticing when an answer choice subtly overstates or narrows what the passage actually said.",
          "Inference questions require the least new information and the most caution: correct answers are almost always a modest, defensible restatement of something implied by the text — not a bold new claim, however 'reasonable' it sounds.",
        ],
      },
    ],
  },
  {
    key: "data_insights",
    label: "Data Insights",
    blurb: "Multi-Source Reasoning, Table Analysis, Two-Part Analysis, and Graphics Interpretation.",
    practiceHref: "/practice/data-insights",
    lessons: [
      {
        slug: "multi-source-reasoning",
        title: "Multi-Source Reasoning: reading across tabs",
        summary: "The skill this question type actually tests is synthesis, not speed-reading.",
        content: [
          "Multi-Source Reasoning presents information split across two or three tabs (often an email, a table, and a memo). The test is deliberately checking whether you can hold information from one tab in mind while reading another — don't try to memorize everything up front.",
          "Read each tab once for its role (what kind of information does this tab contain?) before diving into any single question. Then, for each question, identify which tab(s) it actually requires — many wrong answers are correct-sounding statements that rely on a tab the question doesn't reference.",
          "MSR frequently includes multiple true/false sub-questions per prompt, each independently scored. Treat each one as its own Data Sufficiency-style check rather than assuming a pattern across them.",
        ],
      },
      {
        slug: "table-analysis-sorting",
        title: "Table Analysis: sort before you scan",
        summary: "Using the built-in sort function to avoid manual scanning under time pressure.",
        content: [
          "Table Analysis questions include a sortable table — use it. If a question asks about the highest, lowest, or Nth-ranked value in a column, sort by that column immediately rather than scanning visually, which is slower and more error-prone.",
          "Watch for questions that require a computed value not directly in the table (a difference, a ratio, a percentage change) — these often require sorting by one column, computing manually for a subset of rows, and are a common source of careless arithmetic errors under time pressure.",
        ],
      },
      {
        slug: "graphics-interpretation",
        title: "Graphics Interpretation: reading the axes first",
        summary: "The fastest way to avoid the #1 error type in this question format.",
        content: [
          "Before answering, identify exactly what each axis represents and its units — a large share of errors come from misreading a percentage axis as an absolute-count axis, or vice versa.",
          "Graphics Interpretation answers are filled in via dropdown, which means the answer set is fixed and often includes 'trap' values corresponding to a common misread (e.g., reading the wrong series in a multi-line chart). Double-check which series or category a value belongs to before selecting.",
        ],
      },
    ],
  },
];
