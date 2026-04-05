"""
backend/main.py

FastAPI application entry point for jAI-Trader.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import List, Optional

import aiosqlite
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from data.stock_data import get_news, get_stock_history, get_stock_info, search_tickers
from data.market_data import (
    get_bist_stocks,
    get_crypto_data,
    get_market_news,
    get_portfolio_prices,
)
from llm.analyzer import analyze
from database.db import get_db, init_db

import logging

load_dotenv()

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="jAI-Trader API",
    description="Investment analysis API powered by FastAPI, yfinance and LLM",
    version="1.0.0",
    lifespan=lifespan,
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
# Pydantic models
# ---------------------------------------------------------------------------


class PortfolioCreate(BaseModel):
    symbol: str
    type: str  # BIST | CRYPTO | US
    quantity: float
    avg_cost: float
    date_added: Optional[str] = None


class PortfolioUpdate(BaseModel):
    symbol: Optional[str] = None
    type: Optional[str] = None
    quantity: Optional[float] = None
    avg_cost: Optional[float] = None
    date_added: Optional[str] = None


class WatchlistCreate(BaseModel):
    symbol: str
    target_price: Optional[float] = None
    stop_price: Optional[float] = None
    notes: Optional[str] = None


class WatchlistUpdate(BaseModel):
    target_price: Optional[float] = None
    stop_price: Optional[float] = None
    notes: Optional[str] = None


class TransactionCreate(BaseModel):
    symbol: str
    type: str  # BUY | SELL
    quantity: float
    price: float
    date: Optional[str] = None


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
# BIST stock quotes endpoint
# ---------------------------------------------------------------------------


@app.get("/stocks", tags=["market"])
def stocks_quote(
    symbols: str = Query(..., description="Comma-separated BIST ticker list, e.g. EREGL,THYAO,BIMAS"),
):
    """
    Return price, daily change %, volume and 52-week high/low for BIST stocks.
    Appends the .IS suffix automatically for yfinance.
    """
    try:
        symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
        if not symbol_list:
            raise HTTPException(status_code=400, detail="No symbols provided")
        data = get_bist_stocks(symbol_list)
        return {"stocks": data}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error fetching BIST stocks: %s", symbols)
        raise HTTPException(status_code=500, detail="Failed to retrieve stock data.") from exc


# ---------------------------------------------------------------------------
# Crypto quotes endpoint
# ---------------------------------------------------------------------------


@app.get("/crypto", tags=["market"])
def crypto_quote(
    symbols: str = Query(..., description="Comma-separated crypto symbols, e.g. BTC,ETH,BNB,SOL"),
):
    """
    Return USD price, 24 h change %, market cap and dominance for
    the requested cryptocurrencies via the free CoinGecko API.
    """
    try:
        symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
        if not symbol_list:
            raise HTTPException(status_code=400, detail="No symbols provided")
        data = get_crypto_data(symbol_list)
        return {"crypto": data}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error fetching crypto data: %s", symbols)
        raise HTTPException(status_code=500, detail="Failed to retrieve crypto data.") from exc


# ---------------------------------------------------------------------------
# Market news endpoint
# ---------------------------------------------------------------------------


@app.get("/news", tags=["market"])
def market_news(
    limit: int = Query(default=20, ge=1, le=100, description="Maximum number of articles to return"),
):
    """
    Return the latest financial news from KAP and BloombergHT RSS feeds,
    sorted newest-first (title, source, date, link).
    """
    try:
        articles = get_market_news(limit=limit)
        return {"articles": articles, "count": len(articles)}
    except Exception as exc:
        logger.exception("Error fetching market news")
        raise HTTPException(status_code=500, detail="Failed to retrieve market news.") from exc


# ---------------------------------------------------------------------------
# Portfolio live prices endpoint
# ---------------------------------------------------------------------------


@app.get("/portfolio/prices", tags=["portfolio"])
async def portfolio_prices():
    """
    Return all portfolio positions enriched with current prices and P&L.
    Supports BIST (yfinance .IS), CRYPTO (CoinGecko) and US (yfinance) assets.
    """
    try:
        async with get_db() as db:
            cursor = await db.execute("SELECT * FROM portfolio ORDER BY id DESC")
            rows = await cursor.fetchall()
            items = [dict(row) for row in rows]
        enriched = get_portfolio_prices(items)
        total_cost = sum(i["cost_basis"] for i in enriched if i["cost_basis"] is not None)
        total_value = sum(i["current_value"] for i in enriched if i["current_value"] is not None)
        total_pnl = round(total_value - total_cost, 4) if total_cost else None
        total_pnl_pct = round(total_pnl / total_cost * 100, 2) if (total_cost and total_pnl is not None) else None
        return {
            "positions": enriched,
            "summary": {
                "total_cost": round(total_cost, 4),
                "total_value": round(total_value, 4),
                "total_pnl": total_pnl,
                "total_pnl_pct": total_pnl_pct,
            },
        }
    except Exception as exc:
        logger.exception("Error fetching portfolio prices")
        raise HTTPException(status_code=500, detail="Failed to retrieve portfolio prices.") from exc


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
# Portfolio endpoints
# ---------------------------------------------------------------------------


@app.get("/api/portfolio", tags=["portfolio"])
async def list_portfolio():
    """Return all portfolio positions."""
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM portfolio ORDER BY id DESC")
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


@app.post("/api/portfolio", tags=["portfolio"], status_code=201)
async def add_portfolio(item: PortfolioCreate):
    """Add a new position to the portfolio."""
    async with get_db() as db:
        if item.date_added:
            cursor = await db.execute(
                "INSERT INTO portfolio (symbol, type, quantity, avg_cost, date_added) VALUES (?,?,?,?,?)",
                (item.symbol.upper(), item.type, item.quantity, item.avg_cost, item.date_added),
            )
        else:
            cursor = await db.execute(
                "INSERT INTO portfolio (symbol, type, quantity, avg_cost) VALUES (?,?,?,?)",
                (item.symbol.upper(), item.type, item.quantity, item.avg_cost),
            )
        await db.commit()
        row = await (await db.execute("SELECT * FROM portfolio WHERE id=?", (cursor.lastrowid,))).fetchone()
        return dict(row)


@app.put("/api/portfolio/{item_id}", tags=["portfolio"])
async def update_portfolio(item_id: int, item: PortfolioUpdate):
    """Update an existing portfolio position."""
    _PORTFOLIO_COLS = {"symbol", "type", "quantity", "avg_cost", "date_added"}
    async with get_db() as db:
        existing = await (await db.execute("SELECT * FROM portfolio WHERE id=?", (item_id,))).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Portfolio item not found")
        fields = {k: v for k, v in item.model_dump().items() if v is not None and k in _PORTFOLIO_COLS}
        if not fields:
            return dict(existing)
        set_clause = ", ".join(f"{k}=?" for k in fields)
        values = list(fields.values()) + [item_id]
        await db.execute(f"UPDATE portfolio SET {set_clause} WHERE id=?", values)
        await db.commit()
        row = await (await db.execute("SELECT * FROM portfolio WHERE id=?", (item_id,))).fetchone()
        return dict(row)


@app.delete("/api/portfolio/{item_id}", tags=["portfolio"])
async def delete_portfolio(item_id: int):
    """Remove a position from the portfolio."""
    async with get_db() as db:
        existing = await (await db.execute("SELECT * FROM portfolio WHERE id=?", (item_id,))).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Portfolio item not found")
        await db.execute("DELETE FROM portfolio WHERE id=?", (item_id,))
        await db.commit()
        return {"deleted": item_id}


# ---------------------------------------------------------------------------
# Watchlist endpoints
# ---------------------------------------------------------------------------


@app.get("/api/watchlist", tags=["watchlist"])
async def list_watchlist():
    """Return all watchlist entries."""
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM watchlist ORDER BY id DESC")
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


@app.post("/api/watchlist", tags=["watchlist"], status_code=201)
async def add_watchlist(item: WatchlistCreate):
    """Add a symbol to the watchlist."""
    async with get_db() as db:
        try:
            cursor = await db.execute(
                "INSERT INTO watchlist (symbol, target_price, stop_price, notes) VALUES (?,?,?,?)",
                (item.symbol.upper(), item.target_price, item.stop_price, item.notes),
            )
            await db.commit()
        except aiosqlite.IntegrityError:
            raise HTTPException(status_code=409, detail="Symbol already in watchlist")
        row = await (await db.execute("SELECT * FROM watchlist WHERE id=?", (cursor.lastrowid,))).fetchone()
        return dict(row)


@app.put("/api/watchlist/{item_id}", tags=["watchlist"])
async def update_watchlist(item_id: int, item: WatchlistUpdate):
    """Update a watchlist entry."""
    _WATCHLIST_COLS = {"target_price", "stop_price", "notes"}
    async with get_db() as db:
        existing = await (await db.execute("SELECT * FROM watchlist WHERE id=?", (item_id,))).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Watchlist item not found")
        fields = {k: v for k, v in item.model_dump().items() if v is not None and k in _WATCHLIST_COLS}
        if not fields:
            return dict(existing)
        set_clause = ", ".join(f"{k}=?" for k in fields)
        values = list(fields.values()) + [item_id]
        await db.execute(f"UPDATE watchlist SET {set_clause} WHERE id=?", values)
        await db.commit()
        row = await (await db.execute("SELECT * FROM watchlist WHERE id=?", (item_id,))).fetchone()
        return dict(row)


@app.delete("/api/watchlist/{item_id}", tags=["watchlist"])
async def delete_watchlist(item_id: int):
    """Remove an entry from the watchlist."""
    async with get_db() as db:
        existing = await (await db.execute("SELECT * FROM watchlist WHERE id=?", (item_id,))).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Watchlist item not found")
        await db.execute("DELETE FROM watchlist WHERE id=?", (item_id,))
        await db.commit()
        return {"deleted": item_id}


# ---------------------------------------------------------------------------
# Transactions endpoints
# ---------------------------------------------------------------------------


@app.get("/api/transactions", tags=["transactions"])
async def list_transactions():
    """Return all transactions."""
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM transactions ORDER BY id DESC")
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


@app.post("/api/transactions", tags=["transactions"], status_code=201)
async def add_transaction(item: TransactionCreate):
    """Record a new transaction."""
    async with get_db() as db:
        if item.date:
            cursor = await db.execute(
                "INSERT INTO transactions (symbol, type, quantity, price, date) VALUES (?,?,?,?,?)",
                (item.symbol.upper(), item.type, item.quantity, item.price, item.date),
            )
        else:
            cursor = await db.execute(
                "INSERT INTO transactions (symbol, type, quantity, price) VALUES (?,?,?,?)",
                (item.symbol.upper(), item.type, item.quantity, item.price),
            )
        await db.commit()
        row = await (await db.execute("SELECT * FROM transactions WHERE id=?", (cursor.lastrowid,))).fetchone()
        return dict(row)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=True)
