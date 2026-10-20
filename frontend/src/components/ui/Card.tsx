interface CardProps {
  children: React.ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function Card({ children, className = "", ...rest }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-brand-border bg-white shadow-warm ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
