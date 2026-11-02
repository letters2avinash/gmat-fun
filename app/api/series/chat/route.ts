import { NextRequest, NextResponse } from "next/server";
import { getFullTest, requireSeriesUser } from "@/lib/series/server";
import { getAttemptForUser } from "@/lib/series/attempts";
import { createServerSupabase } from "@/lib/supabase";

// POST /api/series/chat
// body: { attemptId, n, messages: [{ role: "user" | "assistant", content }] }
//
// Only available for SUBMITTED attempts: the chatbot is told the correct
// answer, so it must never run during a live test.

const MODEL = process.env.SERIES_CHAT_MODEL || "anthropic/claude-haiku-5.5";
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
        // Reasoning tokens count toward this cap, so leave generous room.
        max_tokens: 2500,
      }),
    });
    if (!res.ok) {
      // Log the upstream reason (never the key) so it shows in Vercel logs.
      const detail = await res.text().catch(() => "");
      console.error("[series/chat] OpenRouter HTTP", res.status, detail.slice(0, 500));
      return NextResponse.json({ error: "The assistant is unavailable right now." }, { status: 502 });
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const reply = json.choices?.[0]?.message?.content?.trim();
    if (!reply) return NextResponse.json({ error: "The assistant returned nothing." }, { status: 502 });

    // Keep the exchange so a teacher can review it. Best-effort: a logging
    // failure must never block the student's answer.
    const latestUser = [...history].reverse().find((m) => m.role === "user");
    const rows = [
      ...(latestUser ? [{ attempt_id: attempt.id, email: auth.email, n: q.n, role: "user", content: latestUser.content }] : []),
      { attempt_id: attempt.id, email: auth.email, n: q.n, role: "assistant", content: reply },
    ];
    await createServerSupabase().from("series_chat_messages").insert(rows);

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[series/chat] request failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The assistant is unavailable right now." }, { status: 502 });
  }
}
