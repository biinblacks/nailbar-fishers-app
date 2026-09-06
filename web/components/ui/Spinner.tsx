export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-blush-200 border-t-blush-500 ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
