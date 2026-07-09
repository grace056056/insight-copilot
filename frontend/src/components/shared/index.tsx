import type { ReactNode } from "react";

/* ─── Empty State ─── */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-20">
      <div className="text-text-muted mb-5 opacity-60">{icon}</div>
      <h3 className="text-xl font-semibold text-text mb-2.5">{title}</h3>
      <p className="text-sm text-text-secondary max-w-md leading-relaxed mb-8">
        {description}
      </p>
      {action}
    </div>
  );
}

/* ─── Loading State ─── */
export function LoadingState({
  message = "Loading...",
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5">
      <div className="relative w-11 h-11">
        <div className="absolute inset-0 border-2 border-border rounded-full" />
        <div className="absolute inset-0 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-sm text-text-secondary">{message}</p>
    </div>
  );
}

/* ─── Metric Card ─── */
export function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-bg-elevated rounded-xl border border-border p-3.5 shadow-card">
      <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1.5">
        {label}
      </p>
      <p className="text-lg font-bold font-mono text-text tracking-tight">
        {value}
      </p>
      {sub && (
        <p className="text-[10.5px] text-text-secondary mt-1">{sub}</p>
      )}
    </div>
  );
}

/* ─── Primary Button ─── */
export function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
        bg-gradient-to-r from-accent to-purple-500
        text-white text-sm font-semibold
        shadow-lg shadow-accent/20
        hover:shadow-xl hover:shadow-accent/25
        hover:scale-[1.02] active:scale-[0.98]
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
        transition-all duration-200"
    >
      {children}
    </button>
  );
}

/* ─── Section Label ─── */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[10.5px] uppercase tracking-widest text-text-muted mb-3 font-medium">
      {children}
    </h3>
  );
}
