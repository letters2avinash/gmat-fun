import Link from "next/link";

const MODES = [
  {
    key: "topic",
    title: "Topic-wise",
    href: "/test/topic",
    blurb: "Drill one topic at a time — Quant, Verbal (Critical Reasoning), or Data Insights.",
  },
  {
    key: "sectional",
    title: "Sectional",
    href: "/test/sectional",
    blurb: "One full timed, adaptive section — Quant, Verbal, or Data Insights.",
  },
  {
    key: "full-length",
    title: "Full-length",
    href: "/test/full-length",
    blurb: "The real GMAT Focus simulation — Quant, Verbal, and Data Insights, scored 205–805.",
  },
  {
    key: "data-insights",
    title: "Data Insights",
    href: "/practice/data-insights",
    blurb: "Two-Part Analysis, Multi-Source Reasoning, Table Analysis, Graphics Interpretation.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between max-w-5xl mx-auto w-full">
        <span className="text-xl font-bold tracking-tight">
          gmat<span className="text-brand">.fun</span>
        </span>
        <nav className="hidden sm:flex gap-6 text-sm font-medium text-ink/70 items-center">
          <a href="#tests">Tests</a>
          <a href="#chat">AI Tutor</a>
          <a href="#blog">Blog</a>
          <Link
            href="/auth"
            className="rounded-xl2 border border-ink/10 px-4 py-2 text-ink"
          >
            Log in
          </Link>
        </nav>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
          GMAT prep that adapts to <span className="text-brand">you</span>.
        </h1>
        <p className="mt-5 text-lg text-ink/70 max-w-xl">
          Adaptive tests, an AI tutor for every question, and support for the
          entire admissions journey — from SOPs to score reports. Built to
          feel effortless on your phone.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            href="/test/full-length"
            className="rounded-xl2 bg-brand text-white px-7 py-3.5 font-semibold shadow-lg shadow-brand/20 active:scale-[0.98] transition"
          >
            Start a free test
          </Link>
          <a
            href="#tests"
            className="rounded-xl2 bg-white border border-ink/10 px-7 py-3.5 font-semibold text-ink active:scale-[0.98] transition"
          >
            See test modes
          </a>
        </div>
      </section>

      <section id="tests" className="px-6 pb-20 max-w-5xl mx-auto w-full">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODES.map((m) => (
            <Link
              key={m.key}
              href={m.href}
              className="rounded-xl2 bg-white border border-ink/10 p-6 hover:border-brand/40 hover:shadow-md transition"
            >
              <h3 className="font-bold text-lg">{m.title}</h3>
              <p className="mt-2 text-sm text-ink/60">{m.blurb}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
