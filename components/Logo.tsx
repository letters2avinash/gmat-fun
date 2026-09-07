import Link from "next/link";

// Simple geometric logomark — an ascending bar-chart glyph inside a
// rounded square, echoing "adaptive scoring that goes up" without relying
// on any external asset. Wordmark next to it reads "GMAT PREP".
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 shrink-0 ${className}`}>
      <span className="grid place-items-center w-9 h-9 rounded-xl2 bg-brand text-white">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="14" width="4" height="7" rx="1" fill="currentColor" opacity="0.55" />
          <rect x="10" y="9" width="4" height="12" rx="1" fill="currentColor" opacity="0.8" />
          <rect x="17" y="3" width="4" height="18" rx="1" fill="currentColor" />
        </svg>
      </span>
      <span className="text-xl font-extrabold tracking-tight leading-none text-ink">
        GMAT <span className="text-brand">PREP</span>
      </span>
    </Link>
  );
}
