"use client";

export default function SupportTab() {
  return (
    <div className="max-w-xl">
      <div className="rounded-xl2 border border-ink/10 p-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink/50 uppercase tracking-wide mb-4">
          Coming soon
        </div>
        <h2 className="text-xl font-bold">Premium Support</h2>
        <p className="mt-2 text-sm text-ink/60">
          Talk through your results with an AI coach that knows your attempt
          history — what to work on, how to fix it, and what to drill next.
        </p>
        <button
          disabled
          className="mt-6 rounded-xl2 bg-brand text-white font-semibold px-6 py-3 opacity-40 cursor-not-allowed"
        >
          Start a conversation
        </button>
      </div>
    </div>
  );
}
