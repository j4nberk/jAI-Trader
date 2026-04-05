"""
backend/llm/analyzer.py

Sends stock data + news to an LLM (OpenAI-compatible API) and returns
a structured investment analysis.  Works without an API key by returning
a placeholder analysis.
"""

from __future__ import annotations

import os

import httpx
from dotenv import load_dotenv

load_dotenv()

_API_KEY = os.getenv("OPENAI_API_KEY", "")
_API_URL = os.getenv("LLM_API_URL", "https://api.openai.com/v1/chat/completions")
_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")

_SYSTEM_PROMPT = """You are an expert financial analyst AI. Given stock data and recent news,
provide a concise investment analysis covering:
1. Current trend (bullish / neutral / bearish)
2. Key strengths and risks
3. Short-term outlook (1–4 weeks)
4. Recommendation (Buy / Hold / Sell) with brief justification

Respond in plain English, using bullet points where helpful. Keep the analysis under 400 words."""


def analyze(symbol: str, stock_info: dict, history: list[dict], news: list[dict]) -> dict:
    """
    Call the LLM API and return an analysis dict.

    Returns
    -------
    dict with keys: symbol, recommendation, trend, analysis, model
    """
    if not _API_KEY or _API_KEY == "your_openai_api_key_here":
        return _placeholder_analysis(symbol, stock_info)

    user_content = _build_user_prompt(symbol, stock_info, history, news)

    try:
        response = httpx.post(
            _API_URL,
            headers={
                "Authorization": f"Bearer {_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": _MODEL,
                "messages": [
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": user_content},
                ],
                "temperature": 0.4,
                "max_tokens": 600,
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        text = data["choices"][0]["message"]["content"].strip()
        recommendation = _extract_recommendation(text)
        trend = _extract_trend(text)
        return {
            "symbol": symbol.upper(),
            "recommendation": recommendation,
            "trend": trend,
            "analysis": text,
            "model": _MODEL,
        }
    except Exception as exc:
        return {
            "symbol": symbol.upper(),
            "recommendation": "N/A",
            "trend": "neutral",
            "analysis": f"Analysis unavailable: {exc}",
            "model": _MODEL,
        }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_user_prompt(
    symbol: str, info: dict, history: list[dict], news: list[dict]
) -> str:
    recent = history[-10:] if len(history) >= 10 else history
    price_lines = "\n".join(
        f"  {r['date']}: close={r['close']}, volume={r['volume']}" for r in recent
    )

    news_lines = ""
    for i, article in enumerate(news[:5], 1):
        news_lines += f"  {i}. {article['title']} ({article['source']})\n"
        if article.get("summary"):
            news_lines += f"     {article['summary'][:200]}\n"

    return f"""Stock: {symbol.upper()} — {info.get('name', symbol)}
Sector: {info.get('sector', 'N/A')} | Industry: {info.get('industry', 'N/A')}
Current price: {info.get('currentPrice')} {info.get('currency', 'USD')}
52-week range: {info.get('fiftyTwoWeekLow')} – {info.get('fiftyTwoWeekHigh')}
P/E (trailing): {info.get('trailingPE')} | Beta: {info.get('beta')}
Market cap: {info.get('marketCap')}

Recent price history (last {len(recent)} sessions):
{price_lines}

Recent news:
{news_lines if news_lines else '  No recent news available.'}

Please provide an investment analysis for {symbol.upper()}."""


def _extract_recommendation(text: str) -> str:
    lower = text.lower()
    if "strong buy" in lower:
        return "Strong Buy"
    if "strong sell" in lower:
        return "Strong Sell"
    if "buy" in lower:
        return "Buy"
    if "sell" in lower:
        return "Sell"
    return "Hold"


def _extract_trend(text: str) -> str:
    lower = text.lower()
    if "bullish" in lower:
        return "bullish"
    if "bearish" in lower:
        return "bearish"
    return "neutral"


def _placeholder_analysis(symbol: str, info: dict) -> dict:
    name = info.get("name", symbol)
    price = info.get("currentPrice", "N/A")
    pe = info.get("trailingPE", "N/A")
    beta = info.get("beta", "N/A")
    sector = info.get("sector", "N/A")

    analysis = f"""**{name} ({symbol.upper()}) — Demo Analysis**

> *This is a placeholder analysis. Configure your OPENAI_API_KEY in backend/.env to enable AI-powered insights.*

**Key Metrics**
- Current Price: {price} {info.get('currency', 'USD')}
- P/E Ratio (trailing): {pe}
- Beta: {beta}
- Sector: {sector}

**Trend**
No real-time AI analysis available. Based on available data, the stock appears to be trading normally within its recent range.

**Recommendation: Hold**
Without AI analysis, a neutral *Hold* position is suggested until you configure an LLM API key for a full assessment.
"""
    return {
        "symbol": symbol.upper(),
        "recommendation": "Hold",
        "trend": "neutral",
        "analysis": analysis,
        "model": "placeholder",
    }
