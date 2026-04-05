"""
backend/main.py

FastAPI application entry point for jAI-Trader.
"""

from __future__ import annotations

import os
from typing import Optional

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from data.stock_data import get_news, get_stock_history, get_stock_info, search_tickers
from llm.analyzer import analyze

import logging

load_dotenv()

logger = logging.getLogger(__name__)

app = FastAPI(
    title="jAI-Trader API",
    description="Investment analysis API powered by FastAPI, yfinance and LLM",
    version="1.0.0",
)

# Allow requests from the Electron / Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@app.get("/health", tags=["system"])
def health_check():
    return {"status": "ok", "service": "jAI-Trader API"}


# ---------------------------------------------------------------------------
# Stock data endpoints
# ---------------------------------------------------------------------------


@app.get("/api/stock/{symbol}", tags=["stocks"])
def stock_info(symbol: str):
    """Return basic company and pricing info for a ticker symbol."""
    try:
        data = get_stock_info(symbol)
        if not data.get("name"):
            raise HTTPException(status_code=404, detail=f"Symbol '{symbol}' not found")
        return data
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error fetching stock info for %s", symbol)
        raise HTTPException(status_code=500, detail="Failed to retrieve stock information.") from exc


@app.get("/api/stock/{symbol}/history", tags=["stocks"])
def stock_history(
    symbol: str,
    period: str = Query(default="1mo", description="1d 5d 1mo 3mo 6mo 1y 2y 5y 10y ytd max"),
    interval: str = Query(default="1d", description="1m 5m 15m 30m 1h 1d 1wk 1mo"),
):
    """Return OHLCV history for a ticker symbol."""
    try:
        data = get_stock_history(symbol, period=period, interval=interval)
        return {"symbol": symbol.upper(), "period": period, "interval": interval, "data": data}
    except Exception as exc:
        logger.exception("Error fetching history for %s", symbol)
        raise HTTPException(status_code=500, detail="Failed to retrieve price history.") from exc


@app.get("/api/stock/{symbol}/news", tags=["stocks"])
def stock_news(
    symbol: str,
    limit: int = Query(default=10, ge=1, le=50),
):
    """Return recent news articles for a ticker symbol."""
    try:
        articles = get_news(symbol, max_items=limit)
        return {"symbol": symbol.upper(), "articles": articles}
    except Exception as exc:
        logger.exception("Error fetching news for %s", symbol)
        raise HTTPException(status_code=500, detail="Failed to retrieve news articles.") from exc


@app.get("/api/search", tags=["stocks"])
def search(
    q: str = Query(..., min_length=1, description="Ticker or company name to search"),
    limit: int = Query(default=10, ge=1, le=50),
):
    """Search for ticker symbols matching a query."""
    try:
        results = search_tickers(q, max_results=limit)
        return {"query": q, "results": results}
    except Exception as exc:
        logger.exception("Error searching tickers for query %r", q)
        raise HTTPException(status_code=500, detail="Search request failed.") from exc


# ---------------------------------------------------------------------------
# LLM analysis endpoint
# ---------------------------------------------------------------------------


@app.get("/api/stock/{symbol}/analyze", tags=["analysis"])
def analyze_stock(
    symbol: str,
    period: str = Query(default="1mo"),
    interval: str = Query(default="1d"),
):
    """
    Return an AI-generated investment analysis for a ticker symbol.
    Combines stock info, price history and recent news to generate insights.
    """
    try:
        info = get_stock_info(symbol)
        history = get_stock_history(symbol, period=period, interval=interval)
        news = get_news(symbol, max_items=5)
        result = analyze(symbol, info, history, news)
        return result
    except Exception as exc:
        logger.exception("Error analyzing stock %s", symbol)
        raise HTTPException(status_code=500, detail="Failed to generate stock analysis.") from exc


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=True)
