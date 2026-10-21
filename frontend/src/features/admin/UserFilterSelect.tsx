import { useEffect, useMemo, useRef, useState } from "react";
import type { AdminUserSummary } from "../../lib/types";

interface UserFilterSelectProps {
  users: AdminUserSummary[];
  value: number | null;
  onChange: (userId: number | null) => void;
}

/** Searchable user dropdown for the admin runs filter (combobox pattern). */
export function UserFilterSelect({ users, value, onChange }: UserFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = users.find((user) => user.id === value) ?? null;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(
      (user) =>
        user.username.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle),
    );
  }, [users, query]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function select(user: AdminUserSummary | null) {
    onChange(user ? user.id : null);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1">
      <label htmlFor="admin-user-filter" className="text-xs font-medium text-brand-brown-700">
        User
      </label>
      <input
        id="admin-user-filter"
        role="combobox"
        aria-expanded={open}
        aria-controls="admin-user-list"
        autoComplete="off"
        value={open ? query : (selected?.username ?? "")}
        placeholder="All users"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="w-48 rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-brown-900 placeholder:text-brand-brown-500/60 focus:ring-2 focus:ring-brand-gold-400 focus:ring-offset-1"
      />

      {open && (
        <ul
          id="admin-user-list"
          role="listbox"
          className="absolute top-full z-10 mt-1 max-h-60 w-64 overflow-auto rounded-lg border border-brand-border bg-white py-1 shadow-warm"
        >
          <li>
            <button
              type="button"
              role="option"
              aria-selected={value === null}
              onClick={() => select(null)}
              className="w-full px-3 py-2 text-left text-sm text-brand-brown-700 hover:bg-brand-cream-100"
            >
              All users
            </button>
          </li>
          {filtered.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                role="option"
                aria-selected={user.id === value}
                onClick={() => select(user)}
                className="flex w-full flex-col px-3 py-2 text-left hover:bg-brand-cream-100"
              >
                <span className="text-sm text-brand-brown-900">{user.username}</span>
                <span className="text-xs text-brand-brown-500">{user.email}</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-brand-brown-500">No users match.</li>
          )}
        </ul>
      )}
    </div>
  );
}
