import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AdminStats } from "../../lib/types";
import { StatsCards } from "./StatsCards";

const stats: AdminStats = {
  total_users: 4,
  total_runs: 42,
  error_rate: 12.5,
  runs_today: 7,
};

describe("StatsCards", () => {
  it("renders each metric with the error rate to one decimal", () => {
    render(<StatsCards stats={stats} loading={false} />);
    expect(screen.getByText("Total Users")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText(/12\.5/)).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("shows placeholders while loading instead of numbers", () => {
    render(<StatsCards stats={null} loading />);
    expect(screen.queryByText("42")).not.toBeInTheDocument();
    expect(screen.getByText("Total Runs")).toBeInTheDocument();
  });
});
