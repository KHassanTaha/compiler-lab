import type { Tone } from "../../lib/status";

interface BadgeProps {
  tone?: Tone;
  children: React.ReactNode;
  "data-testid"?: string;
}

const TONES: Record<Tone, string> = {
  success: "bg-status-success-bg text-status-success-fg",
  error: "bg-status-error-bg text-status-error-fg",
  warning: "bg-status-warning-bg text-status-warning-fg",
  info: "bg-status-info-bg text-status-info-fg",
  neutral: "bg-status-neutral-bg text-status-neutral-fg",
};

export function Badge({ tone = "neutral", children, ...rest }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}
      {...rest}
    >
      {children}
    </span>
  );
}
