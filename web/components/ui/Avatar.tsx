import { initials } from "@/lib/format";

interface Props {
  name: string;
  color?: string | null;
  size?: "sm" | "md" | "lg";
  src?: string | null;
}

export function Avatar({ name, color, size = "md", src }: Props) {
  const dims = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-20 w-20 text-xl" : "h-10 w-10 text-sm";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name} className={`${dims} shrink-0 rounded-full object-cover`} />
    );
  }
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
