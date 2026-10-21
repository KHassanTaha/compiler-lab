import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  hasActiveFilters,
  runsQueryParams,
} from "./filters";

describe("hasActiveFilters", () => {
  it("is false for the empty filter set", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it("is true once any single field is set", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, engine: "icg" })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, q: "fib" })).toBe(true);
  });
});

describe("runsQueryParams", () => {
  it("drops empty filters so the backend sees no constraint", () => {
    const params = runsQueryParams({
      filters: EMPTY_FILTERS,
      sort: "created_at:desc",
      page: 1,
      pageSize: 20,
    });
    expect(params.action).toBeUndefined();
    expect(params.engine).toBeUndefined();
    expect(params.q).toBeUndefined();
    expect(params.sort).toBe("created_at:desc");
    expect(params.page).toBe(1);
    expect(params.page_size).toBe(20);
  });

  it("passes through the filters that are set", () => {
    const params = runsQueryParams({
      filters: { ...EMPTY_FILTERS, engine: "icg", status: "error" },
      sort: "error_count:asc",
      page: 3,
      pageSize: 50,
    });
    expect(params.engine).toBe("icg");
    expect(params.status).toBe("error");
    expect(params.page).toBe(3);
    expect(params.page_size).toBe(50);
  });

  it("merges admin-only extras such as user_id", () => {
    const params = runsQueryParams(
      { filters: EMPTY_FILTERS, sort: "created_at:desc", page: 1, pageSize: 20 },
      { user_id: 7 },
    );
    expect(params.user_id).toBe(7);
  });
});
