import type { ReactNode } from "react";
import type { Route } from "../lib/router";

interface NavItem {
  href: string;
  label: string;
  match: Route["name"][];
  icon: ReactNode;
}

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const NAV: NavItem[] = [
  {
    href: "#/",
    label: "Dashboard",
    match: ["dashboard"],
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...stroke}>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "#/validators",
    label: "Validators",
    match: ["validators", "validator"],
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...stroke}>
        <path d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    ),
  },
  {
    href: "#/simulator",
    label: "Simulator",
    match: ["simulator"],
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...stroke}>
        <path d="M12 3a9 9 0 1 0 9 9h-9z" />
        <path d="M15 3.5A9 9 0 0 1 20.5 9H15z" />
      </svg>
    ),
  },
  {
    href: "#/learn",
    label: "Learn",
    match: ["learn"],
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...stroke}>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
        <path d="M4 5.5v16" />
      </svg>
    ),
  },
];

function Brand() {
  return (
    <a className="brand" href="#/" aria-label="GenLayer StakeWise home">
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill="#1f4fd8" />
        <rect x="7" y="8" width="18" height="4" rx="2" fill="#fff" />
        <rect x="7" y="14" width="13" height="4" rx="2" fill="#fff" opacity=".85" />
        <rect x="7" y="20" width="8" height="4" rx="2" fill="#fff" opacity=".7" />
      </svg>
      <span>
        GenLayer <strong>StakeWise</strong>
      </span>
    </a>
  );
}

export default function Layout({ route, children }: { route: Route; children: ReactNode }) {
  const isActive = (item: NavItem) => item.match.includes(route.name);

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Main">
          <ul>
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} aria-current={isActive(item) ? "page" : undefined}>
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="sidebar-note">
          Read-only and simulation-only. No wallet, no transactions, no real delegations.
        </p>
      </aside>

      <div className="content">
        <header className="topbar">
          <Brand />
          <span className="pill pill-sim">Simulation only</span>
        </header>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Main, mobile">
        <ul>
          {NAV.map((item) => (
            <li key={item.href}>
              <a href={item.href} aria-current={isActive(item) ? "page" : undefined}>
                {item.icon}
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
