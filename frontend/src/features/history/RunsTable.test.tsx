import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { RunSummary } from "../../lib/types";
import { RunsTable } from "./RunsTable";

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

function makeRun(overrides: Partial<RunSummary> = {}): RunSummary {
  return {
    id: 1,
    user_id: 2,
    username: "tahatest",
    action: "engine_run",
    engine: "all",
    status: "error",
    error_count: 10,
    code_preview: "int x = 5",
    created_at: "2026-10-21T00:00:00Z",
    ...overrides,
  };
}

function renderTable(props: Partial<React.ComponentProps<typeof RunsTable>> = {}) {
  return render(
    <MemoryRouter>
      <RunsTable
        runs={[makeRun()]}
        loading={false}
        sort="created_at:desc"
        onSortChange={() => {}}
        onRedo={() => {}}
        testId="history-table"
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("RunsTable", () => {
  it("renders the columns and the row's engine/status", () => {
    renderTable();
    const table = screen.getByTestId("history-table");
    expect(table).toHaveTextContent("all");
    expect(table).toHaveTextContent("engine_run");
    expect(table).toHaveTextContent("error");
  });

  it("omits the User column unless showUser is set", () => {
    renderTable();
    expect(screen.queryByRole("button", { name: /user/i })).not.toBeInTheDocument();

    renderTable({ showUser: true });
    expect(screen.getAllByRole("button", { name: /user/i }).length).toBeGreaterThan(0);
  });

  it("calls onSortChange with the clicked column key", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    renderTable({ onSortChange });
    await user.click(screen.getByRole("button", { name: /errors/i }));
    expect(onSortChange).toHaveBeenCalledWith("error_count");
  });

  it("invokes onRedo for the row without navigating away", async () => {
    const user = userEvent.setup();
    const onRedo = vi.fn();
    renderTable({ onRedo });
    await user.click(screen.getByRole("button", { name: /redo/i }));
    expect(onRedo).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(navigate).not.toHaveBeenCalled();
  });

  it("navigates to the shared run when the row is clicked", async () => {
    const user = userEvent.setup();
    navigate.mockClear();
    renderTable();
    await user.click(screen.getByTestId("history-table").querySelector("tbody tr")!);
    expect(navigate).toHaveBeenCalledWith("/runs/1");
  });

  it("shows empty copy when there are no rows", () => {
    renderTable({ runs: [] });
    expect(screen.getByTestId("history-table")).toHaveTextContent(/no runs match/i);
  });

  it("renders skeletons while loading instead of the table", () => {
    renderTable({ loading: true });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByTestId("history-table")).toBeInTheDocument();
  });
});
