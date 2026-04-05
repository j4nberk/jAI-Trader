/**
 * src/components/StockChart.jsx
 *
 * Recharts-based price chart supporting area, line and candlestick-like bar views.
 */

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const PERIODS = [
  { label: '1D',  period: '1d',  interval: '5m'  },
  { label: '5D',  period: '5d',  interval: '30m' },
  { label: '1M',  period: '1mo', interval: '1d'  },
  { label: '3M',  period: '3mo', interval: '1d'  },
  { label: '6M',  period: '6mo', interval: '1wk' },
  { label: '1Y',  period: '1y',  interval: '1wk' },
  { label: '5Y',  period: '5y',  interval: '1mo' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-surface-card border border-slate-700 rounded-lg p-3 shadow-xl text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-white">Close: <span className="text-brand-400 font-semibold">{d?.close?.toFixed(2)}</span></p>
      {d?.open  !== undefined && <p className="text-slate-300">Open:  {d.open.toFixed(2)}</p>}
      {d?.high  !== undefined && <p className="text-emerald-400">High:  {d.high.toFixed(2)}</p>}
      {d?.low   !== undefined && <p className="text-red-400">Low:   {d.low.toFixed(2)}</p>}
      {d?.volume !== undefined && (
        <p className="text-slate-400 mt-1">Vol: {(d.volume / 1_000_000).toFixed(2)}M</p>
      )}
    </div>
  );
};

export default function StockChart({ data = [], symbol = '', onPeriodChange }) {
  const [activePeriod, setActivePeriod] = useState(PERIODS[2]); // default 1M

  const handlePeriod = (p) => {
    setActivePeriod(p);
    if (onPeriodChange) onPeriodChange(p.period, p.interval);
  };

  // Simplify x-axis labels
  const tickFormatter = (val) => {
    if (!val) return '';
    const parts = val.split(' ');
    return parts[0];            // show date only
  };

  const isPositive =
    data.length >= 2 ? data[data.length - 1].close >= data[0].close : true;
  const strokeColor = isPositive ? '#34d399' : '#f87171';
  const fillColor   = isPositive ? '#34d39920' : '#f8717120';

  return (
    <div className="card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300">
          {symbol} — Price Chart
        </h3>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.label}
              onClick={() => handlePeriod(p)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                activePeriod.label === p.label
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-surface-hover'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={strokeColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={tickFormatter}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v.toFixed(0)}`}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="close"
              stroke={strokeColor}
              strokeWidth={2}
              fill="url(#priceGradient)"
              dot={false}
              activeDot={{ r: 4, fill: strokeColor }}
            />
            <Bar dataKey="volume" yAxisId={1} fill="#334155" opacity={0.4} barSize={3} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
