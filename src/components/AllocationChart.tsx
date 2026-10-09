export interface ChartSegment {
  label: string;
  value: number;
  color: string;
}

interface Props {
  segments: ChartSegment[];
  centerTitle: string;
  centerSubtitle?: string;
  size?: number;
  ariaLabel: string;
}

export const PALETTE = ["#1f4fd8", "#0ea5e9", "#4f46e5", "#0f766e", "#64748b", "#38bdf8", "#7c3aed", "#94a3b8"];
export const UNALLOCATED_COLOR = "#dbe3f0";

/** Lightweight SVG donut chart (no chart library). */
export default function AllocationChart({ segments, centerTitle, centerSubtitle, size = 200, ariaLabel }: Props) {
  const stroke = size * 0.16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const sum = segments.reduce((a, s) => a + s.value, 0);
  let offset = 0;

  return (
    <svg
      className="donut"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={ariaLabel}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2f9" strokeWidth={stroke} />
      {sum > 0 &&
        segments
          .filter((s) => s.value > 0)
          .map((s) => {
            const len = (s.value / sum) * c;
            const el = (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
            offset += len;
            return el;
          })}
      <text x="50%" y={centerSubtitle ? "47%" : "52%"} textAnchor="middle" className="donut-title">
        {centerTitle}
      </text>
      {centerSubtitle && (
        <text x="50%" y="62%" textAnchor="middle" className="donut-sub">
          {centerSubtitle}
        </text>
      )}
    </svg>
  );
}
