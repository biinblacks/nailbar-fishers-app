import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  hint?: string;
}

export function StatCard({ label, value, hint }: Props) {
  return (
    <div className="glass-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-blush-800/60">{label}</p>
      <p className="mt-2 text-3xl font-serif font-bold text-blush-700">{value}</p>
      {hint && <p className="mt-1 text-xs text-blush-800/60">{hint}</p>}
    </div>
  );
}
