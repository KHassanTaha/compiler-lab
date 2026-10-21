import type { AdminStats } from "../../lib/types";
import { Card } from "../../components/ui/Card";

interface StatsCardsProps {
  stats: AdminStats | null;
  loading: boolean;
}

const CARDS: { key: keyof AdminStats; label: string; suffix?: string }[] = [
  { key: "total_users", label: "Total Users" },
  { key: "total_runs", label: "Total Runs" },
  { key: "error_rate", label: "Error Rate", suffix: "%" },
  { key: "runs_today", label: "Runs Today" },
];

/** The four dashboard stat tiles: users, runs, error rate, runs today. */
export function StatsCards({ stats, loading }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CARDS.map((card) => (
        <Card key={card.key} className="p-4">
          <p className="text-xs uppercase tracking-wide text-brand-brown-500">{card.label}</p>
          {loading || !stats ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-brand-cream-100" />
          ) : (
            <p className="mt-1 font-display text-3xl text-brand-brown-900">
              {card.key === "error_rate" ? stats.error_rate.toFixed(1) : stats[card.key]}
              {card.suffix && (
                <span className="ml-0.5 text-lg text-brand-brown-500">{card.suffix}</span>
              )}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}
