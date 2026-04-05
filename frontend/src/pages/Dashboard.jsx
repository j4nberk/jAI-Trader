/**
 * src/pages/Dashboard.jsx
 *
 * Overview dashboard showing a watchlist of popular stocks.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchStockInfo } from '../api/client';
import SearchBar from '../components/SearchBar';

const WATCHLIST = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'BTC-USD'];

function StockCard({ symbol }) {
  const navigate = useNavigate();
  const [info, setInfo]     = useState(null);
  const [error, setError]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStockInfo(symbol)
      .then(({ data }) => setInfo(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [symbol]);

  const change = info
    ? ((info.currentPrice - info.previousClose) / info.previousClose) * 100
    : 0;
  const isUp = change >= 0;

  return (
    <div
      onClick={() => navigate(`/analysis/${symbol}`)}
      className="card p-4 cursor-pointer hover:border-brand-500/50 transition-all hover:shadow-brand-500/10"
    >
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-slate-700 rounded w-1/2" />
          <div className="h-6 bg-slate-700 rounded w-3/4" />
          <div className="h-3 bg-slate-700 rounded w-1/3" />
        </div>
      ) : error ? (
        <div className="text-slate-500 text-sm">{symbol} — unavailable</div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-xs text-slate-400">{symbol}</p>
              <p className="text-sm font-semibold text-white truncate max-w-[140px]">
                {info.name}
              </p>
            </div>
            <span
              className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                isUp ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'
              }`}
            >
              {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
            </span>
          </div>
          <p className="text-xl font-bold text-white">
            {info.currentPrice != null
              ? `${info.currency === 'USD' ? '$' : ''}${info.currentPrice.toLocaleString()}`
              : 'N/A'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{info.sector || info.exchange || ''}</p>
        </>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time market overview — powered by jAI-Trader
          </p>
        </div>
        <SearchBar onSelect={(sym) => navigate(`/analysis/${sym}`)} />
      </div>

      {/* Watchlist */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Watchlist
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {WATCHLIST.map((sym) => (
            <StockCard key={sym} symbol={sym} />
          ))}
        </div>
      </section>

      {/* Quick actions */}
      <section className="card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Analyze a Stock',  icon: '🔍', path: '/analysis' },
            { label: 'Read Latest News', icon: '📰', path: '/news'     },
            { label: 'View Dashboard',   icon: '📊', path: '/dashboard'},
          ].map(({ label, icon, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex items-center gap-3 p-4 rounded-lg border border-slate-700
                         hover:border-brand-500/60 hover:bg-brand-600/10 transition-all text-left"
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-sm font-medium text-slate-200">{label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
