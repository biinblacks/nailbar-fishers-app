"use client";

import type { ReactNode } from "react";

interface Props {
  action: (formData: FormData) => Promise<void>;
  hidden: Record<string, string>;
  confirmText: string;
  variant?: "danger" | "secondary";
  className?: string;
  children: ReactNode;
}

/** A one-click server-action form guarded by a browser confirm dialog. */
export function ConfirmButton({ action, hidden, confirmText, variant = "danger", className = "", children }: Props) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className={`${variant === "danger" ? "btn-danger" : "btn-secondary"} ${className}`}>
        {children}
      </button>
    </form>
  );
}
