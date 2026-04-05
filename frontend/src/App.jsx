/**
 * src/App.jsx — Root application component with routing
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import StockAnalysis from './pages/StockAnalysis';
import News from './pages/News';
import Portfolio from './pages/Portfolio';
import MarketAnalysis from './pages/MarketAnalysis';
import Analysis from './pages/Analysis';

export default function App() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface text-slate-100">
      <Navbar />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analysis" element={<StockAnalysis />} />
          <Route path="/analysis/:symbol" element={<StockAnalysis />} />
          <Route path="/market-analysis" element={<MarketAnalysis />} />
          <Route path="/portfolio-analysis" element={<Analysis />} />
          <Route path="/news" element={<News />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
