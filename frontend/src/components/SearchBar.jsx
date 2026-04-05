/**
 * src/components/SearchBar.jsx
 *
 * Ticker search with debounced suggestions fetched from the backend.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchTickers } from '../api/client';

export default function SearchBar({ onSelect, placeholder = 'Search symbol or company…' }) {
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [open, setOpen]             = useState(false);
  const debounceRef                 = useRef(null);
  const wrapperRef                  = useRef(null);
  const navigate                    = useNavigate();

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const { data } = await searchTickers(q);
      setResults(data.results || []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (item) => {
    setQuery('');
    setOpen(false);
    setResults([]);
    if (onSelect) {
      onSelect(item.symbol);
    } else {
      navigate(`/analysis/${item.symbol}`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      handleSelect({ symbol: query.trim().toUpperCase() });
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 bg-surface-hover rounded-lg px-3 py-2 border border-slate-600 focus-within:border-brand-500 transition-colors">
        <span className="text-slate-400">🔍</span>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
        />
        {loading && <span className="text-xs text-slate-400 animate-pulse">…</span>}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute top-full mt-1 left-0 right-0 z-50 bg-surface-card border border-slate-700
                        rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {results.map((item) => (
            <li key={item.symbol}>
              <button
                onMouseDown={() => handleSelect(item)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm
                           hover:bg-surface-hover transition-colors text-left"
              >
                <div>
                  <span className="font-semibold text-white">{item.symbol}</span>
                  {item.name && (
                    <span className="ml-2 text-slate-400 text-xs">{item.name}</span>
                  )}
                </div>
                {item.exchange && (
                  <span className="text-xs text-slate-500">{item.exchange}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
