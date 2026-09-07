import Link from "next/link";
import Image from "next/image";

// Avi's actual logo (a graduation-cap-over-open-book mark with a circuit
// motif) — replaces the earlier placeholder geometric mark once he
// supplied the real asset. File lives at public/logo-mark.png.
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 shrink-0 ${className}`}>
      <Image
        src="/logo-mark.png"
        alt="GMAT PREP"
        width={36}
        height={36}
        className="w-9 h-9 object-contain"
        priority
      />
      <span className="text-xl font-extrabold tracking-tight leading-none text-ink">
        GMAT <span className="text-brand">PREP</span>
      </span>
    </Link>
  );
}
