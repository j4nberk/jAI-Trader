/**
 * src/pages/News.jsx
 *
 * News page: shows headlines for a chosen symbol or a default market overview.
 */

import React, { useState, useEffect } from 'react';
import { fetchStockNews } from '../api/client';
import SearchBar from '../components/SearchBar';

const DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA'];

function NewsSection({ symbol }) {
  const [articles, setArticles] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchStockNews(symbol, 5)
      .then(({ data }) => setArticles(data.articles || []))
      .catch(() => setError('Failed to fetch news.'))
      .finally(() => setLoading(false));
  }, [symbol]);

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-white mb-3">{symbol}</h3>
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[...Array(3)].map((_, i) => <div key={i} className="h-4 bg-slate-700 rounded" />)}
        </div>
      ) : error ? (
        <p className="text-red-400 text-xs">{error}</p>
      ) : articles.length === 0 ? (
        <p className="text-slate-500 text-xs">No articles found.</p>
      ) : (
        <ul className="divide-y divide-slate-700/50 space-y-0">
          {articles.map((a, i) => (
            <li key={i} className="py-2.5">
              <a
                href={a.link}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-slate-200 hover:text-brand-400 transition-colors font-medium leading-snug"
              >
                {a.title}
              </a>
              <p className="text-xs text-slate-500 mt-0.5">
                {a.source}{a.published ? ` · ${a.published}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function News() {
  const [customSymbol, setCustomSymbol] = useState('');
  const [searched,     setSearched]     = useState('');

  const handleSearch = (sym) => {
    setCustomSymbol(sym.toUpperCase());
    setSearched(sym.toUpperCase());
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Market News</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Latest headlines for popular stocks and your custom search
          </p>
        </div>
        <SearchBar
          onSelect={handleSearch}
          placeholder="Search symbol for news…"
        />
      </div>

      {/* Custom symbol result */}
      {searched && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
            News for {searched}
          </h2>
          <NewsSection symbol={searched} />
        </section>
      )}

      {/* Default watchlist news */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Top Stocks
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {DEFAULT_SYMBOLS.map((sym) => (
            <NewsSection key={sym} symbol={sym} />
          ))}
        </div>
      </section>
    </div>
  );
}
