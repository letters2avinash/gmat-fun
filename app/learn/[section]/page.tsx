import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { CURRICULUM } from "@/lib/curriculum";
import LearnProgress from "@/components/learn/LearnProgress";

export function generateStaticParams() {
  return CURRICULUM.map((s) => ({ section: s.key }));
}

export default async function LearnSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: key } = await params;
  const section = CURRICULUM.find((s) => s.key === key);
  if (!section) notFound();

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-14">
        <Link href="/learn" className="text-sm font-semibold text-brand">
          ← All sections
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{section.label}</h1>
        <p className="mt-2 text-ink/60">{section.blurb}</p>

        <LearnProgress sectionKey={section.key} />

        <Link
          href={section.practiceHref}
          className="mt-5 inline-block rounded-xl2 bg-brand text-white px-5 py-2.5 text-sm font-semibold active:scale-[0.98] transition"
        >
          Practice {section.label}
        </Link>

        <div className="mt-10 flex flex-col gap-4">
          {section.lessons.map((lesson, i) => (
            <details
              key={lesson.slug}
              className="rounded-xl2 bg-white border border-ink/10 p-5 group"
            >
              <summary className="cursor-pointer list-none flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-brand">Lesson {i + 1}</span>
                  <h2 className="font-bold text-lg mt-0.5">{lesson.title}</h2>
                  <p className="mt-1 text-sm text-ink/60">{lesson.summary}</p>
                </div>
                <span className="shrink-0 text-ink/30 group-open:rotate-180 transition mt-1">▾</span>
              </summary>
              <div className="mt-4 pt-4 border-t border-ink/5 flex flex-col gap-3 text-sm text-ink/80 leading-relaxed">
                {lesson.content.map((para, pi) => (
                  <p key={pi}>{para}</p>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
