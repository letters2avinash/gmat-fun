import Link from "next/link";

export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-ink/5 mt-auto">
      <div className="max-w-5xl mx-auto w-full px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-ink/50">
        <p>© {year} Preptician Edutech LLP. All rights reserved.</p>
        <nav className="flex items-center gap-5 font-medium">
          <Link href="/learn" className="hover:text-ink transition">Learn</Link>
          <Link href="/blog" className="hover:text-ink transition">Blog</Link>
          <Link href="/forum" className="hover:text-ink transition">Forum</Link>
          <Link href="/dashboard" className="hover:text-ink transition">Dashboard</Link>
        </nav>
      </div>
    </footer>
  );
}
