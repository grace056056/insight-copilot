import { useCallback, useRef } from "react";
import type { Insight, Priority } from "../../types";

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Priority maps onto the thermal ramp — high runs hot, low runs cold.
 * Each card carries a thermal edge on its left flank whose color and
 * glow intensity encode how urgently the finding wants attention.
 */
const priorityConfig: Record<
  Priority,
  { color: string; edge: string; chip: string; label: string }
> = {
  high: {
    color: "#fb7185",
    edge: "linear-gradient(180deg, #fbbf24, #fb7185, #f43f5e)",
    chip: "text-thermal-hot bg-thermal-hot/10 border-thermal-hot/25",
    label: "HIGH",
  },
  medium: {
    color: "#fbbf24",
    edge: "linear-gradient(180deg, #fbbf24, rgba(251,191,36,0.4))",
    chip: "text-thermal-warm bg-thermal-warm/10 border-thermal-warm/25",
    label: "MED",
  },
  low: {
    color: "#38bdf8",
    edge: "linear-gradient(180deg, rgba(56,189,248,0.7), rgba(56,189,248,0.25))",
    chip: "text-thermal-cold bg-thermal-cold/10 border-thermal-cold/25",
    label: "LOW",
  },
};

const templateLabels: Record<string, string> = {
  revenue_trend: "Revenue Trend",
  category_comparison: "Category Mix",
  top_products: "Product Ranking",
  aov_analysis: "Order Value",
  repeat_purchase: "Customer Retention",
};

/** Segmented confidence meter — machine certainty as a wireframe gauge. */
function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const segments = 10;
  const lit = Math.round(value * segments);
  return (
    <div className="flex items-center gap-2" title={`Model confidence ${pct}%`}>
      <div className="flex gap-[2px]">
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className="w-[3px] h-2 rounded-[1px]"
            style={{
              background:
                i < lit
                  ? `rgba(34,211,238,${0.35 + (i / segments) * 0.65})`
                  : "rgba(38,52,85,0.6)",
            }}
          />
        ))}
      </div>
      <span className="text-[9px] font-mono text-text-muted tracking-wider">
        {pct}%
      </span>
    </div>
  );
}

export function InsightCard({
  insight,
  isSelected,
  onClick,
}: {
  insight: Insight;
  isSelected: boolean;
  onClick: () => void;
}) {
  const pc = priorityConfig[insight.priority];
  const ref = useRef<HTMLButtonElement>(null);

  /* 3D hover tilt — the card leans toward the cursor and lifts forward
     in depth. Written directly to style to stay off the React render path. */
  const onTiltMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el || prefersReducedMotion) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${(x * 3).toFixed(2)}deg) rotateX(${(-y * 2.2).toFixed(2)}deg) translateZ(8px)`;
  }, []);
  const onTiltLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = "";
  }, []);

  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseMove={onTiltMove}
      onMouseLeave={onTiltLeave}
      data-insight-card
      data-selected={isSelected ? "true" : "false"}
      className={`tilt-card relative w-full text-left rounded-lg border p-5 pl-6 transition-all duration-200
        shadow-card hover:shadow-card-hover overflow-hidden
        ${
          isSelected
            ? "bg-accent-glow border-accent/30 shadow-glow"
            : "bg-bg-surface border-border hover:bg-bg-elevated hover:border-border-light"
        }`}
    >
      {/* Thermal priority edge */}
      <span
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{
          background: pc.edge,
          boxShadow: `0 0 12px 0 ${pc.color}55`,
        }}
      />

      {/* Selected: wire connection hint toward the evidence panel */}
      {isSelected && (
        <span
          className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-10 rounded-l"
          style={{
            background: "linear-gradient(180deg, transparent, rgba(34,211,238,0.8), transparent)",
            boxShadow: "0 0 10px rgba(34,211,238,0.5)",
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3.5">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border text-[9px] font-mono font-semibold tracking-[0.12em] ${pc.chip}`}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: pc.color, boxShadow: `0 0 6px ${pc.color}` }}
          />
          {pc.label}
        </span>
        <span className="text-[10.5px] text-text-muted tracking-wide">
          {templateLabels[insight.category] ?? insight.category}
        </span>
        <span className="ml-auto">
          <ConfidenceMeter value={insight.confidence} />
        </span>
      </div>

      {/* Finding — the human-readable narrative */}
      <p className="text-[13.5px] text-text leading-[1.7] mb-4">
        {insight.text}
      </p>

      {/* Recommendation — where the machine hands off to human judgment */}
      <div className="flex items-start gap-2.5 rounded-md bg-bg-elevated/70 border border-border/60 px-3.5 py-3">
        <div className="mt-0.5 w-4 h-4 rounded-[4px] bg-accent/10 border border-accent/25 flex items-center justify-center flex-shrink-0">
          <svg className="w-2.5 h-2.5 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
          </svg>
        </div>
        <p className="text-[11.5px] text-text-secondary leading-[1.7]">
          {insight.recommendation}
        </p>
      </div>
    </button>
  );
}
