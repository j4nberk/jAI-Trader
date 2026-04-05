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
