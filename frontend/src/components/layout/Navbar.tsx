import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/useAuth";
import { Button } from "../ui/Button";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? "bg-brand-cream-200 text-brand-brown-900" : "text-brand-brown-500 hover:text-brand-brown-900"
  }`;

export function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header
      data-testid="navbar"
      className="sticky top-0 z-40 border-b border-brand-border bg-brand-cream-50/90 backdrop-blur"
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="font-display text-xl text-brand-brown-900">
          Compiler&nbsp;Lab
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {user && (
            <>
              <NavLink to="/workspace" className={linkClass}>
                Workspace
              </NavLink>
              <NavLink to="/history" className={linkClass}>
                History
              </NavLink>
              {isAdmin && (
                <NavLink to="/admin" className={linkClass}>
                  Admin
                </NavLink>
              )}
            </>
          )}
          <NavLink to="/docs" className={linkClass}>
            Docs
          </NavLink>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <span className="text-sm text-brand-brown-500">@{user.username}</span>
              <Button size="sm" variant="secondary" onClick={handleLogout}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="secondary" onClick={() => navigate("/login")}>
                Log in
              </Button>
              <Button size="sm" onClick={() => navigate("/register")}>
                Register
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          className="rounded-lg p-2 text-brand-brown-700 md:hidden"
          onClick={() => setMenuOpen((open) => !open)}
        >
          ☰
        </button>
      </nav>

      {menuOpen && (
        <div className="flex flex-col gap-1 border-t border-brand-border px-4 py-3 md:hidden">
          {user && (
            <>
              <NavLink to="/workspace" className={linkClass} onClick={() => setMenuOpen(false)}>
                Workspace
              </NavLink>
              <NavLink to="/history" className={linkClass} onClick={() => setMenuOpen(false)}>
                History
              </NavLink>
              {isAdmin && (
                <NavLink to="/admin" className={linkClass} onClick={() => setMenuOpen(false)}>
                  Admin
                </NavLink>
              )}
            </>
          )}
          <NavLink to="/docs" className={linkClass} onClick={() => setMenuOpen(false)}>
            Docs
          </NavLink>
          {user ? (
            <Button size="sm" variant="secondary" onClick={handleLogout}>
              Log out
            </Button>
          ) : (
            <>
              <Button size="sm" variant="secondary" onClick={() => navigate("/login")}>
                Log in
              </Button>
              <Button size="sm" onClick={() => navigate("/register")}>
                Register
              </Button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
