import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase";
import type { ForumCategory } from "@/lib/types";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

async function getCategories(): Promise<(ForumCategory & { thread_count: number })[]> {
  const supabase = createBrowserSupabase();
  const { data: categories } = await supabase
    .from("forum_categories")
    .select("id, slug, name, description")
    .order("sort_order", { ascending: true });

  if (!categories) return [];

  const { data: threads } = await supabase.from("forum_threads").select("category_id");
  const counts = new Map<string, number>();
  (threads ?? []).forEach((t) => counts.set(t.category_id, (counts.get(t.category_id) ?? 0) + 1));

  return categories.map((c) => ({ ...c, thread_count: counts.get(c.id) ?? 0 }));
}

export default async function ForumIndexPage() {
  const categories = await getCategories();

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-14">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">Forum</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
          Ask questions. Compare notes. Prep together.
        </h1>
        <p className="mt-3 text-ink/60 max-w-xl">
          A place for test-takers — and writers who want to contribute strategy of their own
          — to swap notes by topic.
        </p>

        <div className="mt-10 flex flex-col gap-3">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/forum/${c.slug}`}
              className="rounded-xl2 bg-white border border-ink/10 p-5 hover:border-brand/40 hover:shadow-md transition flex items-center justify-between gap-4"
            >
              <div>
                <h2 className="font-bold">{c.name}</h2>
                <p className="mt-1 text-sm text-ink/60">{c.description}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-ink/40 rounded-full bg-ink/5 px-3 py-1.5 whitespace-nowrap">
                {c.thread_count} {c.thread_count === 1 ? "thread" : "threads"}
              </span>
            </Link>
          ))}
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
