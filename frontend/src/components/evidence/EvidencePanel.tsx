import type { Insight } from "../../types";
import { EvidenceTable } from "./EvidenceTable";
import { HudCorners, MetricCard, SectionLabel } from "../shared";

const templateLabels: Record<string, string> = {
  revenue_trend: "Revenue Trend",
  category_comparison: "Category Mix",
  top_products: "Product Ranking",
  aov_analysis: "Order Value",
  repeat_purchase: "Customer Retention",
};

/** Wireframe chart glyphs — one thin-stroke icon per chart type. */
function ChartGlyph({ type }: { type: string }) {
  const stroke = "#34d399";
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 16 16",
    fill: "none" as const,
    stroke,
    strokeWidth: 1.2,
    strokeLinecap: "round" as const,
  };
  switch (type) {
    case "line":
      return (
        <svg {...common}>
          <path d="M1.5 12.5l4-5 3 2.5 5.5-7" />
          <path d="M1.5 14.5h13" opacity="0.4" />
        </svg>
      );
    case "pie":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6" />
          <path d="M8 2v6l4.5 4" />
        </svg>
      );
    case "metric":
      return (
        <svg {...common}>
          <rect x="2" y="3" width="12" height="10" rx="1.5" />
          <path d="M5 9.5l2-2.5 2 1.5 2.5-3" />
        </svg>
      );
    case "horizontal_bar":
      return (
        <svg {...common}>
          <path d="M2 3.5h9M2 8h12M2 12.5h6" />
          <path d="M2 1.5v13" opacity="0.4" />
        </svg>
      );
    default: // bar
      return (
        <svg {...common}>
          <path d="M3.5 14V9M8 14V4.5M12.5 14V7" />
          <path d="M1.5 14.5h13" opacity="0.4" />
        </svg>
      );
  }
}

export function EvidencePanel({ insight }: { insight: Insight }) {
  const ev = insight.evidence;
  const summaryRow = ev.data.find(
    (d) => (d as Record<string, unknown>).type === "summary"
  ) as Record<string, unknown> | undefined;

  return (
    <div className="h-full overflow-y-auto p-5 space-y-0">
      {/* Header card */}
      <div className="mb-5">
        <SectionLabel>Evidence</SectionLabel>
        <div className="relative bg-bg-elevated rounded-lg border border-emerald-400/15 p-4 shadow-card wire-grid-fine">
          <HudCorners tone="wire" />
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-8 h-8 rounded-md bg-emerald-400/10 border border-emerald-400/25 flex items-center justify-center">
              <ChartGlyph type={ev.chart_type} />
            </div>
            <span className="text-sm font-semibold font-display text-text tracking-tight">
              {templateLabels[ev.template_used] ?? ev.template_used}
            </span>
          </div>
          <p className="text-[11.5px] text-text-secondary leading-[1.7]">
            {ev.description}
          </p>
        </div>
      </div>

      {/* Key metrics */}
      {summaryRow && (
        <div className="pb-5 mb-5 border-b border-border/50">
          <SectionLabel>Key Metrics</SectionLabel>
          <div className="grid grid-cols-2 gap-2.5">
            {extractMetrics(summaryRow, ev.template_used).map((m) => (
              <MetricCard key={m.label} label={m.label} value={m.value} sub={m.sub} />
            ))}
          </div>
        </div>
      )}

      {/* Chart metadata */}
      <div className="pb-5 mb-5 border-b border-border/50">
        <SectionLabel>Visualization</SectionLabel>
        <div className="bg-bg-elevated rounded-lg border border-border p-4 space-y-2.5 shadow-card">
          <MetaRow label="chart type" value={ev.chart_type.replace("_", " ")} />
          <MetaRow label="x axis" value={ev.x_key.replace("_", " ")} />
          <MetaRow label="y axis" value={ev.y_key.replace("_", " ")} />
          {ev.highlight && <MetaRow label="highlight" value={ev.highlight} />}
          <MetaRow label="data points" value={`${ev.data.length}`} />
        </div>
      </div>

      {/* Data table */}
      <div className="pb-5 mb-4">
        <SectionLabel>Supporting Data</SectionLabel>
        <EvidenceTable data={ev.data} />
      </div>

      {/* Trust badge — the verification seal */}
      <div className="text-center py-2">
        <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-wide
          text-emerald-300/90 bg-emerald-500/5 border border-emerald-500/20 px-4 py-2 rounded-full
          shadow-[0_0_16px_rgba(52,211,153,0.1)]">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          computed by pandas — verified, not generated
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-text-muted font-mono">{label}</span>
      <span className="text-text font-mono capitalize">{value}</span>
    </div>
  );
}

function extractMetrics(
  summary: Record<string, unknown>,
  template: string
): { label: string; value: string; sub?: string }[] {
  const metrics: { label: string; value: string; sub?: string }[] = [];

  const fmt = (v: unknown) => {
    if (typeof v === "number") {
      if (v >= 1000) return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
      if (v % 1 !== 0) return v.toFixed(1);
      return v.toString();
    }
    return String(v ?? "—");
  };

  if (template === "repeat_purchase") {
    if (summary.repeat_rate_pct != null) metrics.push({ label: "Repeat Rate", value: `${summary.repeat_rate_pct}%` });
    if (summary.repeat_revenue_share_pct != null) metrics.push({ label: "Repeat Revenue", value: `${summary.repeat_revenue_share_pct}%` });
    if (summary.spend_multiplier != null) metrics.push({ label: "Spend Multiplier", value: `${summary.spend_multiplier}x` });
    if (summary.total_customers != null) metrics.push({ label: "Total Customers", value: fmt(summary.total_customers) });
  } else if (template === "aov_analysis") {
    if (summary.overall_aov != null) metrics.push({ label: "Mean AOV", value: `$${Number(summary.overall_aov).toFixed(2)}` });
    if (summary.median_aov != null) metrics.push({ label: "Median AOV", value: `$${Number(summary.median_aov).toFixed(2)}` });
    if (summary.total_orders != null) metrics.push({ label: "Total Orders", value: fmt(summary.total_orders) });
  } else {
    Object.entries(summary).forEach(([key, val]) => {
      if (key === "type") return;
      if (typeof val === "number") {
        metrics.push({ label: key.replace(/_/g, " "), value: fmt(val) });
      }
    });
  }

  return metrics.slice(0, 4);
}
