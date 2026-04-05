"""
backend/data/stock_data.py

Fetches stock price history, company info, and financial news via yfinance and feedparser.
"""

from __future__ import annotations

import feedparser
import yfinance as yf


def get_stock_info(symbol: str) -> dict:
    """Return basic company info for the given ticker symbol."""
    ticker = yf.Ticker(symbol)
    info = ticker.info or {}
    return {
        "symbol": symbol.upper(),
        "name": info.get("longName", info.get("shortName", symbol)),
        "sector": info.get("sector", "N/A"),
        "industry": info.get("industry", "N/A"),
        "marketCap": info.get("marketCap"),
        "currentPrice": info.get("currentPrice", info.get("regularMarketPrice")),
        "previousClose": info.get("previousClose"),
        "open": info.get("open"),
        "dayHigh": info.get("dayHigh"),
        "dayLow": info.get("dayLow"),
        "volume": info.get("volume"),
        "fiftyTwoWeekHigh": info.get("fiftyTwoWeekHigh"),
        "fiftyTwoWeekLow": info.get("fiftyTwoWeekLow"),
        "trailingPE": info.get("trailingPE"),
        "forwardPE": info.get("forwardPE"),
        "dividendYield": info.get("dividendYield"),
        "beta": info.get("beta"),
        "description": info.get("longBusinessSummary", ""),
        "currency": info.get("currency", "USD"),
        "exchange": info.get("exchange", ""),
    }


def get_stock_history(symbol: str, period: str = "1mo", interval: str = "1d") -> list[dict]:
    """
    Return OHLCV candlestick data for the given ticker.

    Parameters
    ----------
    symbol : str
        Ticker symbol, e.g. "AAPL".
    period : str
        Valid periods: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max.
    interval : str
        Valid intervals: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo.
    """
    ticker = yf.Ticker(symbol)
    df = ticker.history(period=period, interval=interval)
    if df.empty:
        return []

    records = []
    for ts, row in df.iterrows():
        records.append(
            {
                "date": ts.strftime("%Y-%m-%d %H:%M"),
                "open": round(float(row["Open"]), 4),
                "high": round(float(row["High"]), 4),
                "low": round(float(row["Low"]), 4),
                "close": round(float(row["Close"]), 4),
                "volume": int(row["Volume"]),
            }
        )
    return records


def get_news(symbol: str, max_items: int = 10) -> list[dict]:
    """
    Return recent news articles for the given ticker via Google Finance RSS.
    Falls back to Yahoo Finance news API if RSS is unavailable.
    """
    rss_url = (
        f"https://feeds.finance.yahoo.com/rss/2.0/headline"
        f"?s={symbol}&region=US&lang=en-US"
    )
    feed = feedparser.parse(rss_url)
    articles: list[dict] = []

    for entry in feed.entries[:max_items]:
        articles.append(
            {
                "title": entry.get("title", ""),
                "link": entry.get("link", ""),
                "published": entry.get("published", ""),
                "summary": entry.get("summary", ""),
                "source": entry.get("source", {}).get("title", "Yahoo Finance"),
            }
        )

    # If RSS returned nothing, try yfinance built-in news
    if not articles:
        ticker = yf.Ticker(symbol)
        yf_news = ticker.news or []
        for item in yf_news[:max_items]:
            articles.append(
                {
                    "title": item.get("title", ""),
                    "link": item.get("link", ""),
                    "published": "",
                    "summary": "",
                    "source": item.get("publisher", "Yahoo Finance"),
                }
            )

    return articles


def search_tickers(query: str, max_results: int = 10) -> list[dict]:
    """
    Search for tickers matching a query string.
    Uses yfinance's Search utility when available, with a simple fallback.
    """
    try:
        search = yf.Search(query, max_results=max_results)
        quotes = search.quotes or []
        results = []
        for q in quotes[:max_results]:
            results.append(
                {
                    "symbol": q.get("symbol", ""),
                    "name": q.get("longname", q.get("shortname", "")),
                    "exchange": q.get("exchange", ""),
                    "type": q.get("quoteType", ""),
                }
            )
        return results
    except Exception:
        # Minimal fallback: treat the query itself as a symbol
        return [{"symbol": query.upper(), "name": query.upper(), "exchange": "", "type": "EQUITY"}]
