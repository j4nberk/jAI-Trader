/**
 * src/pages/Portfolio.jsx
 *
 * Portfolio management page: positions, summary cards, watchlist, and transactions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchPortfolio,
  addPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  fetchWatchlist,
  addWatchlistItem,
  updateWatchlistItem,
  deleteWatchlistItem,
  fetchStockInfo,
} from '../api/client';

// ─── Helpers ────────────────────────────────────────────────────────────────

function pct(value) {
  if (value == null || isNaN(value)) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function currency(value, digits = 2) {
  if (value == null || isNaN(value)) return '—';
  return value.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function clsPnl(value) {
  if (value == null || isNaN(value)) return 'text-slate-400';
  return value >= 0 ? 'text-emerald-400' : 'text-red-400';
}

// ─── Summary Cards ───────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, valueClass = '' }) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold text-white ${valueClass}`}>{value}</p>
      {sub && <p className={`text-xs ${clsPnl(parseFloat(sub))}`}>{sub}</p>}
    </div>
  );
}

// ─── Portfolio Form ───────────────────────────────────────────────────────────

const EMPTY_FORM = { symbol: '', type: 'BIST', quantity: '', avg_cost: '' };

function PortfolioForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    if (!form.symbol || !form.quantity || !form.avg_cost) return;
    onSave({ ...form, quantity: parseFloat(form.quantity), avg_cost: parseFloat(form.avg_cost) });
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
      <div>
        <label className="block text-xs text-slate-400 mb-1">Sembol</label>
        <input
          name="symbol"
          value={form.symbol}
          onChange={handle}
          placeholder="AAPL"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          required
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Tür</label>
        <select
          name="type"
          value={form.type}
          onChange={handle}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="BIST">BIST</option>
          <option value="CRYPTO">CRYPTO</option>
          <option value="US">US</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Adet</label>
        <input
          name="quantity"
          type="number"
          min="0"
          step="any"
          value={form.quantity}
          onChange={handle}
          placeholder="100"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          required
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Ort. Maliyet</label>
        <input
          name="avg_cost"
          type="number"
          min="0"
          step="any"
          value={form.avg_cost}
          onChange={handle}
          placeholder="150.00"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          required
        />
      </div>
      <div className="col-span-2 sm:col-span-4 flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-ghost text-xs px-3 py-1.5">
          İptal
        </button>
        <button type="submit" className="btn-primary text-xs px-3 py-1.5">
          {initial ? 'Güncelle' : 'Ekle'}
        </button>
      </div>
    </form>
  );
}

// ─── Watchlist Form ───────────────────────────────────────────────────────────

const EMPTY_WL = { symbol: '', target_price: '', stop_price: '', notes: '' };

function WatchlistForm({ onSave, onCancel }) {
  const [form, setForm] = useState(EMPTY_WL);
  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    if (!form.symbol) return;
    onSave({
      symbol: form.symbol,
      target_price: form.target_price ? parseFloat(form.target_price) : null,
      stop_price: form.stop_price ? parseFloat(form.stop_price) : null,
      notes: form.notes || null,
    });
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
      <div>
        <label className="block text-xs text-slate-400 mb-1">Sembol</label>
        <input
          name="symbol"
          value={form.symbol}
          onChange={handle}
          placeholder="BTC-USD"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          required
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Hedef Fiyat</label>
        <input
          name="target_price"
          type="number"
          min="0"
          step="any"
          value={form.target_price}
          onChange={handle}
          placeholder="200.00"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Stop Fiyat</label>
        <input
          name="stop_price"
          type="number"
          min="0"
          step="any"
          value={form.stop_price}
          onChange={handle}
          placeholder="180.00"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Notlar</label>
        <input
          name="notes"
          value={form.notes}
          onChange={handle}
          placeholder="Opsiyonel not"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div className="col-span-2 sm:col-span-4 flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-ghost text-xs px-3 py-1.5">
          İptal
        </button>
        <button type="submit" className="btn-primary text-xs px-3 py-1.5">
          Ekle
        </button>
      </div>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Portfolio() {
  const navigate = useNavigate();

  const [portfolio, setPortfolio]   = useState([]);
  const [watchlist, setWatchlist]   = useState([]);
  const [prices, setPrices]         = useState({});          // symbol -> { currentPrice, previousClose }
  const [loading, setLoading]       = useState(true);

  const [showAddForm, setShowAddForm]   = useState(false);
  const [editItem, setEditItem]         = useState(null);    // portfolio item being edited
  const [showWlForm, setShowWlForm]     = useState(false);
  const [editWlItem, setEditWlItem]     = useState(null);    // watchlist item being edited
  const [editWlForm, setEditWlForm]     = useState({});

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    try {
      const [pRes, wRes] = await Promise.all([fetchPortfolio(), fetchWatchlist()]);
      setPortfolio(pRes.data);
      setWatchlist(wRes.data);

      // Fetch live prices for all unique symbols
      const symbols = [...new Set([
        ...pRes.data.map((i) => i.symbol),
        ...wRes.data.map((i) => i.symbol),
      ])];
      if (symbols.length > 0) {
        const results = await Promise.allSettled(symbols.map((s) => fetchStockInfo(s)));
        const map = {};
        results.forEach((r, idx) => {
          if (r.status === 'fulfilled') map[symbols[idx]] = r.value.data;
        });
        setPrices(map);
      }
    } catch (err) {
      console.error('Portfolio load error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Portfolio CRUD ─────────────────────────────────────────────────────────

  const handleAddPortfolio = async (data) => {
    await addPortfolioItem(data);
    setShowAddForm(false);
    loadAll();
  };

  const handleUpdatePortfolio = async (data) => {
    await updatePortfolioItem(editItem.id, data);
    setEditItem(null);
    loadAll();
  };

  const handleDeletePortfolio = async (id) => {
    if (!window.confirm('Bu varlığı silmek istediğinize emin misiniz?')) return;
    await deletePortfolioItem(id);
    loadAll();
  };

  // ── Watchlist CRUD ─────────────────────────────────────────────────────────

  const handleAddWatchlist = async (data) => {
    await addWatchlistItem(data);
    setShowWlForm(false);
    loadAll();
  };

  const handleUpdateWatchlist = async (id) => {
    await updateWatchlistItem(id, {
      target_price: editWlForm.target_price ? parseFloat(editWlForm.target_price) : null,
      stop_price: editWlForm.stop_price ? parseFloat(editWlForm.stop_price) : null,
      notes: editWlForm.notes || null,
    });
    setEditWlItem(null);
    loadAll();
  };

  const handleDeleteWatchlist = async (id) => {
    if (!window.confirm('Bu kaydı izleme listesinden silmek istediğinize emin misiniz?')) return;
    await deleteWatchlistItem(id);
    loadAll();
  };

  // ── Summary calculations ───────────────────────────────────────────────────

  let totalInvested  = 0;
  let totalCurrent   = 0;
  let prevTotalValue = 0;

  portfolio.forEach((item) => {
    const info = prices[item.symbol];
    const invested  = item.quantity * item.avg_cost;
    const current   = info?.currentPrice   != null ? item.quantity * info.currentPrice   : invested;
    const prevClose = info?.previousClose  != null ? item.quantity * info.previousClose  : current;

    totalInvested  += invested;
    totalCurrent   += current;
    prevTotalValue += prevClose;
  });

  const totalPnl       = totalCurrent - totalInvested;
  const totalPnlPct    = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const dailyChange    = totalCurrent - prevTotalValue;
  const dailyChangePct = prevTotalValue > 0 ? (dailyChange / prevTotalValue) * 100 : 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        Yükleniyor…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Portföy</h1>
        <p className="text-sm text-slate-400 mt-0.5">Varlıklarınızı takip edin ve yönetin</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Toplam Yatırım"    value={currency(totalInvested)} />
        <SummaryCard label="Güncel Değer"       value={currency(totalCurrent)} />
        <SummaryCard
          label="Toplam K/Z"
          value={currency(totalPnl)}
          sub={pct(totalPnlPct)}
          valueClass={clsPnl(totalPnl)}
        />
        <SummaryCard
          label="Günlük Değişim"
          value={currency(dailyChange)}
          sub={pct(dailyChangePct)}
          valueClass={clsPnl(dailyChange)}
        />
      </div>

      {/* Portfolio table */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            Portföy
          </h2>
          <button onClick={() => { setShowAddForm(true); setEditItem(null); }} className="btn-primary text-xs px-3 py-1.5">
            + Varlık Ekle
          </button>
        </div>

        {(showAddForm || editItem) && (
          <div className="px-5 py-4 border-b border-slate-700/40 bg-slate-800/40">
            <PortfolioForm
              initial={editItem ? { ...editItem, quantity: String(editItem.quantity), avg_cost: String(editItem.avg_cost) } : null}
              onSave={editItem ? handleUpdatePortfolio : handleAddPortfolio}
              onCancel={() => { setShowAddForm(false); setEditItem(null); }}
            />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-700/50">
                <th className="text-left px-5 py-3">Hisse</th>
                <th className="text-left px-4 py-3">Tür</th>
                <th className="text-right px-4 py-3">Adet</th>
                <th className="text-right px-4 py-3">Ort. Maliyet</th>
                <th className="text-right px-4 py-3">Güncel Fiyat</th>
                <th className="text-right px-4 py-3">K/Z%</th>
                <th className="text-right px-4 py-3">Toplam Değer</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {portfolio.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-slate-500 py-10">
                    Henüz varlık eklenmedi.
                  </td>
                </tr>
              )}
              {portfolio.map((item) => {
                const info         = prices[item.symbol];
                const currentPrice = info?.currentPrice ?? null;
                const pnlPct       = currentPrice != null
                  ? ((currentPrice - item.avg_cost) / item.avg_cost) * 100
                  : null;
                const totalValue   = currentPrice != null ? item.quantity * currentPrice : null;

                return (
                  <tr
                    key={item.id}
                    className="border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <button
                        onClick={() => navigate(`/analysis/${item.symbol}`)}
                        className="font-semibold text-white hover:text-brand-400 transition-colors"
                      >
                        {item.symbol}
                      </button>
                      <p className="text-xs text-slate-500">{item.date_added}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge-neutral">{item.type}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-200">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-slate-200">{currency(item.avg_cost)}</td>
                    <td className="px-4 py-3 text-right text-slate-200">
                      {currentPrice != null ? currency(currentPrice) : <span className="text-slate-500">—</span>}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${clsPnl(pnlPct)}`}>
                      {pct(pnlPct)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-200">
                      {totalValue != null ? currency(totalValue) : <span className="text-slate-500">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditItem(item); setShowAddForm(false); }}
                          className="text-slate-400 hover:text-white text-xs"
                          title="Düzenle"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeletePortfolio(item.id)}
                          className="text-slate-400 hover:text-red-400 text-xs"
                          title="Sil"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Watchlist */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            İzleme Listesi
          </h2>
          <button onClick={() => setShowWlForm(true)} className="btn-primary text-xs px-3 py-1.5">
            + Sembol Ekle
          </button>
        </div>

        {showWlForm && (
          <div className="px-5 py-4 border-b border-slate-700/40 bg-slate-800/40">
            <WatchlistForm onSave={handleAddWatchlist} onCancel={() => setShowWlForm(false)} />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-700/50">
                <th className="text-left px-5 py-3">Sembol</th>
                <th className="text-right px-4 py-3">Güncel Fiyat</th>
                <th className="text-right px-4 py-3">Hedef Fiyat</th>
                <th className="text-right px-4 py-3">Stop Fiyat</th>
                <th className="text-left px-4 py-3">Notlar</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {watchlist.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-slate-500 py-10">
                    İzleme listesi boş.
                  </td>
                </tr>
              )}
              {watchlist.map((item) => {
                const info         = prices[item.symbol];
                const currentPrice = info?.currentPrice ?? null;
                const isEditing    = editWlItem === item.id;

                return (
                  <tr
                    key={item.id}
                    className="border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <button
                        onClick={() => navigate(`/analysis/${item.symbol}`)}
                        className="font-semibold text-white hover:text-brand-400 transition-colors"
                      >
                        {item.symbol}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-200">
                      {currentPrice != null ? currency(currentPrice) : <span className="text-slate-500">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          step="any"
                          defaultValue={item.target_price ?? ''}
                          onChange={(e) => setEditWlForm({ ...editWlForm, target_price: e.target.value })}
                          className="w-24 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white text-right focus:outline-none"
                        />
                      ) : (
                        <span className={item.target_price != null && currentPrice != null && currentPrice >= item.target_price ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
                          {item.target_price != null ? currency(item.target_price) : '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          step="any"
                          defaultValue={item.stop_price ?? ''}
                          onChange={(e) => setEditWlForm({ ...editWlForm, stop_price: e.target.value })}
                          className="w-24 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white text-right focus:outline-none"
                        />
                      ) : (
                        <span className={item.stop_price != null && currentPrice != null && currentPrice <= item.stop_price ? 'text-red-400 font-semibold' : 'text-slate-300'}>
                          {item.stop_price != null ? currency(item.stop_price) : '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs max-w-[200px] truncate">
                      {isEditing ? (
                        <input
                          type="text"
                          defaultValue={item.notes ?? ''}
                          onChange={(e) => setEditWlForm({ ...editWlForm, notes: e.target.value })}
                          className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none"
                        />
                      ) : (
                        item.notes || '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleUpdateWatchlist(item.id)}
                              className="text-emerald-400 hover:text-emerald-300 text-xs"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => { setEditWlItem(null); setEditWlForm({}); }}
                              className="text-slate-400 hover:text-white text-xs"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => { setEditWlItem(item.id); setEditWlForm({ target_price: item.target_price, stop_price: item.stop_price, notes: item.notes }); }}
                              className="text-slate-400 hover:text-white text-xs"
                              title="Düzenle"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteWatchlist(item.id)}
                              className="text-slate-400 hover:text-red-400 text-xs"
                              title="Sil"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
