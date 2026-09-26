"use client";

// Pure-SVG chart components for the System Health page, split into a lazy chunk
// (dynamic-imported by page.tsx with ssr:false) so their render code loads on
// demand rather than in the initial page bundle. Styling comes from the global
// `.sh-*` classes declared in the page's <style jsx global> block, so these
// components need no styles of their own. Presentational only — no data fetching.

export type ChartPoint = { date: string; amount?: number; count?: number };
export type OrderDist = { status: string; count: number; color: string };
export type TopCourse = { title: string; enrolled: number; rating: number; trainer: string };

/** Pure SVG Line Chart */
export function LineChart({
  data,
  valueKey,
  color,
  gradientId,
  height = 200,
  prefix = "",
  suffix = "",
}: {
  data: ChartPoint[];
  valueKey: "amount" | "count";
  color: string;
  gradientId: string;
  height?: number;
  prefix?: string;
  suffix?: string;
}) {
  if (!data.length) return <p className="sh-empty">Tidak ada data.</p>;

  // valueKey is restricted to the numeric keys of ChartPoint, so d[valueKey]
  // is number | undefined — no cast needed.
  const values = data.map((d) => d[valueKey] ?? 0);
  const maxVal = Math.max(...values, 1);
  const w = 560;
  const h = height;
  const pad = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  // Carry date + value on each point so dots never index back into data/values.
  const points = data.map((d, i) => ({
    x: pad.left + (i / Math.max(data.length - 1, 1)) * chartW,
    y: pad.top + chartH - ((d[valueKey] ?? 0) / maxVal) * chartH,
    value: d[valueKey] ?? 0,
    date: d.date,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  // points is non-empty (data.length checked above), but guard for strict indexing.
  const areaD = firstPoint && lastPoint
    ? `${pathD} L ${lastPoint.x} ${pad.top + chartH} L ${firstPoint.x} ${pad.top + chartH} Z`
    : pathD;

  // Y-axis ticks
  const yTicks = 5;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => {
    const val = Math.round((maxVal / yTicks) * i);
    return { val, y: pad.top + chartH - (val / maxVal) * chartH };
  });

  const formatVal = (v: number) => {
    if (v >= 1_000_000) return `${prefix}${(v / 1_000_000).toFixed(1)}M${suffix}`;
    if (v >= 1_000) return `${prefix}${(v / 1_000).toFixed(0)}K${suffix}`;
    return `${prefix}${v}${suffix}`;
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="sh-svg" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yLabels.map(({ val, y }, i) => (
        <g key={i}>
          <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="rgba(0,0,0,0.06)" strokeDasharray="4" />
          <text x={pad.left - 8} y={y + 4} textAnchor="end" className="sh-tick">{formatVal(val)}</text>
        </g>
      ))}

      {/* X-axis labels */}
      {data.map((d, i) => {
        const x = pad.left + (i / Math.max(data.length - 1, 1)) * chartW;
        const label = d.date.slice(5); // "07" from "2026-07"
        return i % 2 === 0 ? (
          <text key={d.date} x={x} y={h - 8} textAnchor="middle" className="sh-tick">{label}</text>
        ) : null;
      })}

      {/* Area fill */}
      <path d={areaD} fill={`url(#${gradientId})`} />

      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {points.map((p) => (
        <g key={p.date}>
          <circle cx={p.x} cy={p.y} r={4} fill="white" stroke={color} strokeWidth={2} />
          <title>{`${p.date}: ${formatVal(p.value)}`}</title>
        </g>
      ))}
    </svg>
  );
}

/** Pure SVG Bar Chart */
export function BarChart({
  data,
  valueKey,
  color,
  height = 200,
}: {
  data: ChartPoint[];
  valueKey: "amount" | "count";
  color: string;
  height?: number;
}) {
  if (!data.length) return <p className="sh-empty">Tidak ada data.</p>;

  const values = data.map((d) => d[valueKey] ?? 0);
  const maxVal = Math.max(...values, 1);
  const w = 560;
  const h = height;
  const pad = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const barW = (chartW / data.length) * 0.6;
  const gap = (chartW / data.length) * 0.4;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="sh-svg" preserveAspectRatio="xMidYMid meet">
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = pad.top + chartH * (1 - pct);
        return (
          <g key={pct}>
            <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="rgba(0,0,0,0.06)" strokeDasharray="4" />
            <text x={pad.left - 6} y={y + 4} textAnchor="end" className="sh-tick">{Math.round(maxVal * pct)}</text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const v = values[i] ?? 0;
        const barH = (v / maxVal) * chartH;
        const x = pad.left + i * (barW + gap) + gap / 2;
        const y = pad.top + chartH - barH;
        return (
          <g key={d.date}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill={color} opacity={0.85}>
              <title>{`${d.date}: ${v}`}</title>
            </rect>
            <text x={x + barW / 2} y={h - 8} textAnchor="middle" className="sh-tick">{d.date.slice(5)}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Pure SVG Donut Chart */
export function DonutChart({ data, size = 180 }: { data: OrderDist[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <p className="sh-empty">Tidak ada data order.</p>;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;
  const innerR = r * 0.6;
  let cumAngle = -90;

  const slices = data
    .filter((d) => d.count > 0)
    .map((d) => {
      const pct = d.count / total;
      const startAngle = cumAngle;
      cumAngle += pct * 360;
      const endAngle = cumAngle;

      const s1 = (startAngle * Math.PI) / 180;
      const e1 = (endAngle * Math.PI) / 180;

      const x1 = cx + r * Math.cos(s1);
      const y1 = cy + r * Math.sin(s1);
      const x2 = cx + r * Math.cos(e1);
      const y2 = cy + r * Math.sin(e1);
      const ix1 = cx + innerR * Math.cos(e1);
      const iy1 = cy + innerR * Math.sin(e1);
      const ix2 = cx + innerR * Math.cos(s1);
      const iy2 = cy + innerR * Math.sin(s1);

      const large = pct > 0.5 ? 1 : 0;
      const path = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2} Z`;

      return { ...d, path, pct };
    });

  const STATUS_LABELS: Record<string, string> = {
    paid: "Dibayar",
    pending: "Menunggu",
    failed: "Gagal",
    expired: "Kedaluwarsa",
    refunded: "Refund",
  };

  return (
    <div className="sh-donut-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        {slices.map((s) => (
          <path key={s.status} d={s.path} fill={s.color} stroke="white" strokeWidth={2}>
            <title>{`${STATUS_LABELS[s.status] ?? s.status}: ${s.count} (${(s.pct * 100).toFixed(1)}%)`}</title>
          </path>
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" className="sh-donut-total">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="sh-donut-label">Total</text>
      </svg>
      <div className="sh-legend">
        {data.filter((d) => d.count > 0).map((d) => (
          <div key={d.status} className="sh-legend-item">
            <span className="sh-legend-dot" style={{ background: d.color }} />
            <span className="sh-legend-text">{STATUS_LABELS[d.status] ?? d.status}</span>
            <span className="sh-legend-count">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Horizontal bar chart for Top Courses */
export function HorizontalBarChart({ data }: { data: TopCourse[] }) {
  if (!data.length) return <p className="sh-empty">Belum ada kursus.</p>;
  const max = Math.max(...data.map((d) => d.enrolled), 1);

  return (
    <div className="sh-hbar-list">
      {data.map((c, i) => (
        <div key={i} className="sh-hbar-row">
          <div className="sh-hbar-rank">#{i + 1}</div>
          <div className="sh-hbar-info">
            <p className="sh-hbar-title">{c.title}</p>
            <p className="sh-hbar-trainer">{c.trainer}</p>
          </div>
          <div className="sh-hbar-bar-wrap">
            <div
              className="sh-hbar-bar"
              style={{ width: `${Math.max((c.enrolled / max) * 100, 4)}%` }}
            />
            <span className="sh-hbar-val">{c.enrolled} enrolled</span>
          </div>
          <div className="sh-hbar-rating">⭐ {c.rating.toFixed(1)}</div>
        </div>
      ))}
    </div>
  );
}
