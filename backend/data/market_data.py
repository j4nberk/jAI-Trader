"""
backend/data/market_data.py

Helpers for BIST stock quotes, cryptocurrency data (CoinGecko), financial news
(KAP + BloombergHT RSS), and portfolio price/P&L calculations.
"""

from __future__ import annotations

import logging
from typing import Optional

import feedparser
import requests
import yfinance as yf

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# CoinGecko helpers
# ---------------------------------------------------------------------------

# Common symbol -> CoinGecko coin ID mapping
_COINGECKO_IDS: dict[str, str] = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "BNB": "binancecoin",
    "SOL": "solana",
    "ADA": "cardano",
    "XRP": "ripple",
    "DOGE": "dogecoin",
    "DOT": "polkadot",
    "AVAX": "avalanche-2",
    "MATIC": "matic-network",
    "LINK": "chainlink",
    "UNI": "uniswap",
    "LTC": "litecoin",
    "BCH": "bitcoin-cash",
    "ATOM": "cosmos",
    "TRX": "tron",
    "ETC": "ethereum-classic",
    "XLM": "stellar",
    "ALGO": "algorand",
    "FIL": "filecoin",
}

_COINGECKO_BASE = "https://api.coingecko.com/api/v3"


def _resolve_coin_id(symbol: str) -> str:
    """Return the CoinGecko coin ID for a given ticker symbol."""
    sym = symbol.upper()
    if sym in _COINGECKO_IDS:
        return _COINGECKO_IDS[sym]
    # Fall back to lowercase symbol as best-effort
    return sym.lower()


def get_crypto_data(symbols: list[str]) -> list[dict]:
    """
    Fetch USD price, 24 h change %, market cap, and BTC/ETH dominance for
    the requested symbols using the free CoinGecko API.
    """
    coin_ids = [_resolve_coin_id(s) for s in symbols]
    ids_param = ",".join(coin_ids)

    prices: dict = {}
    try:
        resp = requests.get(
            f"{_COINGECKO_BASE}/simple/price",
            params={
                "ids": ids_param,
                "vs_currencies": "usd",
                "include_market_cap": "true",
                "include_24hr_change": "true",
            },
            timeout=15,
        )
        resp.raise_for_status()
        prices = resp.json()
    except Exception:
        logger.exception("CoinGecko price fetch failed")

    # Fetch global dominance data (BTC / ETH only available in /global)
    dominance: dict[str, float] = {}
    try:
        global_resp = requests.get(f"{_COINGECKO_BASE}/global", timeout=15)
        global_resp.raise_for_status()
        dominance = global_resp.json().get("data", {}).get("market_cap_percentage", {})
    except Exception:
        logger.exception("CoinGecko global data fetch failed")

    results: list[dict] = []
    for symbol, coin_id in zip(symbols, coin_ids):
        data = prices.get(coin_id, {})
        results.append(
            {
                "symbol": symbol.upper(),
                "coin_id": coin_id,
                "price_usd": data.get("usd"),
                "change_24h_pct": data.get("usd_24h_change"),
                "market_cap_usd": data.get("usd_market_cap"),
                "dominance_pct": dominance.get(coin_id),
            }
        )
    return results


# ---------------------------------------------------------------------------
# BIST stock helpers
# ---------------------------------------------------------------------------


def get_bist_stocks(symbols: list[str]) -> list[dict]:
    """
    Fetch price, daily change %, volume, and 52-week high/low for BIST
    tickers via yfinance (appends .IS suffix automatically).
    """
    results: list[dict] = []
    for sym in symbols:
        clean = sym.upper().replace(".IS", "")
        ticker_symbol = f"{clean}.IS"
        try:
            ticker = yf.Ticker(ticker_symbol)
            info = ticker.info or {}
            current = info.get("currentPrice") or info.get("regularMarketPrice")
            prev_close = info.get("previousClose") or info.get("regularMarketPreviousClose")
            if current is not None and prev_close and prev_close != 0:
                change_pct = round((current - prev_close) / prev_close * 100, 2)
            else:
                change_pct = None
            results.append(
                {
                    "symbol": clean,
                    "ticker": ticker_symbol,
                    "name": info.get("longName") or info.get("shortName") or clean,
                    "price": current,
                    "currency": info.get("currency", "TRY"),
                    "change_pct": change_pct,
                    "volume": info.get("volume") or info.get("regularMarketVolume"),
                    "week52_high": info.get("fiftyTwoWeekHigh"),
                    "week52_low": info.get("fiftyTwoWeekLow"),
                }
            )
        except Exception:
            logger.exception("yfinance fetch failed for %s", ticker_symbol)
            results.append(
                {
                    "symbol": clean,
                    "ticker": ticker_symbol,
                    "name": clean,
                    "price": None,
                    "currency": "TRY",
                    "change_pct": None,
                    "volume": None,
                    "week52_high": None,
                    "week52_low": None,
                }
            )
    return results


# ---------------------------------------------------------------------------
# News helpers
# ---------------------------------------------------------------------------

_NEWS_SOURCES = [
    {"url": "https://www.kap.org.tr/tr/rss/bildirim", "name": "KAP"},
    {"url": "https://www.bloomberght.com/rss", "name": "BloombergHT"},
]


def get_market_news(limit: int = 20) -> list[dict]:
    """
    Return the most recent financial news from KAP and BloombergHT RSS feeds,
    merged and sorted by published date (newest first), capped at *limit*.
    """
    articles: list[dict] = []
    for source in _NEWS_SOURCES:
        try:
            feed = feedparser.parse(source["url"])
            for entry in feed.entries:
                published = (
                    entry.get("published")
                    or entry.get("updated")
                    or ""
                )
                articles.append(
                    {
                        "title": entry.get("title", "").strip(),
                        "link": entry.get("link", "").strip(),
                        "published": published,
                        "source": source["name"],
                    }
                )
        except Exception:
            logger.exception("RSS fetch failed for source %s", source["name"])

    # Sort newest-first using published string (RFC 2822 sorts lexicographically
    # enough for mixed sources; fall back to empty string for missing dates).
    articles.sort(key=lambda a: a.get("published", ""), reverse=True)
    return articles[:limit]


# ---------------------------------------------------------------------------
# Portfolio price helpers
# ---------------------------------------------------------------------------


def _get_stock_price(symbol: str, asset_type: str) -> Optional[float]:
    """Return the current price for a stock symbol (BIST or US)."""
    ticker_symbol = f"{symbol.upper()}.IS" if asset_type == "BIST" else symbol.upper()
    try:
        ticker = yf.Ticker(ticker_symbol)
        info = ticker.info or {}
        return info.get("currentPrice") or info.get("regularMarketPrice")
    except Exception:
        logger.exception("yfinance fetch failed for %s", ticker_symbol)
        return None


def get_portfolio_prices(portfolio_items: list[dict]) -> list[dict]:
    """
    Enrich each portfolio item with its current price and calculated P&L.

    Parameters
    ----------
    portfolio_items : list[dict]
        Each item must have keys: id, symbol, type, quantity, avg_cost.
        *type* is one of 'BIST' | 'CRYPTO' | 'US'.

    Returns
    -------
    list[dict]
        Original fields plus current_price, current_value, cost_basis,
        pnl_amount, pnl_pct.
    """
    # Batch-fetch crypto prices to avoid multiple round-trips
    crypto_symbols = [
        item["symbol"] for item in portfolio_items if item.get("type") == "CRYPTO"
    ]
    crypto_prices: dict[str, Optional[float]] = {}
    if crypto_symbols:
        coin_ids = [_resolve_coin_id(s) for s in crypto_symbols]
        try:
            resp = requests.get(
                f"{_COINGECKO_BASE}/simple/price",
                params={"ids": ",".join(coin_ids), "vs_currencies": "usd"},
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            for sym, coin_id in zip(crypto_symbols, coin_ids):
                crypto_prices[sym.upper()] = data.get(coin_id, {}).get("usd")
        except Exception:
            logger.exception("Batch CoinGecko fetch failed for portfolio")

    results: list[dict] = []
    for item in portfolio_items:
        symbol = item["symbol"].upper()
        asset_type = item.get("type", "US")
        quantity = float(item.get("quantity", 0))
        avg_cost = float(item.get("avg_cost", 0))

        if asset_type == "CRYPTO":
            current_price = crypto_prices.get(symbol)
        else:
            current_price = _get_stock_price(symbol, asset_type)

        cost_basis = round(quantity * avg_cost, 4)
        if current_price is not None:
            current_value = round(quantity * current_price, 4)
            pnl_amount = round(current_value - cost_basis, 4)
            pnl_pct = round((pnl_amount / cost_basis * 100), 2) if cost_basis else None
        else:
            current_value = None
            pnl_amount = None
            pnl_pct = None

        results.append(
            {
                **item,
                "current_price": current_price,
                "current_value": current_value,
                "cost_basis": cost_basis,
                "pnl_amount": pnl_amount,
                "pnl_pct": pnl_pct,
            }
        )
    return results
