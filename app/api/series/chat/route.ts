import { NextRequest, NextResponse } from "next/server";
import { getFullTest, requireSeriesUser } from "@/lib/series/server";
import { getAttemptForUser } from "@/lib/series/attempts";

// POST /api/series/chat
// body: { attemptId, n, messages: [{ role: "user" | "assistant", content }] }
//
// Only available for SUBMITTED attempts: the chatbot is told the correct
// answer, so it must never run during a live test.

const MODEL = process.env.SERIES_CHAT_MODEL || "anthropic/claude-sonnet-4";
const MAX_HISTORY = 12;
const MAX_CHARS = 2000;

export async function POST(req: NextRequest) {
  const auth = await requireSeriesUser(req);
  if ("response" in auth) return auth.response;

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "The doubts assistant is not configured yet." },
      { status: 503 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    attemptId?: string;
    n?: number;
    messages?: { role: string; content: string }[];
  };

  const attempt = body.attemptId ? await getAttemptForUser(body.attemptId, auth.email) : null;
  if (!attempt) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  if (attempt.status !== "submitted") {
    return NextResponse.json(
      { error: "Finish the test before asking the assistant about it." },
      { status: 403 }
    );
  }

  const test = getFullTest(attempt.test_id);
  const q = test?.questions.find((x) => x.n === Number(body.n));
  if (!test || !q) return NextResponse.json({ error: "Question not found." }, { status: 404 });

  const passage = q.passageId ? test.passages[q.passageId]?.text : null;
  const shared = q.stimulus ?? passage ?? "";
  const picked = attempt.answers[String(q.n)] ?? null;
  const optionLines = q.options.map((o) => `${o.key}. ${o.text}`).join("\n");

  const system = [
    "You are a patient GMAT Verbal tutor helping a student review a practice test they have already submitted.",
    "The question below is in the student's review. You know the correct answer.",
    "Explain clearly why the correct option is right, and if the student picked a different option, explain precisely why that option is wrong.",
    "For Critical Reasoning, name the argument's conclusion and premises and the reasoning gap. For Reading Comprehension, point to what the passage actually says.",
    "Use plain language. Keep answers short unless the student asks for more. Do not invent facts that are not in the passage or question.",
    "",
    `Test ${test.id}, question ${q.n} (${q.section === "CR" ? "Critical Reasoning" : "Reading Comprehension"}, type: ${q.type}).`,
    shared ? `\n--- Text ---\n${shared}` : "",
    `\n--- Question ---\n${q.stem}\n\n${optionLines}`,
    `\nCorrect answer: ${q.answer}`,
    `Student picked: ${picked ?? "nothing (unanswered)"}`,
  ]
    .filter(Boolean)
    .join("\n");

  const history = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "X-Title": "sazzag GMAT test series",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: system }, ...history],
        max_tokens: 700,
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "The assistant is unavailable right now." }, { status: 502 });
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const reply = json.choices?.[0]?.message?.content?.trim();
    if (!reply) return NextResponse.json({ error: "The assistant returned nothing." }, { status: 502 });
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ error: "The assistant is unavailable right now." }, { status: 502 });
  }
}
