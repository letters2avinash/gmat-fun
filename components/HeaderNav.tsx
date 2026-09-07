"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase";

// Reflects real auth state in the header — previously this was hardcoded
// to always show "Log in", even for a signed-in user, because the
// homepage is a server component and Supabase sessions here live in
// browser localStorage (no session cookie for the server to read).
export default function HeaderNav() {
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
    <nav className="flex gap-4 sm:gap-6 text-sm font-medium text-ink/70 items-center">
      <a href="#tests" className="hidden sm:inline">
        Tests
      </a>
      {!checked ? (
        <div className="h-[38px] w-[92px]" />
      ) : loggedIn ? (
        <Link
          href="/dashboard"
          className="rounded-xl2 border border-ink/10 px-4 py-2 text-ink"
        >
          Dashboard
        </Link>
      ) : (
        <Link
          href="/auth"
          className="rounded-xl2 border border-ink/10 px-4 py-2 text-ink"
        >
          Log in
        </Link>
      )}
    </nav>
  );
}
