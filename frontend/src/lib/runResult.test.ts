import { describe, expect, it } from "vitest";
import { normalizeResultJson, presentEngines } from "./runResult";

function engineResult(engine: string, status = "success") {
  return { engine, status, duration_ms: 1, error_count: 0, data: {}, errors: [] };
}

describe("normalizeResultJson", () => {
  it("maps a single-engine run's payload by its engine label", () => {
    const map = normalizeResultJson({ lexer: engineResult("lexer") });
    expect(presentEngines(map)).toEqual(["lexer"]);
    expect(map.lexer?.engine).toBe("lexer");
  });

  it("maps a run-all payload to all four engines in canonical order", () => {
    const map = normalizeResultJson({
      icg: engineResult("icg"),
      lexer: engineResult("lexer"),
      semantic: engineResult("semantic"),
      parser: engineResult("parser"),
    });
    expect(presentEngines(map)).toEqual(["lexer", "parser", "semantic", "icg"]);
  });

  it("ignores keys that are not engine results", () => {
    const map = normalizeResultJson({ lexer: engineResult("lexer"), junk: 42 });
    expect(presentEngines(map)).toEqual(["lexer"]);
  });

  it("returns an empty map for a null payload", () => {
    expect(presentEngines(normalizeResultJson(null))).toEqual([]);
  });
});
