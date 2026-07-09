import type { Insight, Priority } from "../../types";

const priorityConfig: Record<Priority, { dot: string; bg: string; label: string }> = {
  high:   { dot: "bg-priority-high",   bg: "bg-priority-high/8",  label: "High" },
  medium: { dot: "bg-priority-medium", bg: "bg-priority-medium/8", label: "Med" },
  low:    { dot: "bg-priority-low",    bg: "bg-bg-elevated",       label: "Low" },
};

const templateLabels: Record<string, string> = {
  revenue_trend: "Revenue Trend",
  category_comparison: "Category Mix",
  top_products: "Product Ranking",
  aov_analysis: "Order Value",
  repeat_purchase: "Customer Retention",
};

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

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-5 transition-all duration-200
        shadow-card hover:shadow-card-hover
        ${
          isSelected
            ? "bg-accent-glow border-accent/25 shadow-glow"
            : "bg-bg-surface border-border hover:bg-bg-elevated hover:border-border-light"
        }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3.5">
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md ${pc.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
            {pc.label}
          </span>
        </div>
        <span className="text-[10px] text-text-muted">·</span>
        <span className="text-[10.5px] text-text-muted tracking-wide">
          {templateLabels[insight.category] ?? insight.category}
        </span>
      </div>

      {/* Finding */}
      <p className="text-[13.5px] text-text leading-[1.7] mb-4">
        {insight.text}
      </p>

      {/* Recommendation */}
      <div className="flex items-start gap-2.5 rounded-lg bg-bg-elevated/70 border border-border/60 px-3.5 py-3">
        <div className="mt-0.5 w-4 h-4 rounded-md bg-accent/10 flex items-center justify-center flex-shrink-0">
          <svg className="w-2.5 h-2.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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