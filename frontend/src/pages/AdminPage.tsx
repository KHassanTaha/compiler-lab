import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { AdminStats, AdminUserSummary, RunSummary } from "../lib/types";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Pagination } from "../components/ui/Pagination";
import { Tabs } from "../components/ui/Tabs";
import { useDebounce } from "../lib/useDebounce";
import { RunsTable } from "../features/history/RunsTable";
import { RunFilters } from "../features/history/RunFilters";
import {
  EMPTY_FILTERS,
  hasActiveFilters,
  runsQueryParams,
} from "../features/history/filters";
import type { RunFilters as RunFiltersValue } from "../features/history/filters";
import { StatsCards } from "../features/admin/StatsCards";
import { UsersTable } from "../features/admin/UsersTable";
import { UserFilterSelect } from "../features/admin/UserFilterSelect";
import { RunDetailModal } from "../features/admin/RunDetailModal";

const PAGE_SIZE = 20;

type TabId = "runs" | "users";

export function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("runs");

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoadedNonce, setStatsLoadedNonce] = useState<number | null>(null);

  const [filters, setFilters] = useState<RunFiltersValue>(EMPTY_FILTERS);
  const [userId, setUserId] = useState<number | null>(null);
  const [sort, setSort] = useState("created_at:desc");
  const [page, setPage] = useState(1);
  const debouncedQ = useDebounce(filters.q);

  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [runsTotal, setRunsTotal] = useState(0);
  const [runsTotalPages, setRunsTotalPages] = useState(1);
  const [runsLoadedKey, setRunsLoadedKey] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const [usersLoadedKey, setUsersLoadedKey] = useState<string | null>(null);
  const [filterUsers, setFilterUsers] = useState<AdminUserSummary[]>([]);

  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const effectiveFilters = { ...filters, q: debouncedQ };
  const runsKey = JSON.stringify({ effectiveFilters, userId, sort, page });

  useEffect(() => {
    let cancelled = false;
    api
      .adminStats()
      .then((data) => {
        if (cancelled) return;
        setStats(data);
        setStatsLoadedNonce(refreshNonce);
      })
      .catch(() => !cancelled && setStatsLoadedNonce(refreshNonce));
    return () => {
      cancelled = true;
    };
  }, [refreshNonce]);

  useEffect(() => {
    let cancelled = false;
    const params = runsQueryParams(
      { filters: effectiveFilters, sort, page, pageSize: PAGE_SIZE },
      { user_id: userId ?? undefined },
    );
    api
      .adminRuns(params)
      .then((res) => {
        if (cancelled) return;
        setRuns(res.items);
        setRunsTotal(res.total);
        setRunsTotalPages(res.total_pages);
        setRunsLoadedKey(runsKey);
      })
      .catch(() => !cancelled && setRunsLoadedKey(runsKey));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runsKey, refreshNonce]);

  useEffect(() => {
    let cancelled = false;
    api
      .adminUsers({ page: 1, page_size: 100, sort: "username:asc" })
      .then((res) => !cancelled && setFilterUsers(res.items))
      .catch(() => !cancelled && setFilterUsers([]));
    return () => {
      cancelled = true;
    };
  }, [refreshNonce]);

  const usersKey = `${usersPage}:${refreshNonce}`;

  useEffect(() => {
    if (tab !== "users") return;
    let cancelled = false;
    api
      .adminUsers({ page: usersPage, page_size: PAGE_SIZE, sort: "created_at:desc" })
      .then((res) => {
        if (cancelled) return;
        setUsers(res.items);
        setUsersTotal(res.total);
        setUsersTotalPages(res.total_pages);
        setUsersLoadedKey(usersKey);
      })
      .catch(() => !cancelled && setUsersLoadedKey(usersKey));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usersKey, tab]);

  const runsLoading = runsLoadedKey !== runsKey;
  const statsLoading = statsLoadedNonce !== refreshNonce;
  const usersLoading = usersLoadedKey !== usersKey;

  function applyFilters(next: RunFiltersValue) {
    setPage(1);
    setFilters(next);
  }

  function changeSort(field: string) {
    const [current, dir] = sort.split(":");
    setSort(current === field && dir === "desc" ? `${field}:asc` : `${field}:desc`);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setUserId(null);
    setPage(1);
  }

  function redo(run: RunSummary) {
    navigate(`/workspace?redo=${run.id}`);
  }

  function viewUserRuns(user: AdminUserSummary) {
    setFilters(EMPTY_FILTERS);
    setUserId(user.id);
    setPage(1);
    setTab("runs");
  }

  const filtersActive = hasActiveFilters(effectiveFilters) || userId !== null;

  return (
    <section data-testid="admin-dashboard" className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl text-brand-brown-900">Admin Dashboard</h1>
        <Button variant="secondary" onClick={() => setRefreshNonce((n) => n + 1)}>
          Refresh
        </Button>
      </div>

      <StatsCards stats={stats} loading={statsLoading} />

      <div className="mt-6">
        <Tabs
          tabs={[
            { id: "runs", label: "Runs" },
            { id: "users", label: "Users" },
          ]}
          active={tab}
          onChange={(id) => setTab(id as TabId)}
        />
      </div>

      {tab === "runs" && (
        <div className="mt-4 flex flex-col gap-4">
          <RunFilters
            filters={filters}
            onChange={applyFilters}
            extra={<UserFilterSelect users={filterUsers} value={userId} onChange={setUserId} />}
          />
          <RunsTable
            runs={runs}
            loading={runsLoading}
            showUser
            sort={sort}
            onSortChange={changeSort}
            onRedo={redo}
            onRowClick={(run) => setSelectedRunId(run.id)}
            testId="admin-runs-table"
          />
          {!runsLoading && runs.length === 0 && (
            <EmptyState
              title="No runs found"
              message="No runs match these filters."
              action={
                filtersActive ? (
                  <Button variant="secondary" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          )}
          {runsTotal > 0 && (
            <Pagination
              page={page}
              totalPages={runsTotalPages}
              total={runsTotal}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </div>
      )}

      {tab === "users" && (
        <div className="mt-4 flex flex-col gap-4">
          <UsersTable users={users} loading={usersLoading} onViewRuns={viewUserRuns} />
          {usersTotal > 0 && (
            <Pagination
              page={usersPage}
              totalPages={usersTotalPages}
              total={usersTotal}
              pageSize={PAGE_SIZE}
              onPageChange={setUsersPage}
            />
          )}
        </div>
      )}

      <RunDetailModal
        runId={selectedRunId}
        onClose={() => setSelectedRunId(null)}
        onRedo={(run) => {
          setSelectedRunId(null);
          navigate(`/workspace?redo=${run.id}`);
        }}
      />
    </section>
  );
}
