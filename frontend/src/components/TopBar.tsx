import { Link, useLocation } from "react-router-dom";

export default function TopBar() {
  const { pathname } = useLocation();
  return (
    <header className="border-b border-slate-200 bg-white px-6 py-3 flex items-center gap-8 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold">
          A
        </div>
        <h1 className="text-lg font-semibold text-slate-900">AIVOA · HCP CRM</h1>
      </div>
      <nav className="flex gap-1 text-sm">
        <NavLink to="/" active={pathname === "/"}>
          Log Interaction
        </NavLink>
        <NavLink to="/interactions" active={pathname === "/interactions"}>
          History
        </NavLink>
      </nav>
    </header>
  );
}

function NavLink({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-md transition-colors ${
        active ? "bg-brand-50 text-brand-700 font-medium" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {children}
    </Link>
  );
}
