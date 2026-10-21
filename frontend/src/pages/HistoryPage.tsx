import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useDebounce } from "../lib/useDebounce";
import type { Page, RunSummary } from "../lib/types";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Pagination } from "../components/ui/Pagination";
import { RunFilters } from "../features/history/RunFilters";
import { RunsTable } from "../features/history/RunsTable";
import { EMPTY_FILTERS, hasActiveFilters, runsQueryParams } from "../features/history/filters";
import type { RunFilters as Filters } from "../features/history/filters";

const DEFAULT_SORT = "created_at:desc";
const PAGE_SIZE = 20;

export function HistoryPage() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const [data, setData] = useState<Page<RunSummary> | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const debouncedQ = useDebounce(filters.q);
  const effectiveFilters = useMemo(
    () => ({ ...filters, q: debouncedQ }),
    [filters, debouncedQ],
  );

  const requestKey = JSON.stringify({ effectiveFilters, sort, page, pageSize });
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    let active = true;
    api
      .history(runsQueryParams({ filters: effectiveFilters, sort, page, pageSize }))
      .then((response) => {
        if (!active) return;
        setData(response);
        setLoadedKey(requestKey);
      })
      .catch(() => {
        if (!active) return;
        setData(null);
        setLoadedKey(requestKey);
      });
    return () => {
      active = false;
    };
    // requestKey is a stable serialisation of all four fetch inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const onFiltersChange = (next: Filters) => {
    setFilters(next);
    setPage(1);
  };

  const onSortChange = (field: string) => {
    setSort((current) => {
      const [currentField, dir] = current.split(":");
      if (currentField === field) return `${field}:${dir === "asc" ? "desc" : "asc"}`;
      return `${field}:asc`;
    });
    setPage(1);
  };

  const onRedo = (run: RunSummary) => navigate(`/workspace?redo=${run.id}`);

  const isEmpty = !loading && data !== null && data.total === 0;

  return (
    <section data-testid="history-page" className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-brand-brown-900">History</h1>
          <p className="mt-1 text-brand-brown-500">
            Every run and saved input from your account.
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate("/workspace")}>
          New run
        </Button>
      </header>

      <div className="mb-4">
        <RunFilters filters={filters} onChange={onFiltersChange} />
      </div>

      {isEmpty ? (
        <EmptyState
          title="No runs yet"
          message={
            hasActiveFilters(filters)
              ? "No runs match these filters. Try clearing them."
              : "Compile something in the workspace and it will show up here."
          }
          action={
            hasActiveFilters(filters) ? (
              <Button variant="secondary" onClick={() => onFiltersChange(EMPTY_FILTERS)}>
                Clear filters
              </Button>
            ) : (
              <Button onClick={() => navigate("/workspace")}>Go to workspace</Button>
            )
          }
        />
      ) : (
        <>
          <RunsTable
            runs={data?.items ?? []}
            loading={loading}
            sort={sort}
            onSortChange={onSortChange}
            onRedo={onRedo}
            testId="history-table"
          />
          {data && (
            <Pagination
              page={data.page}
              pageSize={data.page_size}
              total={data.total}
              totalPages={data.total_pages}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          )}
        </>
      )}
    </section>
  );
}
