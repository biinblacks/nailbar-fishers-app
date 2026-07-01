export function LoadingSpinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-5 w-5 animate-spin rounded-full border-2 border-blush-200 border-t-blush-500 ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
