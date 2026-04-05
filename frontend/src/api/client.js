/**
 * src/api/client.js — Axios instance pre-configured for the FastAPI backend
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export default api;

// Convenience helpers
export const fetchStockInfo    = (symbol)                    => api.get(`/api/stock/${symbol}`);
export const fetchStockHistory = (symbol, period, interval)  =>
  api.get(`/api/stock/${symbol}/history`, { params: { period, interval } });
export const fetchStockNews    = (symbol, limit = 10)        => api.get(`/api/stock/${symbol}/news`, { params: { limit } });
export const fetchAnalysis     = (symbol, period, interval)  =>
  api.get(`/api/stock/${symbol}/analyze`, { params: { period, interval } });
export const searchTickers     = (q, limit = 10)             => api.get('/api/search', { params: { q, limit } });

// Portfolio
export const fetchPortfolio        = ()           => api.get('/api/portfolio');
export const addPortfolioItem      = (data)       => api.post('/api/portfolio', data);
export const updatePortfolioItem   = (id, data)   => api.put(`/api/portfolio/${id}`, data);
export const deletePortfolioItem   = (id)         => api.delete(`/api/portfolio/${id}`);

// Watchlist
export const fetchWatchlist        = ()           => api.get('/api/watchlist');
export const addWatchlistItem      = (data)       => api.post('/api/watchlist', data);
export const updateWatchlistItem   = (id, data)   => api.put(`/api/watchlist/${id}`, data);
export const deleteWatchlistItem   = (id)         => api.delete(`/api/watchlist/${id}`);

// Transactions
export const fetchTransactions     = ()           => api.get('/api/transactions');
export const addTransaction        = (data)       => api.post('/api/transactions', data);
