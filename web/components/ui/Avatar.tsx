import { initials } from "@/lib/format";

interface Props {
  name: string;
  color?: string | null;
  size?: "sm" | "md";
}

export function Avatar({ name, color, size = "md" }: Props) {
  const dims = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  return (
    <span
      className={`inline-flex ${dims} shrink-0 items-center justify-center rounded-full font-semibold text-white`}
      style={{ backgroundColor: color ?? "#ec4d7d" }}
      aria-hidden
    >
      {initials(name) || "?"}
    </span>
  );
}
