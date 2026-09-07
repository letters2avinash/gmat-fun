"use client";

import Link from "next/link";

// Topic-wise practice spans two different content models (single-choice
// quant/verbal questions vs. multi-part Data Insights items), so it's a
// simple chooser into the three dedicated practice flows.
export default function TopicChooserPage() {
  const options = [
    { href: "/practice/quant", title: "Quant", blurb: "Problem Solving & Data Sufficiency, by topic." },
    { href: "/practice/verbal", title: "Verbal", blurb: "Critical Reasoning, by question type." },
    { href: "/practice/data-insights", title: "Data Insights", blurb: "All four DI question types." },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-lg w-full text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand mb-2">Topic-wise</p>
        <h1 className="text-3xl font-extrabold tracking-tight mb-8">What do you want to drill?</h1>
        <div className="grid gap-4">
          {options.map((o) => (
            <Link
              key={o.href}
              href={o.href}
              className="text-left rounded-xl2 bg-white border border-ink/10 p-6 hover:border-brand/40 hover:shadow-md transition"
            >
              <h3 className="font-bold text-lg">{o.title}</h3>
              <p className="mt-1 text-sm text-ink/60">{o.blurb}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
