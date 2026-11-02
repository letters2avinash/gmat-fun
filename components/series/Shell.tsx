"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase";

// Header for every page on the test series host. Deliberately separate from
// the main gmat.fun site header, so the sazzag portal reads as its own product.
export default function SeriesShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setEmail(session?.user.email ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await createBrowserSupabase().auth.signOut();
    router.push("/");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="font-semibold tracking-tight text-ink">
            GMAT Verbal <span className="text-brand">Test Series</span>
          </Link>
          {email ? (
            <nav className="flex items-center gap-2 text-sm">
              <Link href="/" className="rounded-full px-3 py-1.5 hover:bg-brand-light">Tests</Link>
              <Link href="/analytics" className="rounded-full px-3 py-1.5 hover:bg-brand-light">Analytics</Link>
              <button onClick={signOut} className="rounded-full border border-ink/15 px-3 py-1.5 hover:bg-ink/5">
                Sign out
              </button>
            </nav>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
