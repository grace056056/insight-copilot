import type { SemanticRole } from "../../types";

const roleConfig: Record<
  SemanticRole,
  { label: string; color: string }
> = {
  revenue:     { label: "Revenue",     color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  quantity:    { label: "Quantity",     color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  customer_id: { label: "Customer ID", color: "text-violet-400 bg-violet-400/10 border-violet-400/20" },
  order_id:    { label: "Order ID",    color: "text-violet-400 bg-violet-400/10 border-violet-400/20" },
  product:     { label: "Product",     color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
  category:    { label: "Category",    color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
  date:        { label: "Date",        color: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20" },
  discount:    { label: "Discount",    color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  region:      { label: "Region",      color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
  channel:     { label: "Channel",     color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
  status:      { label: "Status",      color: "text-slate-400 bg-slate-400/10 border-slate-400/20" },
  other:       { label: "Other",       color: "text-slate-500 bg-slate-500/10 border-slate-500/20" },
};

export function SemanticRoleBadge({ role }: { role: SemanticRole }) {
  const config = roleConfig[role] ?? roleConfig.other;
  return (
    <span
      className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded border ${config.color}`}
    >
      {config.label}
    </span>
  );
}
