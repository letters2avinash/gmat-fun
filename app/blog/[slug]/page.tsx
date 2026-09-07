import Link from "next/link";
import { notFound } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase";
import type { BlogPost } from "@/lib/types";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

async function getPost(slug: string): Promise<BlogPost | null> {
  const supabase = createBrowserSupabase();
  const { data } = await supabase
    .from("blog_posts")
    .select("id, slug, title, excerpt, content, author_name, cover_emoji, published_at")
    .eq("slug", slug)
    .eq("published", true)
    .single();
  return data ?? null;
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <article className="flex-1 max-w-2xl mx-auto w-full px-6 py-14">
        <Link href="/blog" className="text-sm font-semibold text-brand">
          ← Back to blog
        </Link>
        <p className="mt-6 text-5xl">{post.cover_emoji}</p>
        <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
          {post.title}
        </h1>
        <p className="mt-3 text-sm text-ink/40 font-medium">
          {post.author_name} ·{" "}
          {new Date(post.published_at).toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <div className="mt-8 flex flex-col gap-4 text-ink/80 leading-relaxed">
          {post.content.split("\n\n").map((para, i) => (
            <p key={i} className="whitespace-pre-wrap">
              {para}
            </p>
          ))}
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
