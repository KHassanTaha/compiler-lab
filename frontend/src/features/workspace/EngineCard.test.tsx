import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EngineResult } from "../../lib/types";
import { EngineCard } from "./EngineCard";
import { ENGINE_BY_KEY, ENGINES, statusFor } from "./engineConfig";

describe("engineConfig", () => {
  it("maps each engine to its backend URL slug", () => {
    expect(ENGINE_BY_KEY.lexer.slug).toBe("lex");
    expect(ENGINE_BY_KEY.parser.slug).toBe("parse");
    expect(ENGINE_BY_KEY.icg.slug).toBe("icg");
    expect(ENGINES.map((engine) => engine.key)).toEqual([
      "lexer",
      "parser",
      "semantic",
      "icg",
    ]);
  });

  it("treats only a literal success status as success", () => {
    expect(statusFor(undefined)).toBe("idle");
    expect(statusFor({ status: "success" } as EngineResult)).toBe("success");
    expect(statusFor({ status: "error" } as EngineResult)).toBe("error");
  });
});

const successResult: EngineResult = {
  engine: "lexer",
  status: "success",
  duration_ms: 1.23,
  error_count: 0,
  data: { tokens: [], summary: { total: 0, by_type: {} }, errors: [] },
  errors: [],
  run_id: 7,
};

describe("EngineCard", () => {
  it("exposes the data-status the screenshot script asserts on", () => {
    render(
      <EngineCard engine="lexer" result={successResult} status="success" onRun={() => {}} />,
    );
    const card = screen.getByTestId("engine-card-lexer");
    expect(card).toHaveAttribute("data-status", "success");
  });

  it("shows running state while a request is in flight", () => {
    render(<EngineCard engine="lexer" result={undefined} status="running" onRun={() => {}} />);
    expect(screen.getByTestId("engine-card-lexer")).toHaveAttribute("data-status", "running");
  });

  it("renders the raw JSON view under the documented testid when toggled", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(
      <EngineCard
        engine="lexer"
        result={successResult}
        status="success"
        onRun={() => {}}
        defaultOpen
      />,
    );
    await user.click(screen.getByRole("button", { name: /raw/i }));
    expect(screen.getByTestId("lexer-raw-json")).toHaveTextContent('"tokens"');
  });

  it("invokes onRun with the engine key", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    const onRun = vi.fn();
    render(<EngineCard engine="icg" result={undefined} status="idle" onRun={onRun} />);
    await user.click(screen.getByRole("button", { name: /^run$/i }));
    expect(onRun).toHaveBeenCalledWith("icg");
  });
});
