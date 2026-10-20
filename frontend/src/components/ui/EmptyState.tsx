interface EmptyStateProps {
  title: string;
  message: string;
  action?: React.ReactNode;
  "data-testid"?: string;
}

export function EmptyState({ title, message, action, ...rest }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-brand-border bg-white/60 px-6 py-12 text-center"
      {...rest}
    >
      <div
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-cream-200 font-display text-2xl text-brand-brown-500"
      >
        ∅
      </div>
      <h3 className="font-display text-lg text-brand-brown-900">{title}</h3>
      <p className="max-w-sm text-sm text-brand-brown-500">{message}</p>
      {action}
    </div>
  );
}
