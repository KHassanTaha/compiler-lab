import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AdminUserSummary } from "../../lib/types";
import { UsersTable } from "./UsersTable";

const users: AdminUserSummary[] = [
  {
    id: 1,
    username: "admin",
    email: "admin@example.com",
    role: "admin",
    run_count: 3,
    last_active: "2026-10-21T00:00:00Z",
    created_at: "2026-10-01T00:00:00Z",
  },
  {
    id: 2,
    username: "tahatest",
    email: "tahatest@example.com",
    role: "user",
    run_count: 0,
    last_active: null,
    created_at: "2026-10-02T00:00:00Z",
  },
];

describe("UsersTable", () => {
  it("renders identity, role, run count, and last active", () => {
    render(<UsersTable users={users} loading={false} onViewRuns={() => {}} />);
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    expect(screen.getByText("tahatest")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("fires onViewRuns with the clicked user", async () => {
    const user = userEvent.setup();
    const onViewRuns = vi.fn();
    render(<UsersTable users={users} loading={false} onViewRuns={onViewRuns} />);
    await user.click(screen.getAllByRole("button", { name: /view runs/i })[1]);
    expect(onViewRuns).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
  });

  it("shows the empty message when there are no users", () => {
    render(<UsersTable users={[]} loading={false} onViewRuns={() => {}} />);
    expect(screen.getByText(/no users found/i)).toBeInTheDocument();
  });
});
