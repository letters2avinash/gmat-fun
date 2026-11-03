"use client";

import { useEffect, useRef, useState } from "react";
import { seriesFetch } from "@/lib/series/client";

type Msg = { role: "user" | "assistant"; content: string };

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: { 0: { transcript: string } }[] }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getSpeech(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Chat panel for one question of a submitted attempt, run by "Avinash".
// The parent mounts it with key={n}, so each question starts its own conversation.
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
  const [expanded, setExpanded] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const [listening, setListening] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCanSpeak(getSpeech() !== null);
  }, []);

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

  function toggleVoice() {
    const Speech = getSpeech();
    if (!Speech) return;
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new Speech();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const said = e.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev} ${said}` : said));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  function exportChat() {
    const lines = [`Avinash · GMAT Verbal · Question ${n}`, ""];
    for (const m of messages) lines.push(`${m.role === "user" ? "You" : "Avinash"}: ${m.content}`, "");
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `avinash-question-${n}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const shell = expanded
    ? "fixed inset-4 z-[150] flex flex-col overflow-hidden rounded-xl2 bg-white shadow-2xl"
    : "flex h-full flex-col";

  return (
    <div className={shell}>
      <div className="flex items-center justify-between gap-2 border-b border-ink/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">A</div>
          <div>
            <p className="font-medium">Avinash <span className="text-xs font-normal text-ink/50">· AI tutor</span></p>
            <p className="text-xs text-ink/60">Question {n}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <button onClick={exportChat} disabled={messages.length === 0} title="Download this chat" className="rounded-full px-2 py-1 hover:bg-ink/5 disabled:opacity-40">⬇</button>
          <button onClick={() => setMinimised((v) => !v)} title={minimised ? "Restore" : "Minimise"} className="rounded-full px-2 py-1 hover:bg-ink/5">
            {minimised ? "▢" : "–"}
          </button>
          <button onClick={() => { setExpanded((v) => !v); setMinimised(false); }} title={expanded ? "Restore size" : "Full screen"} className="rounded-full px-2 py-1 hover:bg-ink/5">
            {expanded ? "⤡" : "⤢"}
          </button>
          <button onClick={onClose} className="rounded-full border border-ink/15 px-3 py-1">Close</button>
        </div>
      </div>

      {minimised ? null : (
        <>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-[15px]">
            {messages.length === 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-ink/60">Ask me anything about this question. 👇</p>
                {["Why is the correct answer right? ✅", "Why is my answer wrong? ❌", "Explain the reasoning step by step → "].map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-lg border border-ink/10 px-3 py-2 text-left text-sm hover:border-brand/40">
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[90%] whitespace-pre-line rounded-xl2 px-3 py-2 leading-relaxed ${
                  m.role === "user" ? "ml-auto bg-brand text-white" : "border border-ink/10 bg-canvas"
                }`}
              >
                {m.content}
              </div>
            ))}
            {busy ? <p className="text-sm text-ink/50">Avinash is thinking… 🤔</p> : null}
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
            {canSpeak ? (
              <button type="button" onClick={toggleVoice} title={listening ? "Stop" : "Speak your doubt"} className={`rounded-lg border px-3 py-2 text-sm ${listening ? "border-danger text-danger" : "border-ink/15"}`}>
                {listening ? "■ Stop" : "🎤"}
              </button>
            ) : null}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type or speak your doubt…"
              maxLength={2000}
              className="flex-1 rounded-lg border border-ink/15 px-3 py-2 text-[15px]"
            />
            <button disabled={busy || !input.trim()} className="rounded-lg bg-ink px-4 py-2 text-sm text-white disabled:opacity-50">
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
}
