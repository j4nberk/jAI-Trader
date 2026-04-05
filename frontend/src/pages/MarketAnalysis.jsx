/**
 * src/pages/MarketAnalysis.jsx
 *
 * Portföy genelinde AI destekli analiz sayfası.
 * - "Analizi Başlat" butonu
 * - Yüklenirken loading spinner
 * - Piyasa özeti, öneri kartları, portföy uyarıları, günlük aksiyonlar
 * - Her sabah 09:30'da otomatik yenileme
 * - Stop seviyesine yaklaşınca sistem bildirimi
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchPortfolioAnalysis } from '../api/client';

/* ─── Renk yardımcıları ──────────────────────────────────────────────────── */

const ACTION_STYLES = {
  AL:     { bg: 'bg-emerald-900/40', border: 'border-emerald-500/50', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300' },
  EKLE:   { bg: 'bg-teal-900/40',   border: 'border-teal-500/50',   text: 'text-teal-300',   badge: 'bg-teal-500/20 text-teal-300'   },
  TUT:    { bg: 'bg-amber-900/40',  border: 'border-amber-500/50',  text: 'text-amber-300',  badge: 'bg-amber-500/20 text-amber-300'  },
  AZALT:  { bg: 'bg-orange-900/40', border: 'border-orange-500/50', text: 'text-orange-300', badge: 'bg-orange-500/20 text-orange-300' },
  SAT:    { bg: 'bg-red-900/40',    border: 'border-red-500/50',    text: 'text-red-300',    badge: 'bg-red-500/20 text-red-300'    },
  İZLE:   { bg: 'bg-blue-900/40',   border: 'border-blue-500/50',   text: 'text-blue-300',   badge: 'bg-blue-500/20 text-blue-300'   },
};

const RISK_STYLES = {
  'DÜŞÜK': 'bg-emerald-500/20 text-emerald-300',
  'ORTA':  'bg-amber-500/20  text-amber-300',
  'YÜKSEK':'bg-red-500/20    text-red-300',
};

const ALERT_STYLES = {
  STOP_YAKLAŞIYOR: { badge: 'bg-red-500    text-white', icon: '🔴' },
  HEDEFE_ULAŞTI:  { badge: 'bg-emerald-500 text-white', icon: '🟢' },
  DİKKAT:         { badge: 'bg-amber-500   text-white', icon: '🟡' },
};

function actionStyle(action) {
  return ACTION_STYLES[action?.toUpperCase()] ?? ACTION_STYLES['İZLE'];
}

/* ─── Bildirim yardımcısı ─────────────────────────────────────────────────── */

async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function sendNotification(title, body) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
}

/* ─── Alt bileşenler ─────────────────────────────────────────────────────── */

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      <p className="text-slate-400 text-sm animate-pulse">Portföy analiz ediliyor…</p>
    </div>
  );
}

function MarketSummaryCard({ summary }) {
  return (
    <section className="card p-6 space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        🌍 Piyasa Özeti
      </h2>
      <p className="text-slate-200 leading-relaxed whitespace-pre-line">{summary}</p>
    </section>
  );
}

function RecommendationCard({ rec }) {
  const st = actionStyle(rec.short_term);
  return (
    <div className={`card p-5 border ${st.border} ${st.bg} space-y-3`}>
      {/* Başlık */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-widest">{rec.symbol}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-sm font-bold px-2 py-0.5 rounded ${st.badge}`}>
              {rec.short_term} (kısa)
            </span>
            {rec.mid_term && (
              <span className={`text-xs px-2 py-0.5 rounded ${actionStyle(rec.mid_term).badge}`}>
                {rec.mid_term} (orta)
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {rec.risk_level && (
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${RISK_STYLES[rec.risk_level] ?? ''}`}>
              Risk: {rec.risk_level}
            </span>
          )}
          {rec.confidence && (
            <span className="text-xs text-slate-500">
              Güven: {rec.confidence}
            </span>
          )}
        </div>
      </div>

      {/* Gerekçe */}
      {rec.rationale && (
        <p className="text-sm text-slate-300 leading-relaxed">{rec.rationale}</p>
      )}

      {/* Fiyat seviyeleri */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        {rec.buy_zone && (
          <div className="bg-surface/60 rounded p-2">
            <p className="text-slate-500 mb-0.5">Alım Bölgesi</p>
            <p className="text-slate-200 font-medium">{rec.buy_zone}</p>
          </div>
        )}
        {rec.target && (
          <div className="bg-surface/60 rounded p-2">
            <p className="text-slate-500 mb-0.5">Hedef</p>
            <p className="text-emerald-300 font-medium">{rec.target}</p>
          </div>
        )}
        {rec.stop && (
          <div className="bg-surface/60 rounded p-2">
            <p className="text-slate-500 mb-0.5">Stop</p>
            <p className="text-red-300 font-medium">{rec.stop}</p>
          </div>
        )}
      </div>

      {/* Tetikleyici */}
      {rec.trigger && (
        <p className="text-xs text-slate-500 border-t border-slate-700/50 pt-2">
          ⚡ {rec.trigger}
        </p>
      )}
    </div>
  );
}

function AlertsSection({ alerts }) {
  if (!alerts?.length) return null;
  return (
    <section className="card p-6 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-2">
        🚨 Portföy Uyarıları
        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {alerts.length}
        </span>
      </h2>
      <ul className="space-y-2">
        {alerts.map((alert, i) => {
          const style = ALERT_STYLES[alert.alert_type] ?? ALERT_STYLES['DİKKAT'];
          return (
            <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-surface/60 border border-slate-700/40">
              <span className="text-lg leading-none mt-0.5">{style.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-slate-200 text-sm">{alert.symbol}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
                    {alert.alert_type?.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm text-slate-400">{alert.message}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DailyActionsSection({ daily }) {
  if (!daily) return null;
  const sections = [
    { key: 'urgent', label: '🔥 Acil Aksiyonlar', color: 'text-red-300' },
    { key: 'watch',  label: '👁  Yakın Takip',     color: 'text-amber-300' },
    { key: 'hold',   label: '✅ Bekle / Tut',      color: 'text-slate-300' },
  ];
  return (
    <section className="card p-6 space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        📋 Bugün Uygulanabilir Aksiyonlar
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sections.map(({ key, label, color }) => {
          const items = daily[key];
          if (!items?.length) return null;
          return (
            <div key={key} className="bg-surface/60 rounded-lg p-4 space-y-2 border border-slate-700/40">
              <p className={`text-sm font-semibold ${color}`}>{label}</p>
              <ul className="space-y-1.5">
                {items.map((item, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-1.5">
                    <span className="text-slate-500 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─── Ana sayfa ───────────────────────────────────────────────────────────── */

export default function MarketAnalysis() {
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [lastRun, setLastRun]   = useState(null);
  const schedulerRef            = useRef(null);
  const inFlightRef             = useRef(false);   // prevent concurrent calls
  const lastAutoRunDateRef      = useRef(null);    // track auto-run date to run once per day

  /* Analizi çalıştır */
  const runAnalysis = useCallback(async (silent = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!silent) setError(null);
    setLoading(true);
    try {
      const { data } = await fetchPortfolioAnalysis();
      setResult(data);
      setLastRun(new Date());

      // Stop uyarıları için bildirim gönder (tek bildirim olarak toplu)
      const stopAlerts = data?.portfolio_alerts?.filter(
        (a) => a.alert_type === 'STOP_YAKLAŞIYOR'
      );
      if (stopAlerts?.length) {
        const granted = await requestNotificationPermission();
        if (granted) {
          if (stopAlerts.length === 1) {
            sendNotification(
              `⚠️ Stop Uyarısı — ${stopAlerts[0].symbol}`,
              stopAlerts[0].message
            );
          } else {
            const symbols = stopAlerts.map((a) => a.symbol).join(', ');
            sendNotification(
              `⚠️ ${stopAlerts.length} Stop Uyarısı`,
              `Stop seviyesine yaklaşan varlıklar: ${symbols}`
            );
          }
        }
      }
    } catch (err) {
      if (!silent) {
        setError(
          err?.response?.data?.detail ??
          err?.message ??
          'Analiz alınamadı. Backend çalışıyor mu?'
        );
      }
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, []);

  /* Otomatik yenileme: her dakika saat 09:30'ı kontrol et, günde bir kez çalıştır */
  useEffect(() => {
    schedulerRef.current = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 9 && now.getMinutes() === 30) {
        const today = now.toDateString();
        if (lastAutoRunDateRef.current !== today) {
          lastAutoRunDateRef.current = today;
          runAnalysis(true);
        }
      }
    }, 60_000);
    return () => clearInterval(schedulerRef.current);
  }, [runAnalysis]);

  /* Bildirim izni iste (sayfa ilk yüklendiğinde) */
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Portföy Analizi</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            AI destekli portföy analizi · Her sabah 09:30'da otomatik yenilenir
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRun && (
            <span className="text-xs text-slate-500">
              Son analiz: {lastRun.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => runAnalysis(false)}
            disabled={loading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analiz Ediliyor…
              </>
            ) : (
              <>
                <span>🤖</span>
                Analizi Başlat
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hata */}
      {error && (
        <div className="card p-4 border-red-500/40 bg-red-900/20 text-red-300 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Yükleniyor */}
      {loading && <Spinner />}

      {/* Sonuçlar */}
      {!loading && result && (
        <>
          {/* Piyasa özeti */}
          {result.market_summary && (
            <MarketSummaryCard summary={result.market_summary} />
          )}

          {/* Portföy uyarıları */}
          {result.portfolio_alerts?.length > 0 && (
            <AlertsSection alerts={result.portfolio_alerts} />
          )}

          {/* Öneri kartları */}
          {result.recommendations?.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                📌 Varlık Önerileri
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {result.recommendations.map((rec) => (
                  <RecommendationCard key={rec.symbol} rec={rec} />
                ))}
              </div>
            </section>
          )}

          {/* Günlük aksiyonlar */}
          {result.daily_actions && (
            <DailyActionsSection daily={result.daily_actions} />
          )}
        </>
      )}

      {/* Boş durum (ilk açılışta) */}
      {!loading && !result && !error && (
        <div className="card p-12 flex flex-col items-center gap-4 text-center">
          <span className="text-5xl">🤖</span>
          <div>
            <p className="text-lg font-semibold text-white">Analiz Hazır</p>
            <p className="text-sm text-slate-400 mt-1 max-w-md">
              Portföyünüzdeki varlıklar için AI destekli öneri, uyarı ve günlük aksiyonlar
              almak için "Analizi Başlat" butonuna tıklayın.
            </p>
          </div>
          <button
            onClick={() => runAnalysis(false)}
            className="btn-primary flex items-center gap-2 mt-2"
          >
            <span>🤖</span>
            Analizi Başlat
          </button>
        </div>
      )}
    </div>
  );
}
