"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase";
import Logo from "./Logo";

// Shared, sitewide header — used on EVERY page (marketing, auth, dashboard,
// blog, forum, learn, results, admin) so navigation is uniform everywhere
// and nobody gets stuck on a page with no way back — see the "tabs become
// invisible on the dashboard" bug this replaced. Reflects real auth state
// client-side (Supabase sessions live in browser localStorage only, so
// this must be a client component).
const NAV_LINKS = [
  { href: "/#tests", label: "Tests" },
  { href: "/learn", label: "Learn" },
  { href: "/blog", label: "Blog" },
  { href: "/forum", label: "Forum" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabase();

    async function checkAdmin(userId: string) {
      const { data } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", userId)
        .single();
      setIsAdmin(!!data?.is_admin);
    }

    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session);
      setChecked(true);
      if (data.session?.user) checkAdmin(data.session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
      if (session?.user) checkAdmin(session.user.id);
      else setIsAdmin(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 bg-canvas/90 backdrop-blur border-b border-ink/5">
      <div className="px-6 py-4 flex items-center justify-between max-w-5xl mx-auto w-full gap-4">
        <Logo />

        <nav className="hidden md:flex items-center gap-1.5 text-sm font-semibold">
          {NAV_LINKS.map((link) => {
            const active =
              link.href !== "/#tests" && pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  "rounded-xl2 px-3.5 py-2 transition " +
                  (active
                    ? "bg-brand text-white"
                    : "text-ink/70 hover:bg-ink/5 hover:text-ink")
                }
              >
                {link.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              className={
                "rounded-xl2 px-3.5 py-2 transition " +
                (pathname?.startsWith("/admin")
                  ? "bg-accent text-white"
                  : "text-accent-dark hover:bg-accent/10")
              }
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {!checked ? (
            <div className="h-[38px] w-[92px]" />
          ) : loggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-xl2 bg-brand text-white px-4 py-2 text-sm font-semibold shadow-sm active:scale-[0.98] transition"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="hidden sm:inline rounded-xl2 border border-ink/10 px-3.5 py-2 text-sm font-semibold text-ink/60 hover:bg-ink/5 transition"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="rounded-xl2 border border-ink/10 px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5 transition"
            >
              Log in
            </Link>
          )}
        </div>
      </div>

      <nav className="md:hidden flex items-center gap-1.5 overflow-x-auto px-6 pb-3 text-sm font-semibold max-w-5xl mx-auto w-full">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl2 px-3.5 py-2 whitespace-nowrap text-ink/70 hover:bg-ink/5 hover:text-ink transition"
          >
            {link.label}
          </Link>
        ))}
        {isAdmin && (
          <Link
            href="/admin"
            className="rounded-xl2 px-3.5 py-2 whitespace-nowrap text-accent-dark hover:bg-accent/10 transition"
          >
            Admin
          </Link>
        )}
        {loggedIn && (
          <button
            onClick={handleLogout}
            className="rounded-xl2 px-3.5 py-2 whitespace-nowrap text-ink/50 hover:bg-ink/5 transition"
          >
            Log out
          </button>
        )}
      </nav>
    </header>
  );
}
