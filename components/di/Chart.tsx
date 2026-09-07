"use client";

import type { ChartData } from "@/lib/di";

// Lightweight inline-SVG chart renderer for Graphics Interpretation items.
// No charting library — the data sets are small (typically 4-8 points) and
// pulling in a dependency for this would be overkill. Not pixel-perfect,
// just accurate enough to answer the question from.

const PALETTE = [
  "#4F46E5",
  "#F59E0B",
  "#16A34A",
  "#DC2626",
  "#0EA5E9",
  "#A855F7",
  "#EA580C",
  "#0D9488",
];

const W = 560;
const H = 300;
const PAD = 44;

export default function Chart({
  type,
  data,
}: {
  type: "bar" | "line" | "pie" | "scatter" | "venn";
  data: ChartData;
}) {
  if (type === "venn" && data.kind === "venn") return <VennChart data={data} />;
  if (type === "scatter" && data.kind === "scatter") return <ScatterChart data={data} />;
  if (data.kind === "xy") {
    if (type === "pie") return <PieChart data={data} />;
    return <BarLineChart data={data} type={type as "bar" | "line"} />;
  }
  return null;
}

function BarLineChart({
  data,
  type,
}: {
  data: Extract<ChartData, { kind: "xy" }>;
  type: "bar" | "line";
}) {
  const { labels, values, value_name } = data;
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;
  const step = innerW / values.length;

  const points = values.map((v, i) => {
    const x = PAD + step * i + step / 2;
    const y = PAD + innerH - ((v - min) / range) * innerH;
    return { x, y, v, label: labels[i] };
  });

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[480px]" role="img">
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#0F172A" strokeOpacity={0.15} />
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#0F172A" strokeOpacity={0.15} />
        <text x={PAD} y={PAD - 14} className="fill-ink/60 text-[10px]">
          {value_name}
        </text>

        {type === "bar" &&
          points.map((p, i) => {
            const barW = step * 0.6;
            const zeroY = PAD + innerH - ((0 - min) / range) * innerH;
            const barH = Math.abs(zeroY - p.y);
            const y = Math.min(zeroY, p.y);
            return (
              <g key={i}>
                <rect x={p.x - barW / 2} y={y} width={barW} height={barH} fill={PALETTE[i % PALETTE.length]} rx={3} />
                <text x={p.x} y={p.y - 6} textAnchor="middle" className="fill-ink text-[10px] font-medium">
                  {p.v}
                </text>
              </g>
            );
          })}

        {type === "line" && (
          <polyline
            points={points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={PALETTE[0]}
            strokeWidth={2}
          />
        )}
        {type === "line" &&
          points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={3.5} fill={PALETTE[0]} />
              <text x={p.x} y={p.y - 8} textAnchor="middle" className="fill-ink text-[10px] font-medium">
                {p.v}
              </text>
            </g>
          ))}

        {points.map((p, i) => (
          <text
            key={`label-${i}`}
            x={p.x}
            y={H - PAD + 16}
            textAnchor="middle"
            className="fill-ink/60 text-[9px]"
          >
            {p.label.length > 10 ? p.label.slice(0, 9) + "…" : p.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function PieChart({ data }: { data: Extract<ChartData, { kind: "xy" }> }) {
  const { labels, values, value_name } = data;
  const total = values.reduce((s, v) => s + v, 0) || 1;
  const cx = 120;
  const cy = 130;
  const r = 100;
  let angle = -Math.PI / 2;

  const slices = values.map((v, i) => {
    const frac = v / total;
    const start = angle;
    const end = angle + frac * 2 * Math.PI;
    angle = end;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const largeArc = frac > 0.5 ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return { path, color: PALETTE[i % PALETTE.length], label: labels[i], v, pct: frac * 100 };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <svg viewBox="0 0 240 260" className="w-56 shrink-0" role="img">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth={1.5} />
        ))}
      </svg>
      <div className="text-sm w-full">
        <p className="text-ink/60 text-xs mb-2">{value_name}</p>
        <ul className="flex flex-col gap-1">
          {slices.map((s, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="flex-1">{s.label}</span>
              <span className="text-ink/60">{s.v} ({s.pct.toFixed(1)}%)</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ScatterChart({ data }: { data: Extract<ChartData, { kind: "scatter" }> }) {
  const { labels, x, y, x_name, y_name } = data;
  const xMax = Math.max(...x);
  const xMin = Math.min(...x, 0);
  const yMax = Math.max(...y);
  const yMin = Math.min(...y, 0);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;

  const points = x.map((xv, i) => ({
    cx: PAD + ((xv - xMin) / xRange) * innerW,
    cy: PAD + innerH - ((y[i] - yMin) / yRange) * innerH,
    label: labels[i],
  }));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[480px]" role="img">
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#0F172A" strokeOpacity={0.15} />
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#0F172A" strokeOpacity={0.15} />
        <text x={PAD} y={PAD - 14} className="fill-ink/60 text-[10px]">
          {y_name} (y) vs {x_name} (x)
        </text>
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.cx} cy={p.cy} r={4} fill={PALETTE[0]} fillOpacity={0.8} />
            <text x={p.cx} y={p.cy - 8} textAnchor="middle" className="fill-ink/70 text-[9px]">
              {p.label.length > 10 ? p.label.slice(0, 9) + "…" : p.label}
            </text>
          </g>
        ))}
        <text x={W - PAD} y={H - PAD + 28} textAnchor="end" className="fill-ink/60 text-[9px]">
          {x_name} →
        </text>
      </svg>
    </div>
  );
}

function VennChart({ data }: { data: Extract<ChartData, { kind: "venn" }> }) {
  const { set_a_name, set_b_name, only_a, only_b, both, neither, total } = data;
  const cx1 = 150,
    cx2 = 220,
    cy = 130,
    r = 90;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <svg viewBox="0 0 370 260" className="w-72 shrink-0" role="img">
        <circle cx={cx1} cy={cy} r={r} fill={PALETTE[0]} fillOpacity={0.35} />
        <circle cx={cx2} cy={cy} r={r} fill={PALETTE[1]} fillOpacity={0.35} />
        <text x={cx1 - 55} y={cy} textAnchor="middle" className="fill-ink text-sm font-semibold">
          {only_a}
        </text>
        <text x={(cx1 + cx2) / 2} y={cy} textAnchor="middle" className="fill-ink text-sm font-semibold">
          {both}
        </text>
        <text x={cx2 + 55} y={cy} textAnchor="middle" className="fill-ink text-sm font-semibold">
          {only_b}
        </text>
        <text x={cx1 - 30} y={cy - r - 12} textAnchor="middle" className="fill-ink/70 text-[11px] font-medium">
          {set_a_name}
        </text>
        <text x={cx2 + 30} y={cy - r - 12} textAnchor="middle" className="fill-ink/70 text-[11px] font-medium">
          {set_b_name}
        </text>
        <text x={185} y={252} textAnchor="middle" className="fill-ink/60 text-[10px]">
          Neither: {neither} · Total: {total}
        </text>
      </svg>
    </div>
  );
}
