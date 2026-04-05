/**
 * src/components/Navbar.jsx — Top navigation bar
 */

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/dashboard',        label: 'Dashboard', icon: '📊' },
  { to: '/analysis',         label: 'Analysis',  icon: '🔍' },
  { to: '/portfolio-analysis', label: 'Portföy Analizi', icon: '🤖' },
  { to: '/news',             label: 'News',       icon: '📰' },
  { to: '/portfolio',        label: 'Portföy',   icon: '💼' },
];

/** Toggle for the 09:30 automatic daily analysis trigger. State is persisted in localStorage. */
function AutoAnalysisToggle() {
  const [enabled, setEnabled] = useState(
    () => localStorage.getItem('autoAnalysis') === 'true'
  );

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem('autoAnalysis', String(next));
  }

  return (
    <button
      onClick={toggle}
      title={enabled ? 'Otomatik analiz aktif — her sabah 09:30' : 'Otomatik analizi etkinleştir (09:30)'}
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
        enabled
          ? 'bg-brand-600/20 text-brand-400 border-brand-500/40 hover:bg-brand-600/30'
          : 'text-slate-500 border-slate-700/50 hover:text-slate-300 hover:border-slate-600/60'
      }`}
    >
      <span>⏰</span>
      <span>09:30</span>
      {enabled && <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />}
    </button>
  );
}

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

      {/* Right side: auto-analysis toggle + live indicator */}
      <div className="flex items-center gap-3">
        <AutoAnalysisToggle />
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </div>
      </div>
    </nav>
  );
}
