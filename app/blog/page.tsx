import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase";
import type { BlogPost } from "@/lib/types";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

async function getPosts(): Promise<BlogPost[]> {
  const supabase = createBrowserSupabase();
  const { data } = await supabase
    .from("blog_posts")
    .select("id, slug, title, excerpt, content, author_name, cover_emoji, published_at")
    .eq("published", true)
    .order("published_at", { ascending: false });
  return data ?? [];
}

export default async function BlogIndexPage() {
  const posts = await getPosts();

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-14">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">Blog</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
          Strategy, stories, and admissions insight
        </h1>
        <p className="mt-3 text-ink/60 max-w-xl">
          Written by our team — and, soon, by guest contributors from across the test-prep
          world. Interested in writing for GMAT PREP?{" "}
          <a href="mailto:hello@gmat.fun" className="text-brand font-semibold">
            Pitch us a post
          </a>
          .
        </p>

        <div className="mt-10 flex flex-col gap-4">
          {posts.length === 0 && (
            <p className="text-ink/50">No posts yet — check back soon.</p>
          )}
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/blog/${p.slug}`}
              className="rounded-xl2 bg-white border border-ink/10 p-6 hover:border-brand/40 hover:shadow-md transition flex gap-4"
            >
              <span className="text-3xl leading-none">{p.cover_emoji}</span>
              <div>
                <h2 className="font-bold text-lg">{p.title}</h2>
                <p className="mt-1.5 text-sm text-ink/60">{p.excerpt}</p>
                <p className="mt-3 text-xs text-ink/40 font-medium">
                  {p.author_name} ·{" "}
                  {new Date(p.published_at).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
