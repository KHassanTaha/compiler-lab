interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-brand-beige-200/60 ${className}`}
    />
  );
}

export function Spinner({ className = "" }: SkeletonProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand-gold-500 border-t-transparent ${className}`}
    />
  );
}
