/**
 * src/components/Navbar.jsx — Top navigation bar
 */

import React from 'react';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/dashboard', label: 'Dashboard',  icon: '📊' },
  { to: '/analysis',  label: 'Analysis',   icon: '🔍' },
  { to: '/news',      label: 'News',        icon: '📰' },
];

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-surface-card border-b border-slate-700/60 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2 select-none">
        <span className="text-2xl">📈</span>
        <span className="text-lg font-bold tracking-tight text-white">
          j<span className="text-brand-500">AI</span>-Trader
        </span>
      </div>

      {/* Links */}
      <ul className="flex items-center gap-1">
        {links.map(({ to, label, icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600/20 text-brand-400'
                    : 'text-slate-400 hover:text-white hover:bg-surface-hover'
                }`
              }
            >
              <span>{icon}</span>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Status indicator */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        Live
      </div>
    </nav>
  );
}
