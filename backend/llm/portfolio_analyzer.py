"""
backend/llm/portfolio_analyzer.py

Sends portfolio data, current prices and recent news to Gemini and returns
a structured JSON investment analysis for the full portfolio.
"""

from __future__ import annotations

import json
import logging
import os
import re

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

_SYSTEM_PROMPT = """Bu bir yatırım analiz asistanı. 
Kısa ve net karar üret.
Her varlık için:
- Kısa vade: AL/EKLE/TUT/AZALT/SAT/İZLE
- Orta vade: AL/EKLE/TUT/AZALT/SAT/İZLE
- Alım bölgesi, hedef, stop fiyatı
- Max 2 cümle gerekçe
- Risk ve güven seviyesi
- Kararı değiştirecek koşul

Portföy uyarıları:
- Stop seviyesine yaklaşan varlıklar
- Hedefe ulaşan varlıklar
- Dikkat edilmesi gerekenler

Kısa, net, karar odaklı konuş.
Bu içerik bilgilendirme amaçlıdır, yatırım tavsiyesi değildir."""

_JSON_SCHEMA = """{
  "market_summary": "...",
  "recommendations": [
    {
      "symbol": "...",
      "short_term": "AL|EKLE|TUT|AZALT|SAT|İZLE",
      "mid_term": "AL|EKLE|TUT|AZALT|SAT|İZLE",
      "buy_zone": "...",
      "target": "...",
      "stop": "...",
      "rationale": "...",
      "risk_level": "DÜŞÜK|ORTA|YÜKSEK",
      "confidence": "DÜŞÜK|ORTA|YÜKSEK",
      "trigger": "..."
    }
  ],
  "portfolio_alerts": [
    {
      "symbol": "...",
      "alert_type": "STOP_YAKLAŞIYOR|HEDEFE_ULAŞTI|DİKKAT",
      "message": "..."
    }
  ],
  "daily_actions": {
    "urgent": [...],
    "watch": [...],
    "hold": [...]
  }
}"""


def analyze_portfolio(
    portfolio: list[dict],
    prices: list[dict],
    news: list[dict],
) -> dict:
    """
    Call the Gemini API with portfolio, live prices and news and return a
    structured analysis dict.

    Returns a placeholder dict when GEMINI_API_KEY is not configured.
    """
    if not _GEMINI_API_KEY or _GEMINI_API_KEY == "your_gemini_api_key_here":
        return _placeholder_analysis(portfolio)

    try:
        import google.generativeai as genai  # type: ignore

        genai.configure(api_key=_GEMINI_API_KEY)
        model = genai.GenerativeModel(
            model_name=_GEMINI_MODEL,
            system_instruction=_SYSTEM_PROMPT,
        )

        user_prompt = _build_prompt(portfolio, prices, news)
        response = model.generate_content(
            user_prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.4,
                max_output_tokens=2048,
            ),
        )
        raw = response.text.strip()
        return _parse_response(raw)
    except Exception:
        logger.exception("Gemini portfolio analysis failed")
        return {
            "market_summary": "Analiz şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
            "recommendations": [],
            "portfolio_alerts": [],
            "daily_actions": {"urgent": [], "watch": [], "hold": []},
        }


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


def _build_prompt(
    portfolio: list[dict],
    prices: list[dict],
    news: list[dict],
) -> str:
    prices_by_symbol = {p["symbol"].upper(): p for p in prices}

    portfolio_lines = []
    for item in portfolio:
        sym = item["symbol"].upper()
        price_data = prices_by_symbol.get(sym, {})
        current_price = price_data.get("current_price", "N/A")
        pnl_pct = price_data.get("pnl_pct", "N/A")
        portfolio_lines.append(
            f"  - {sym} ({item.get('type', 'US')}): "
            f"adet={item.get('quantity')}, "
            f"ort.maliyet={item.get('avg_cost')}, "
            f"güncel fiyat={current_price}, "
            f"P&L%={pnl_pct}"
        )

    news_lines = []
    for i, article in enumerate(news, 1):
        news_lines.append(f"  {i}. [{article.get('source', '')}] {article.get('title', '')}")

    prompt = "Portföy:\n"
    prompt += "\n".join(portfolio_lines) if portfolio_lines else "  (boş portföy)"
    prompt += "\n\nSon Haberler:\n"
    prompt += "\n".join(news_lines) if news_lines else "  (haber yok)"
    prompt += f"\n\nYanıtını YALNIZCA aşağıdaki JSON formatında ver, başka hiçbir şey ekleme:\n{_JSON_SCHEMA}"
    return prompt


def _parse_response(raw: str) -> dict:
    """Extract JSON from the model response."""
    # Strip markdown code fences if present
    text = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("```").strip()

    # Find the outermost JSON object
    start = text.find("{")
    end = text.rfind("}") + 1
    if start != -1 and end > start:
        text = text[start:end]

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.warning("Could not parse Gemini response as JSON; returning raw text")
        return {
            "market_summary": raw,
            "recommendations": [],
            "portfolio_alerts": [],
            "daily_actions": {"urgent": [], "watch": [], "hold": []},
        }


def _placeholder_analysis(portfolio: list[dict]) -> dict:
    symbols = [item["symbol"].upper() for item in portfolio]
    return {
        "market_summary": (
            "Demo analiz — Gemini API anahtarı yapılandırılmamış. "
            "backend/.env dosyasına GEMINI_API_KEY ekleyin."
        ),
        "recommendations": [
            {
                "symbol": sym,
                "short_term": "İZLE",
                "mid_term": "TUT",
                "buy_zone": "N/A",
                "target": "N/A",
                "stop": "N/A",
                "rationale": "API anahtarı eksik, gerçek analiz yapılamıyor.",
                "risk_level": "ORTA",
                "confidence": "DÜŞÜK",
                "trigger": "GEMINI_API_KEY yapılandırıldığında gerçek analiz alınabilir.",
            }
            for sym in symbols
        ],
        "portfolio_alerts": [],
        "daily_actions": {"urgent": [], "watch": symbols, "hold": []},
    }
