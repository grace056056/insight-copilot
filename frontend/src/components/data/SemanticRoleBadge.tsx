import type { SemanticRole } from "../../types";

/**
 * Role badges use the wireframe/thermal palette: identifiers and dates are
 * "machine-cold" violets and indigos, dimensions are wire-cyan, and value
 * signals (revenue, measures) sit on the warm end of the thermal ramp.
 */
const roleConfig: Record<
  SemanticRole,
  { label: string; color: string }
> = {
  revenue:     { label: "revenue",     color: "text-emerald-300 bg-emerald-400/10 border-emerald-400/25" },
  quantity:    { label: "quantity",    color: "text-thermal-warm bg-thermal-warm/10 border-thermal-warm/25" },
  customer_id: { label: "customer_id", color: "text-violet-300 bg-violet-400/10 border-violet-400/25" },
  order_id:    { label: "order_id",    color: "text-violet-300 bg-violet-400/10 border-violet-400/25" },
  product:     { label: "product",     color: "text-wire bg-wire/10 border-wire/25" },
  category:    { label: "category",    color: "text-wire bg-wire/10 border-wire/25" },
  date:        { label: "date",        color: "text-indigo-300 bg-indigo-400/10 border-indigo-400/25" },
  discount:    { label: "discount",    color: "text-thermal-warm bg-thermal-warm/10 border-thermal-warm/25" },
  region:      { label: "region",      color: "text-wire bg-wire/10 border-wire/25" },
  channel:     { label: "channel",     color: "text-wire bg-wire/10 border-wire/25" },
  status:      { label: "status",      color: "text-slate-400 bg-slate-400/10 border-slate-400/25" },
  other:       { label: "other",       color: "text-slate-500 bg-slate-500/10 border-slate-500/25" },
};

export function SemanticRoleBadge({ role }: { role: SemanticRole }) {
  const config = roleConfig[role] ?? roleConfig.other;
  return (
    <span
      className={`inline-block text-[9.5px] font-mono px-1.5 py-0.5 rounded-[3px] border tracking-wide ${config.color}`}
    >
      {config.label}
    </span>
  );
}
