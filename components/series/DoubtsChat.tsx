"use client";

import { useEffect, useRef, useState } from "react";
import { seriesFetch } from "@/lib/series/client";

type Msg = { role: "user" | "assistant"; content: string };

// Chat panel for one question of a submitted attempt. The parent mounts it
// with key={n}, so each question starts its own conversation.
export default function DoubtsChat({
  attemptId,
  n,
  onClose,
}: {
  attemptId: string;
  n: number;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const res = await seriesFetch<{ reply: string }>("/api/series/chat", {
        method: "POST",
        body: { attemptId, n, messages: next },
      });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
        <div>
          <p className="font-medium">Doubts assistant</p>
          <p className="text-xs text-ink/60">Question {n}</p>
        </div>
        <button onClick={onClose} className="rounded-full border border-ink/15 px-3 py-1 text-sm">
          Close
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-[15px]">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-ink/60">Ask anything about this question.</p>
            {["Why is the correct answer right?", "Why is my answer wrong?", "Explain the reasoning step by step"].map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-lg border border-ink/10 px-3 py-2 text-left text-sm hover:border-brand/40"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[90%] whitespace-pre-line rounded-xl2 px-3 py-2 leading-relaxed ${
              m.role === "user" ? "ml-auto bg-brand text-white" : "bg-canvas border border-ink/10"
            }`}
          >
            {m.content}
          </div>
        ))}
        {busy ? <p className="text-sm text-ink/50">Thinking…</p> : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-ink/10 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your doubt…"
          maxLength={2000}
          className="flex-1 rounded-lg border border-ink/15 px-3 py-2 text-[15px]"
        />
        <button disabled={busy || !input.trim()} className="rounded-lg bg-ink px-4 py-2 text-sm text-white disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
}
