import type { AdminUserSummary } from "../../lib/types";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { formatDateTime } from "../../lib/format";

interface UsersTableProps {
  users: AdminUserSummary[];
  loading: boolean;
  onViewRuns: (user: AdminUserSummary) => void;
}

const HEAD_CELL = "px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-brand-brown-500";

/** Admin users tab: identity, role, activity, and a jump to that user's runs. */
export function UsersTable({ users, loading, onViewRuns }: UsersTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-brand-border bg-white shadow-warm">
      <table className="w-full border-collapse text-sm">
        <thead className="border-b border-brand-border bg-brand-cream-50">
          <tr>
            <th className={HEAD_CELL}>Username</th>
            <th className={HEAD_CELL}>Email</th>
            <th className={HEAD_CELL}>Role</th>
            <th className={HEAD_CELL}>Run Count</th>
            <th className={HEAD_CELL}>Last Active</th>
            <th className={HEAD_CELL}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: 4 }).map((_, index) => (
              <tr key={index} className="border-b border-brand-border last:border-0">
                <td className="px-4 py-3" colSpan={6}>
                  <Skeleton className="h-5 w-full" />
                </td>
              </tr>
            ))}

          {!loading && users.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-brand-brown-500">
                No users found.
              </td>
            </tr>
          )}

          {!loading &&
            users.map((user) => (
              <tr key={user.id} className="border-b border-brand-border last:border-0">
                <td className="px-4 py-3 font-medium text-brand-brown-900">{user.username}</td>
                <td className="px-4 py-3 text-brand-brown-700">{user.email}</td>
                <td className="px-4 py-3">
                  <Badge tone={user.role === "admin" ? "info" : "neutral"}>{user.role}</Badge>
                </td>
                <td className="px-4 py-3 text-brand-brown-700">{user.run_count}</td>
                <td className="px-4 py-3 text-brand-brown-500">{formatDateTime(user.last_active)}</td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="sm" onClick={() => onViewRuns(user)}>
                    View runs
                  </Button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
