import { Link, useLocation } from "react-router-dom";

export default function TopBar() {
  const { pathname } = useLocation();
  return (
    <header className="relative z-10 bg-paper-100/80 backdrop-blur-md border-b border-ink-100/80">
      <div className="px-8 py-4 flex items-center justify-between max-w-[1440px] mx-auto">
        <Link to="/" className="flex items-center gap-3 group">
          <Logo />
          <div className="flex flex-col leading-none">
            <span className="font-display text-[22px] font-semibold text-ink-900 tracking-tight">
              AIVOA
            </span>
            <span className="text-[10px] uppercase tracking-[0.22em] text-ink-500 mt-0.5">
              HCP Interaction Log
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          <NavItem to="/" active={pathname === "/"}>
            Log Interaction
          </NavItem>
          <NavItem to="/interactions" active={pathname === "/interactions"}>
            History
          </NavItem>
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-ink-500 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-clinical-500 animate-pulse-soft" />
            <span>LIVE</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-ink-700 to-ink-900 flex items-center justify-center text-paper-50 font-display font-semibold text-sm">
            SR
          </div>
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <div className="relative w-10 h-10 rounded-xl bg-ink-900 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-clinical-700/40 via-transparent to-violet-700/30" />
      <svg viewBox="0 0 24 24" className="relative w-5 h-5 text-paper-50" fill="none">
        <path
          d="M4 16 L10 6 L14 13 L20 4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="4" r="1.6" fill="currentColor" />
      </svg>
    </div>
  );
}

function NavItem({
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
      className={`relative px-4 py-2 text-sm font-medium transition-colors ${
        active ? "text-ink-900" : "text-ink-500 hover:text-ink-700"
      }`}
    >
      {children}
      {active && (
        <span className="absolute inset-x-3 -bottom-[17px] h-px bg-ink-900" />
      )}
    </Link>
  );
}
