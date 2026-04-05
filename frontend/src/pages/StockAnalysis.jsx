/**
 * src/pages/StockAnalysis.jsx
 *
 * Deep-dive analysis page for a single ticker.
 * Shows: stock info, price chart, AI analysis, recent news.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchStockInfo,
  fetchStockHistory,
  fetchStockNews,
  fetchAnalysis,
} from '../api/client';
import SearchBar from '../components/SearchBar';
import StockChart from '../components/StockChart';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val, decimals = 2, prefix = '') {
  if (val == null || val === 'N/A') return 'N/A';
  return `${prefix}${Number(val).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function fmtLargeNum(val) {
  if (val == null) return 'N/A';
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9)  return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6)  return `$${(val / 1e6).toFixed(2)}M`;
  return `$${val.toLocaleString()}`;
}

const TrendBadge = ({ trend }) => {
  const map = {
    bullish:  'badge-bullish',
    bearish:  'badge-bearish',
    neutral:  'badge-neutral',
  };
  return (
    <span className={map[trend] || 'badge-neutral'}>
      {trend === 'bullish' ? '▲' : trend === 'bearish' ? '▼' : '—'} {trend}
    </span>
  );
};

const RecBadge = ({ rec }) => {
  const colorMap = {
    'Strong Buy': 'bg-emerald-800/60 text-emerald-300',
    'Buy':        'bg-emerald-900/60 text-emerald-400',
    'Hold':       'bg-yellow-900/60 text-yellow-300',
    'Sell':       'bg-red-900/60 text-red-400',
    'Strong Sell':'bg-red-800/60 text-red-300',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${colorMap[rec] || 'bg-slate-700 text-slate-300'}`}>
      {rec}
    </span>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export default function StockAnalysis() {
  const { symbol: routeSymbol } = useParams();
  const navigate = useNavigate();

  const [symbol,   setSymbol]   = useState(routeSymbol || '');
  const [info,     setInfo]     = useState(null);
  const [history,  setHistory]  = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [news,     setNews]     = useState([]);
  const [period,   setPeriod]   = useState('1mo');
  const [interval, setInterval] = useState('1d');
  const [loading,  setLoading]  = useState({});
  const [errors,   setErrors]   = useState({});

  const setLoad  = (key, val) => setLoading(p => ({ ...p, [key]: val }));
  const setError = (key, val) => setErrors(p => ({ ...p, [key]: val }));

  const loadAll = useCallback(async (sym) => {
    if (!sym) return;
    setInfo(null); setHistory([]); setAnalysis(null); setNews([]);
    setErrors({});

    // Info
    setLoad('info', true);
    fetchStockInfo(sym)
      .then(({ data }) => setInfo(data))
      .catch(() => setError('info', 'Could not load stock info.'))
      .finally(() => setLoad('info', false));

    // History
    setLoad('history', true);
    fetchStockHistory(sym, period, interval)
      .then(({ data }) => setHistory(data.data || []))
      .catch(() => setError('history', 'Could not load price history.'))
      .finally(() => setLoad('history', false));

    // News
    setLoad('news', true);
    fetchStockNews(sym, 8)
      .then(({ data }) => setNews(data.articles || []))
      .catch(() => setError('news', 'Could not load news.'))
      .finally(() => setLoad('news', false));

    // AI analysis (slower – separate loader)
    setLoad('analysis', true);
    fetchAnalysis(sym, period, interval)
      .then(({ data }) => setAnalysis(data))
      .catch(() => setError('analysis', 'AI analysis unavailable.'))
      .finally(() => setLoad('analysis', false));
  }, [period, interval]);

  useEffect(() => {
    if (routeSymbol) {
      setSymbol(routeSymbol.toUpperCase());
      loadAll(routeSymbol.toUpperCase());
    }
  }, [routeSymbol]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (sym) => {
    navigate(`/analysis/${sym}`);
  };

  const handlePeriodChange = (newPeriod, newInterval) => {
    setPeriod(newPeriod);
    setInterval(newInterval);
    if (symbol) {
      setLoad('history', true);
      fetchStockHistory(symbol, newPeriod, newInterval)
        .then(({ data }) => setHistory(data.data || []))
        .catch(() => setError('history', 'Could not load price history.'))
        .finally(() => setLoad('history', false));
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Stock Analysis</h1>
          <p className="text-sm text-slate-400 mt-0.5">AI-powered investment insights</p>
        </div>
        <div className="sm:ml-auto">
          <SearchBar onSelect={handleSearch} placeholder="Search for a ticker…" />
        </div>
      </div>

      {/* Empty state */}
      {!symbol && (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-slate-300 text-lg font-medium">Search for a ticker to begin</p>
          <p className="text-slate-500 text-sm mt-1">
            Enter a stock symbol or company name above
          </p>
        </div>
      )}

      {/* Stock info header */}
      {symbol && (
        <>
          {loading.info ? (
            <div className="card p-6 animate-pulse space-y-3">
              <div className="h-6 bg-slate-700 rounded w-1/3" />
              <div className="h-4 bg-slate-700 rounded w-2/3" />
              <div className="grid grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 bg-slate-700 rounded" />
                ))}
              </div>
            </div>
          ) : errors.info ? (
            <div className="card p-6 text-red-400 text-sm">{errors.info}</div>
          ) : info && (
            <div className="card p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white">{info.symbol}</h2>
                    {analysis && <RecBadge rec={analysis.recommendation} />}
                    {analysis && <TrendBadge trend={analysis.trend} />}
                  </div>
                  <p className="text-slate-300 text-sm mt-0.5">{info.name}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {info.sector} · {info.industry}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-white">
                    {fmt(info.currentPrice, 2, info.currency === 'USD' ? '$' : '')}
                  </p>
                  {info.previousClose != null && (
                    <p className={`text-sm font-medium ${
                      info.currentPrice >= info.previousClose
                        ? 'text-emerald-400'
                        : 'text-red-400'
                    }`}>
                      {info.currentPrice >= info.previousClose ? '▲' : '▼'}{' '}
                      {Math.abs(
                        ((info.currentPrice - info.previousClose) / info.previousClose) * 100
                      ).toFixed(2)}%
                    </p>
                  )}
                </div>
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Market Cap',    value: fmtLargeNum(info.marketCap) },
                  { label: 'P/E (trailing)',value: fmt(info.trailingPE, 2)     },
                  { label: 'Beta',          value: fmt(info.beta, 2)           },
                  { label: 'Div. Yield',    value: info.dividendYield != null
                      ? `${(info.dividendYield * 100).toFixed(2)}%` : 'N/A'   },
                  { label: '52W High',      value: fmt(info.fiftyTwoWeekHigh, 2, '$') },
                  { label: '52W Low',       value: fmt(info.fiftyTwoWeekLow,  2, '$') },
                  { label: 'Volume',        value: info.volume != null
                      ? `${(info.volume / 1e6).toFixed(2)}M` : 'N/A'          },
                  { label: 'Exchange',      value: info.exchange || 'N/A'     },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-surface-hover rounded-lg p-3">
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chart */}
          {loading.history ? (
            <div className="card p-4 h-64 animate-pulse bg-slate-700/30" />
          ) : (
            <StockChart
              data={history}
              symbol={symbol}
              onPeriodChange={handlePeriodChange}
            />
          )}

          {/* AI Analysis */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500 mb-3">
              AI Analysis
            </h3>
            {loading.analysis ? (
              <div className="space-y-2 animate-pulse">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`h-3 bg-slate-700 rounded ${i === 4 ? 'w-2/3' : 'w-full'}`} />
                ))}
              </div>
            ) : errors.analysis ? (
              <p className="text-red-400 text-sm">{errors.analysis}</p>
            ) : analysis ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-slate-200 leading-relaxed text-sm">
                  {analysis.analysis}
                </pre>
                <p className="text-xs text-slate-500 mt-3">
                  Model: {analysis.model}
                </p>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Search for a symbol to see analysis.</p>
            )}
          </div>

          {/* News */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500 mb-3">
              Recent News
            </h3>
            {loading.news ? (
              <div className="space-y-3 animate-pulse">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 bg-slate-700 rounded" />
                ))}
              </div>
            ) : errors.news ? (
              <p className="text-red-400 text-sm">{errors.news}</p>
            ) : news.length === 0 ? (
              <p className="text-slate-500 text-sm">No recent news found.</p>
            ) : (
              <ul className="divide-y divide-slate-700/50">
                {news.map((article, i) => (
                  <li key={i} className="py-3">
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-slate-200 hover:text-brand-400 transition-colors"
                    >
                      {article.title}
                    </a>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {article.source}
                      {article.published && ` · ${article.published}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
