"use client";

export interface NavItem {
  id: string;
  answered: boolean;
  flagged: boolean;
}

export default function QuestionNav({
  items,
  onSelect,
}: {
  items: NavItem[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
      {items.map((it, i) => (
        <button
          key={it.id}
          onClick={() => onSelect(it.id)}
          className={[
            "relative rounded-lg border py-2.5 text-sm font-semibold transition",
            it.answered ? "border-brand bg-brand-light text-brand" : "border-danger/40 bg-danger/5 text-danger",
          ].join(" ")}
        >
          {i + 1}
          {it.flagged && (
            <span className="absolute -top-1.5 -right-1.5 text-xs" title="Flagged for review">
              🚩
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
