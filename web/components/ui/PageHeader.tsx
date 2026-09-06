import type { ReactNode } from "react";

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <span className="section-eyebrow">{eyebrow}</span>}
        <h1 className="mt-1 text-2xl font-bold text-blush-900 md:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-blush-800/70">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
