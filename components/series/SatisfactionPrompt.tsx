"use client";

import { useEffect, useState } from "react";

const KEY = "avinash-satisfaction-v1";
const SHARE_TEXT = "I'm practising GMAT Verbal on this test series with an AI tutor. Try it: https://sazzag.gmat.fun";

// Occasional "do you like it?" prompt. Answered once per browser (local storage).
export default function SatisfactionPrompt() {
  const [step, setStep] = useState<"hidden" | "ask" | "share" | "done">("hidden");

  useEffect(() => {
    let answered = false;
    try {
      answered = localStorage.getItem(KEY) === "answered";
    } catch {
      answered = false;
    }
    if (answered) return;
    const t = setTimeout(() => setStep("ask"), 30000);
    return () => clearTimeout(t);
  }, []);

  function finish() {
    try {
      localStorage.setItem(KEY, "answered");
    } catch {
      /* storage unavailable: the prompt may show again, which is fine */
    }
    setStep("hidden");
  }

  async function shareNow() {
    try {
      if (navigator.share) {
        await navigator.share({ text: SHARE_TEXT });
      } else {
        await navigator.clipboard.writeText(SHARE_TEXT);
        alert("Link copied. Paste it anywhere you like. 🙌");
      }
    } catch {
      /* user cancelled */
    }
    setStep("done");
    finish();
  }

  if (step === "hidden") return null;

  return (
    <div className="fixed bottom-4 right-4 z-[120] w-[min(340px,calc(100vw-2rem))] rounded-xl2 border border-ink/10 bg-white p-5 shadow-2xl">
      {step === "ask" ? (
        <>
          <p className="font-medium">Do you like what you see? 🙂</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setStep("share")} className="rounded-full bg-ink px-4 py-2 text-sm text-white">Yes</button>
            <button onClick={finish} className="rounded-full border border-ink/15 px-4 py-2 text-sm">Not yet</button>
          </div>
        </>
      ) : null}
      {step === "share" ? (
        <>
          <p className="font-medium">Would you recommend us to a friend or share on social media? 📣</p>
          <div className="mt-3 flex gap-2">
            <button onClick={shareNow} className="rounded-full bg-ink px-4 py-2 text-sm text-white">Yes, share</button>
            <button onClick={finish} className="rounded-full border border-ink/15 px-4 py-2 text-sm">Maybe later</button>
          </div>
        </>
      ) : null}
      {step === "done" ? <p className="font-medium">Thank you! 🙏</p> : null}
    </div>
  );
}
