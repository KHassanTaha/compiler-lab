import { useNavigate } from "react-router-dom";
import type { RunSummary } from "../../lib/types";
import { statusTone } from "../../lib/status";
import { formatDateTime, truncate } from "../../lib/format";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";

export type SortDir = "asc" | "desc";

interface RunsTableProps {
  runs: RunSummary[];
  loading: boolean;
  /** Admin mode adds a User column and a user_id sort key. */
  showUser?: boolean;
  sort: string;
  onSortChange: (field: string) => void;
  onRedo: (run: RunSummary) => void;
  testId: string;
}

interface Column {
  key: string;
  label: string;
  sortable: boolean;
  className?: string;
}

const BASE_COLUMNS: Column[] = [
  { key: "created_at", label: "Date", sortable: true },
  { key: "action", label: "Action", sortable: false },
  { key: "engine", label: "Engine", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "error_count", label: "Errors", sortable: true },
  { key: "code", label: "Code", sortable: false },
  { key: "actions", label: "", sortable: false, className: "text-right" },
];

const USER_COLUMN: Column = { key: "username", label: "User", sortable: true };

function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-brand-brown-300">↕</span>;
  return <span className="text-brand-brown-700">{dir === "asc" ? "↑" : "↓"}</span>;
}

/** Sortable runs table shared by History and Admin (AGENTS §15.6). */
export function RunsTable({
  runs,
  loading,
  showUser = false,
  sort,
  onSortChange,
  onRedo,
  testId,
}: RunsTableProps) {
  const navigate = useNavigate();
  const [sortField, sortDir] = sort.split(":") as [string, SortDir];
  const columns = showUser ? [BASE_COLUMNS[0], USER_COLUMN, ...BASE_COLUMNS.slice(1)] : BASE_COLUMNS;

  if (loading) {
    return (
      <div className="flex flex-col gap-2" data-testid={testId}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-brand-border bg-white">
      <table data-testid={testId} className="w-full text-left text-sm">
        <thead className="bg-brand-cream-100 text-xs uppercase tracking-wide text-brand-brown-500">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={`px-3 py-2 font-medium ${column.className ?? ""}`}>
                {column.sortable ? (
                  <button
                    type="button"
                    onClick={() => onSortChange(column.key)}
                    className="inline-flex items-center gap-1 hover:text-brand-brown-700"
                  >
                    {column.label}
                    <SortIndicator active={sortField === column.key} dir={sortDir} />
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-brand-brown-500">
                No runs match these filters.
              </td>
            </tr>
          ) : (
            runs.map((run) => (
              <tr
                key={run.id}
                onClick={() => navigate(`/runs/${run.id}`)}
                className="cursor-pointer border-t border-brand-border hover:bg-brand-cream-50"
              >
                <td className="whitespace-nowrap px-3 py-2 text-xs text-brand-brown-500">
                  {formatDateTime(run.created_at)}
                </td>
                {showUser && (
                  <td className="px-3 py-2 text-xs text-brand-brown-700">
                    @{run.username}
                  </td>
                )}
                <td className="px-3 py-2 font-mono text-xs text-brand-brown-700">{run.action}</td>
                <td className="px-3 py-2 font-mono text-xs text-brand-brown-700">
                  {run.engine ?? "—"}
                </td>
                <td className="px-3 py-2">
                  {run.status ? (
                    <Badge tone={statusTone(run.status)}>{run.status}</Badge>
                  ) : (
                    <span className="text-xs text-brand-brown-500">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-brand-brown-700">{run.error_count ?? "—"}</td>
                <td className="max-w-xs px-3 py-2">
                  <code className="line-clamp-2 font-mono text-[11px] text-brand-brown-500">
                    {truncate(run.code_preview, 80)}
                  </code>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <div className="inline-flex gap-1" onClick={(event) => event.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/runs/${run.id}`)}
                    >
                      View
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => onRedo(run)}>
                      Redo
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
