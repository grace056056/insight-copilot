/**
 * EvidenceTable
 *
 * Renders evidence data as compact tables grouped by row type.
 *
 * Bug fix (Day 5 patch):
 *   The original version unioned ALL keys across ALL rows and rendered one
 *   flat table. This broke for templates like repeat_purchase and aov_analysis
 *   whose evidence contains mixed row types (summary, segment, frequency,
 *   distribution, trend) — each with completely different column schemas.
 *   Rows showed "—" for every column that didn't exist on their type.
 *
 * Fix:
 *   Group rows by their `type` field. Render each group as its own table
 *   with only the columns that exist on that group. Skip the "summary" type
 *   (already rendered in Key Metrics). For flat data (no type field), render
 *   as a single table like before.
 */

type Row = Record<string, unknown>;

/** Human-readable labels for row type groups. */
const groupLabels: Record<string, string> = {
  segment: "Segment Breakdown",
  frequency: "Purchase Frequency",
  distribution: "Distribution",
  trend: "Monthly Trend",
};

/** Column display names (overrides for common keys). */
const columnLabels: Record<string, string> = {
  revenue_share_pct: "share %",
  cumulative_share_pct: "cum. %",
  avg_order_value: "avg order",
  total_revenue: "revenue",
  order_count: "orders",
  total_quantity: "quantity",
  customer_count: "customers",
  avg_price: "avg price",
  avg_spend: "avg spend",
  growth_pct: "MoM %",
  percentage: "%",
};

export function EvidenceTable({ data }: { data: Row[] }) {
  if (data.length === 0) return null;

  // Check if data has a `type` field (multi-schema evidence)
  const hasTypes = data.some((r) => "type" in r);

  if (!hasTypes) {
    // Flat data (revenue_trend, category_comparison, top_products)
    // Filter out special marker rows like _summary
    const filtered = data.filter((r) => {
      const vals = Object.values(r);
      return !vals.includes("_summary");
    });
    return <MiniTable rows={filtered} maxRows={10} />;
  }

  // Multi-type data: group by type, render each group separately
  const groups = new Map<string, Row[]>();
  for (const row of data) {
    const t = String(row.type ?? "other");
    if (t === "summary") continue; // Already shown in Key Metrics
    if (!groups.has(t)) groups.set(t, []);
    groups.get(t)!.push(row);
  }

  return (
    <div className="space-y-3">
      {Array.from(groups.entries()).map(([type, rows]) => (
        <div key={type}>
          <p className="flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.14em] font-mono text-text-muted mb-1.5 px-0.5">
            <span className="w-1 h-1 bg-wire/50 rotate-45" />
            {groupLabels[type] ?? type.replace(/_/g, " ")}
          </p>
          <MiniTable rows={rows} maxRows={8} />
        </div>
      ))}
    </div>
  );
}

/** Renders a single table for a group of same-schema rows. */
function MiniTable({
  rows,
  maxRows,
}: {
  rows: Row[];
  maxRows: number;
}) {
  if (rows.length === 0) return null;

  // Derive columns from the FIRST row only (all rows in a group share the same schema)
  const keys = Object.keys(rows[0]).filter(
    (k) => k !== "type" && k !== "_summary"
  );

  const display = rows.slice(0, maxRows);
  const overflow = rows.length > maxRows;

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="bg-bg-elevated">
            {keys.map((key) => (
              <th
                key={key}
                className="text-left px-2.5 py-2 text-text-muted font-mono font-medium uppercase tracking-[0.1em] text-[9px] border-b border-border whitespace-nowrap"
              >
                {columnLabels[key] ?? key.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {display.map((row, i) => (
            <tr
              key={i}
              className="border-b border-border/50 hover:bg-bg-hover transition-colors"
            >
              {keys.map((key) => (
                <td
                  key={key}
                  className="px-2.5 py-1.5 font-mono text-text-secondary whitespace-nowrap"
                >
                  {formatCell(key, row[key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {overflow && (
        <div className="text-[9.5px] font-mono text-text-muted text-center py-1.5 bg-bg-elevated border-t border-border tracking-wide">
          showing {maxRows} of {rows.length} rows
        </div>
      )}
    </div>
  );
}

/** Format a cell value with context-aware rendering. */
function formatCell(key: string, val: unknown): string {
  if (val === null || val === undefined) return "—";

  if (typeof val === "number") {
    // Currency-like fields
    if (
      key.includes("revenue") ||
      key.includes("spend") ||
      key.includes("price") ||
      key.includes("aov") ||
      key === "total_amount"
    ) {
      return `$${val.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    // Percentage fields
    if (key.includes("pct") || key === "percentage" || key.includes("share")) {
      return `${val}%`;
    }
    // Large integers
    if (Number.isInteger(val) && Math.abs(val) >= 1000) {
      return val.toLocaleString();
    }
    // Small decimals
    if (!Number.isInteger(val)) {
      return val.toFixed(2);
    }
    return val.toString();
  }

  return String(val);
}
