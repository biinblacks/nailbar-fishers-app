import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: Props) {
  return (
    <div className="rounded-3xl border border-dashed border-blush-200 bg-white/60 px-6 py-14 text-center">
      <h3 className="text-lg font-semibold text-blush-900">{title}</h3>
      {description && <p className="mx-auto mt-2 max-w-md text-sm text-blush-800/70">{description}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
