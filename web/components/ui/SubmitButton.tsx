"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./Button";
import { Spinner } from "./Spinner";

interface Props {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "gold" | "danger";
  className?: string;
  pendingText?: string;
}

export function SubmitButton({ children, variant = "primary", className = "", pendingText }: Props) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} className={className} disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <Spinner className="border-white/40 border-t-white" />
          {pendingText ?? "Saving…"}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
