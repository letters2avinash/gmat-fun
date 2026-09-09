"use client";

import type { ChartData } from "@/lib/di";

// Lightweight inline-SVG chart renderer for Graphics Interpretation items.
// No charting library — data sets are small and pulling in a dependency
// for this would be overkill. Not pixel-perfect, just accurate enough to
// read values off and answer the question from.

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
const PAD = 48;

export default function Chart({ data }: { data: ChartData }) {
  switch (data.type) {
    case "bar":
      return <BarChart data={data} />;
    case "line":
      return <LineChart data={data} />;
    case "multi_line":
      return <MultiLineChart data={data} />;
    case "scatter":
      return <ScatterChart data={data} />;
    case "venn2":
      return <Venn2Chart data={data} />;
    case "venn3":
      return <Venn3Chart data={data} />;
    case "range_band":
      return <RangeBandChart data={data} />;
    case "stacked_bar":
      return <StackedBarChart data={data} />;
    case "grouped_bar":
      return <GroupedBarChart data={data} />;
    case "dual_axis":
      return <DualAxisChart data={data} />;
    case "pictograph":
      return <PictographChart data={data} />;
    case "flowchart":
      return <FlowchartChart data={data} />;
    case "conflict_graph":
      return <GraphChart nodes={data.nodes} edges={data.edges.map((e) => ({ a: e.a, b: e.b }))} directed={false} />;
    case "directed_network":
      return (
        <GraphChart
          nodes={data.nodes}
          edges={data.edges.map((e) => ({ a: e.from, b: e.to }))}
          directed
          source={data.source}
        />
      );
    default:
      return null;
  }
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function AxisFrame({ children, yLabel }: { children: React.ReactNode; yLabel?: string }) {
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[480px]" role="img">
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#0F172A" strokeOpacity={0.15} />
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#0F172A" strokeOpacity={0.15} />
        {yLabel && (
          <text x={PAD} y={PAD - 16} className="fill-ink/60 text-[10px]">
            {yLabel}
          </text>
        )}
        {children}
      </svg>
    </div>
  );
}

function yScale(min: number, max: number) {
  const range = max - min || 1;
  const innerH = H - PAD * 2;
  return (v: number) => PAD + innerH - ((v - min) / range) * innerH;
}

// ---------------------------------------------------------------------
// bar / line / multi_line
// ---------------------------------------------------------------------

function BarChart({ data }: { data: Extract<ChartData, { type: "bar" }> }) {
  const { categories, values, axes } = data;
  const y = yScale(axes.y.min, axes.y.max);
  const innerW = W - PAD * 2;
  const step = innerW / values.length;
  const zeroY = y(0);

  return (
    <AxisFrame yLabel={axes.y.label}>
      {values.map((v, i) => {
        const x = PAD + step * i + step / 2;
        const barW = step * 0.6;
        const barY = Math.min(zeroY, y(v));
        const barH = Math.abs(zeroY - y(v));
        return (
          <g key={i}>
            <rect x={x - barW / 2} y={barY} width={barW} height={barH} fill={PALETTE[i % PALETTE.length]} rx={3} />
            {data.value_labels !== false && (
              <text x={x} y={y(v) - 6} textAnchor="middle" className="fill-ink text-[10px] font-medium">
                {v}
              </text>
            )}
            <text x={x} y={H - PAD + 16} textAnchor="middle" className="fill-ink/60 text-[9px]">
              {truncate(categories[i], 10)}
            </text>
          </g>
        );
      })}
    </AxisFrame>
  );
}

function LineChart({ data }: { data: Extract<ChartData, { type: "line" }> }) {
  const { x, series, axes } = data;
  const s = series[0];
  const yS = yScale(axes.y.min, axes.y.max);
  const innerW = W - PAD * 2;
  const step = innerW / x.length;
  const points = s.values.map((v, i) => ({ px: PAD + step * i + step / 2, py: yS(v), v, label: x[i] }));

  return (
    <AxisFrame yLabel={axes.y.label}>
      <polyline points={points.map((p) => `${p.px},${p.py}`).join(" ")} fill="none" stroke={PALETTE[0]} strokeWidth={2} />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.px} cy={p.py} r={3.5} fill={PALETTE[0]} />
          {data.value_labels !== false && (
            <text x={p.px} y={p.py - 8} textAnchor="middle" className="fill-ink text-[10px] font-medium">
              {p.v}
            </text>
          )}
          <text x={p.px} y={H - PAD + 16} textAnchor="middle" className="fill-ink/60 text-[9px]">
            {truncate(p.label, 10)}
          </text>
        </g>
      ))}
    </AxisFrame>
  );
}

function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px]">
      {items.map((it) => (
        <span key={it.name} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: it.color }} />
          {it.name}
        </span>
      ))}
    </div>
  );
}

function MultiLineChart({ data }: { data: Extract<ChartData, { type: "multi_line" }> }) {
  const { x, series, axes } = data;
  const yS = yScale(axes.y.min, axes.y.max);
  const innerW = W - PAD * 2;
  const step = innerW / x.length;

  return (
    <div>
      <AxisFrame yLabel={axes.y.label}>
        {series.map((s, si) => {
          const points = s.values.map((v, i) => ({ px: PAD + step * i + step / 2, py: yS(v) }));
          return (
            <g key={s.name}>
              <polyline
                points={points.map((p) => `${p.px},${p.py}`).join(" ")}
                fill="none"
                stroke={PALETTE[si % PALETTE.length]}
                strokeWidth={2}
              />
              {points.map((p, i) => (
                <circle key={i} cx={p.px} cy={p.py} r={2.5} fill={PALETTE[si % PALETTE.length]} />
              ))}
            </g>
          );
        })}
        {x.map((label, i) => (
          <text
            key={i}
            x={PAD + step * i + step / 2}
            y={H - PAD + 16}
            textAnchor="middle"
            className="fill-ink/60 text-[9px]"
          >
            {truncate(label, 8)}
          </text>
        ))}
      </AxisFrame>
      <Legend items={series.map((s, i) => ({ name: s.name, color: PALETTE[i % PALETTE.length] }))} />
    </div>
  );
}

// ---------------------------------------------------------------------
// scatter
// ---------------------------------------------------------------------

function ScatterChart({ data }: { data: Extract<ChartData, { type: "scatter" }> }) {
  const { points, axes } = data;
  const xMin = axes.x.min,
    xMax = axes.x.max,
    yMin = axes.y.min,
    yMax = axes.y.max;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;
  const groups = Array.from(new Set(points.map((p) => p.group).filter(Boolean))) as string[];

  const plotted = points.map((p) => ({
    cx: PAD + ((p.x - xMin) / (xMax - xMin || 1)) * innerW,
    cy: PAD + innerH - ((p.y - yMin) / (yMax - yMin || 1)) * innerH,
    label: p.label,
    color: p.group ? PALETTE[groups.indexOf(p.group) % PALETTE.length] : PALETTE[0],
  }));

  return (
    <div>
      <AxisFrame yLabel={`${axes.y.label} (y) vs ${axes.x.label} (x)`}>
        {plotted.map((p, i) => (
          <g key={i}>
            <circle cx={p.cx} cy={p.cy} r={4} fill={p.color} fillOpacity={0.85} />
            <text x={p.cx} y={p.cy - 8} textAnchor="middle" className="fill-ink/70 text-[9px]">
              {truncate(p.label, 10)}
            </text>
          </g>
        ))}
      </AxisFrame>
      {groups.length > 0 && (
        <Legend items={groups.map((g, i) => ({ name: g, color: PALETTE[i % PALETTE.length] }))} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// venn2 / venn3
// ---------------------------------------------------------------------

function Venn2Chart({ data }: { data: Extract<ChartData, { type: "venn2" }> }) {
  const { labels, regions, total } = data;
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
          {regions.only_a}
        </text>
        <text x={(cx1 + cx2) / 2} y={cy} textAnchor="middle" className="fill-ink text-sm font-semibold">
          {regions.both}
        </text>
        <text x={cx2 + 55} y={cy} textAnchor="middle" className="fill-ink text-sm font-semibold">
          {regions.only_b}
        </text>
        <text x={cx1 - 30} y={cy - r - 12} textAnchor="middle" className="fill-ink/70 text-[11px] font-medium">
          {truncate(labels[0], 22)}
        </text>
        <text x={cx2 + 30} y={cy - r - 12} textAnchor="middle" className="fill-ink/70 text-[11px] font-medium">
          {truncate(labels[1], 22)}
        </text>
        <text x={185} y={252} textAnchor="middle" className="fill-ink/60 text-[10px]">
          Neither: {regions.neither} · Total: {total}
        </text>
      </svg>
    </div>
  );
}

function Venn3Chart({ data }: { data: Extract<ChartData, { type: "venn3" }> }) {
  const { labels, regions } = data;
  const r = 78;
  const cx = 185,
    cy = 120;
  // three circles arranged symmetrically
  const c1 = { x: cx - r * 0.58, y: cy - r * 0.4 };
  const c2 = { x: cx + r * 0.58, y: cy - r * 0.4 };
  const c3 = { x: cx, y: cy + r * 0.65 };

  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 370 300" className="w-80 shrink-0" role="img">
        <circle cx={c1.x} cy={c1.y} r={r} fill={PALETTE[0]} fillOpacity={0.3} />
        <circle cx={c2.x} cy={c2.y} r={r} fill={PALETTE[1]} fillOpacity={0.3} />
        <circle cx={c3.x} cy={c3.y} r={r} fill={PALETTE[2]} fillOpacity={0.3} />

        <text x={c1.x - r * 0.55} y={c1.y - r * 0.35} textAnchor="middle" className="fill-ink text-sm font-semibold">
          {regions.a}
        </text>
        <text x={c2.x + r * 0.55} y={c2.y - r * 0.35} textAnchor="middle" className="fill-ink text-sm font-semibold">
          {regions.b}
        </text>
        <text x={c3.x} y={c3.y + r * 0.7} textAnchor="middle" className="fill-ink text-sm font-semibold">
          {regions.c}
        </text>
        <text x={(c1.x + c2.x) / 2} y={c1.y - 6} textAnchor="middle" className="fill-ink text-sm font-semibold">
          {regions.ab}
        </text>
        <text x={(c1.x + c3.x) / 2 - 8} y={(c1.y + c3.y) / 2 + 8} textAnchor="middle" className="fill-ink text-sm font-semibold">
          {regions.ac}
        </text>
        <text x={(c2.x + c3.x) / 2 + 8} y={(c2.y + c3.y) / 2 + 8} textAnchor="middle" className="fill-ink text-sm font-semibold">
          {regions.bc}
        </text>
        <text x={cx} y={cy + 4} textAnchor="middle" className="fill-ink text-sm font-bold">
          {regions.abc}
        </text>

        <text x={c1.x - 40} y={c1.y - r - 10} textAnchor="middle" className="fill-ink/70 text-[10px] font-medium">
          {truncate(labels[0], 16)}
        </text>
        <text x={c2.x + 40} y={c2.y - r - 10} textAnchor="middle" className="fill-ink/70 text-[10px] font-medium">
          {truncate(labels[1], 16)}
        </text>
        <text x={c3.x} y={c3.y + r + 20} textAnchor="middle" className="fill-ink/70 text-[10px] font-medium">
          {truncate(labels[2], 16)}
        </text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------
// range_band
// ---------------------------------------------------------------------

function RangeBandChart({ data }: { data: Extract<ChartData, { type: "range_band" }> }) {
  const { bands, axes } = data;
  const y = yScale(axes.y.min, axes.y.max);
  const innerW = W - PAD * 2;
  const step = innerW / bands.length;

  return (
    <AxisFrame yLabel={axes.y.label}>
      {bands.map((b, i) => {
        const x = PAD + step * i + step / 2;
        const barW = step * 0.4;
        const yLow = y(b.low);
        const yHigh = y(b.high);
        return (
          <g key={i}>
            <rect
              x={x - barW / 2}
              y={yHigh}
              width={barW}
              height={Math.max(2, yLow - yHigh)}
              fill={PALETTE[i % PALETTE.length]}
              fillOpacity={0.55}
              stroke={PALETTE[i % PALETTE.length]}
              rx={3}
            />
            <text x={x} y={yHigh - 6} textAnchor="middle" className="fill-ink text-[9px] font-medium">
              {b.high}
            </text>
            <text x={x} y={yLow + 12} textAnchor="middle" className="fill-ink text-[9px] font-medium">
              {b.low}
            </text>
            <text x={x} y={H - PAD + 16} textAnchor="middle" className="fill-ink/60 text-[9px]">
              {truncate(b.label, 10)}
            </text>
          </g>
        );
      })}
    </AxisFrame>
  );
}

// ---------------------------------------------------------------------
// stacked_bar / grouped_bar
// ---------------------------------------------------------------------

function StackedBarChart({ data }: { data: Extract<ChartData, { type: "stacked_bar" }> }) {
  const { bands, values, axes } = data;
  const y = yScale(axes.y.min, axes.y.max);
  const innerW = W - PAD * 2;
  const step = innerW / values.length;
  const zeroY = y(0);

  return (
    <div>
      <AxisFrame yLabel={axes.y.label}>
        {values.map((v, i) => {
          const x = PAD + step * i + step / 2;
          const barW = step * 0.55;
          let cumulative = 0;
          return (
            <g key={i}>
              {v.parts.map((part, pi) => {
                const startY = y(cumulative);
                cumulative += part;
                const endY = y(cumulative);
                return (
                  <rect
                    key={pi}
                    x={x - barW / 2}
                    y={endY}
                    width={barW}
                    height={Math.max(0, startY - endY)}
                    fill={PALETTE[pi % PALETTE.length]}
                  />
                );
              })}
              <text x={x} y={H - PAD + 16} textAnchor="middle" className="fill-ink/60 text-[9px]">
                {truncate(v.label, 10)}
              </text>
            </g>
          );
        })}
      </AxisFrame>
      <Legend items={bands.map((b, i) => ({ name: b, color: PALETTE[i % PALETTE.length] }))} />
    </div>
  );
}

function GroupedBarChart({ data }: { data: Extract<ChartData, { type: "grouped_bar" }> }) {
  const { categories, series, axes } = data;
  const y = yScale(axes.y.min, axes.y.max);
  const innerW = W - PAD * 2;
  const step = innerW / categories.length;
  const zeroY = y(0);
  const groupW = step * 0.7;
  const barW = groupW / series.length;

  return (
    <div>
      <AxisFrame yLabel={axes.y.label}>
        {categories.map((cat, ci) => {
          const groupX = PAD + step * ci + step / 2 - groupW / 2;
          return (
            <g key={ci}>
              {series.map((s, si) => {
                const v = s.values[ci];
                const barY = Math.min(zeroY, y(v));
                const barH = Math.abs(zeroY - y(v));
                return (
                  <rect
                    key={si}
                    x={groupX + si * barW}
                    y={barY}
                    width={barW * 0.85}
                    height={barH}
                    fill={PALETTE[si % PALETTE.length]}
                    rx={2}
                  />
                );
              })}
              <text x={PAD + step * ci + step / 2} y={H - PAD + 16} textAnchor="middle" className="fill-ink/60 text-[9px]">
                {truncate(cat, 10)}
              </text>
            </g>
          );
        })}
      </AxisFrame>
      <Legend items={series.map((s, i) => ({ name: s.name, color: PALETTE[i % PALETTE.length] }))} />
    </div>
  );
}

// ---------------------------------------------------------------------
// dual_axis
// ---------------------------------------------------------------------

function DualAxisChart({ data }: { data: Extract<ChartData, { type: "dual_axis" }> }) {
  const { x, series, axes } = data;
  const innerW = W - PAD * 2;
  const step = innerW / x.length;
  const yLeft = yScale(axes.y_left.min, axes.y_left.max);
  const yRight = yScale(axes.y_right.min, axes.y_right.max);

  return (
    <div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[480px]" role="img">
          <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#0F172A" strokeOpacity={0.15} />
          <line x1={W - PAD} y1={PAD} x2={W - PAD} y2={H - PAD} stroke="#0F172A" strokeOpacity={0.15} />
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#0F172A" strokeOpacity={0.15} />
          <text x={PAD} y={PAD - 16} className="fill-ink/60 text-[10px]">
            {truncate(axes.y_left.label, 30)}
          </text>
          <text x={W - PAD} y={PAD - 16} textAnchor="end" className="fill-ink/60 text-[10px]">
            {truncate(axes.y_right.label, 30)}
          </text>

          {series.map((s, si) => {
            const scale = s.axis === "left" ? yLeft : yRight;
            const points = s.values.map((v, i) => ({ px: PAD + step * i + step / 2, py: scale(v), v }));
            return (
              <g key={s.name}>
                <polyline
                  points={points.map((p) => `${p.px},${p.py}`).join(" ")}
                  fill="none"
                  stroke={PALETTE[si % PALETTE.length]}
                  strokeWidth={2}
                  strokeDasharray={s.axis === "right" ? "4 3" : undefined}
                />
                {points.map((p, i) => (
                  <circle key={i} cx={p.px} cy={p.py} r={3} fill={PALETTE[si % PALETTE.length]} />
                ))}
              </g>
            );
          })}
          {x.map((label, i) => (
            <text
              key={i}
              x={PAD + step * i + step / 2}
              y={H - PAD + 16}
              textAnchor="middle"
              className="fill-ink/60 text-[9px]"
            >
              {truncate(label, 8)}
            </text>
          ))}
        </svg>
      </div>
      <Legend items={series.map((s, i) => ({ name: `${s.name} (${s.axis})`, color: PALETTE[i % PALETTE.length] }))} />
    </div>
  );
}

// ---------------------------------------------------------------------
// pictograph
// ---------------------------------------------------------------------

function PictographChart({ data }: { data: Extract<ChartData, { type: "pictograph" }> }) {
  const { unit_value, unit_label, rows } = data;
  return (
    <div>
      <p className="text-[11px] text-ink/60 mb-3">Each symbol = {unit_value} {unit_label}</p>
      <div className="flex flex-col gap-2.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs font-medium truncate">{r.label}</span>
            <div className="flex flex-wrap gap-1 flex-1">
              {Array.from({ length: r.symbols }).map((_, si) => (
                <span key={si} className="w-3.5 h-3.5 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
              ))}
            </div>
            <span className="text-xs text-ink/60 shrink-0">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// flowchart
// ---------------------------------------------------------------------

function FlowchartChart({ data }: { data: Extract<ChartData, { type: "flowchart" }> }) {
  const { variable, add_if_odd, add_if_even, threshold, trace } = data;
  const boxes = [
    `Start: ${variable} = ${data.start[variable] ?? 0}, n = 0`,
    `n = n + 1`,
    `${variable} odd? add ${add_if_odd} : add ${add_if_even}`,
    `${variable} ≥ ${threshold}? stop : repeat`,
  ];
  return (
    <div>
      <div className="flex flex-col sm:flex-row items-center gap-2 mb-4 overflow-x-auto">
        {boxes.map((b, i) => (
          <div key={i} className="flex items-center gap-2 shrink-0">
            <div className="rounded-lg border border-ink/15 bg-ink/[0.03] px-3 py-2 text-[11px] font-medium text-center min-w-[120px]">
              {b}
            </div>
            {i < boxes.length - 1 && <span className="text-ink/30 rotate-90 sm:rotate-0">→</span>}
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="text-left font-semibold border-b border-ink/10 py-1.5 pr-4">Pass</th>
              <th className="text-left font-semibold border-b border-ink/10 py-1.5 pr-4">n</th>
              <th className="text-left font-semibold border-b border-ink/10 py-1.5 pr-4">{variable}</th>
            </tr>
          </thead>
          <tbody>
            {trace.map((t, i) => (
              <tr key={i} className="border-b border-ink/5">
                <td className="py-1.5 pr-4">{t.pass_no}</td>
                <td className="py-1.5 pr-4">{t.n}</td>
                <td className="py-1.5 pr-4 font-medium">{t.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// conflict_graph / directed_network — node-link diagrams. Node x/y come
// pre-laid-out from the source data; we just scale them into the SVG.
// ---------------------------------------------------------------------

function GraphChart({
  nodes,
  edges,
  directed,
  source,
}: {
  nodes: { name: string; x: number; y: number }[];
  edges: { a: string; b: string }[];
  directed: boolean;
  source?: string;
}) {
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const xMin = Math.min(...xs),
    xMax = Math.max(...xs);
  const yMin = Math.min(...ys),
    yMax = Math.max(...ys);
  const size = 320;
  const pad = 36;
  const inner = size - pad * 2;
  const sx = (v: number) => pad + ((v - xMin) / (xMax - xMin || 1)) * inner;
  const sy = (v: number) => pad + ((v - yMin) / (yMax - yMin || 1)) * inner;

  const pos = Object.fromEntries(nodes.map((n) => [n.name, { x: sx(n.x), y: sy(n.y) }]));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[380px] mx-auto" role="img">
        {directed && (
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#0F172A" fillOpacity={0.5} />
            </marker>
          </defs>
        )}
        {edges.map((e, i) => {
          const p1 = pos[e.a];
          const p2 = pos[e.b];
          if (!p1 || !p2) return null;
          // Shorten the line a bit so the arrowhead doesn't overlap the node.
          const dx = p2.x - p1.x,
            dy = p2.y - p1.y;
          const len = Math.hypot(dx, dy) || 1;
          const shrink = 14;
          const ex = p2.x - (dx / len) * shrink;
          const ey = p2.y - (dy / len) * shrink;
          return (
            <line
              key={i}
              x1={p1.x}
              y1={p1.y}
              x2={directed ? ex : p2.x}
              y2={directed ? ey : p2.y}
              stroke="#0F172A"
              strokeOpacity={0.4}
              strokeWidth={1.5}
              markerEnd={directed ? "url(#arrow)" : undefined}
            />
          );
        })}
        {nodes.map((n, i) => {
          const p = pos[n.name];
          const isSource = n.name === source;
          return (
            <g key={n.name}>
              <circle
                cx={p.x}
                cy={p.y}
                r={13}
                fill={isSource ? PALETTE[3] : PALETTE[i % PALETTE.length]}
                fillOpacity={0.85}
                stroke="white"
                strokeWidth={2}
              />
              <text x={p.x} y={p.y - 18} textAnchor="middle" className="fill-ink text-[10px] font-medium">
                {truncate(n.name, 12)}
              </text>
            </g>
          );
        })}
      </svg>
      {source && <p className="text-[11px] text-ink/60 text-center mt-1">Source node: {source}</p>}
    </div>
  );
}
