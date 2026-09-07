"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase";
import Logo from "./Logo";

// Shared, sitewide header — used on every page (marketing, auth, dashboard,
// blog, forum, learn, results) so navigation is uniform everywhere, per
// the "header tabs must be present everywhere" request. Reflects real
// auth state client-side (Supabase sessions live in browser localStorage
// only, so this must be a client component — see HeaderNav's history).
const NAV_LINKS = [
  { href: "/#tests", label: "Tests" },
  { href: "/learn", label: "Learn" },
  { href: "/blog", label: "Blog" },
  { href: "/forum", label: "Forum" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabase();

    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session);
      setChecked(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

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
        </nav>

        <div className="flex items-center gap-2">
          {!checked ? (
            <div className="h-[38px] w-[92px]" />
          ) : loggedIn ? (
            <Link
              href="/dashboard"
              className="rounded-xl2 bg-brand text-white px-4 py-2 text-sm font-semibold shadow-sm active:scale-[0.98] transition"
            >
              Dashboard
            </Link>
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
      </nav>
    </header>
  );
}
