"""
backend/llm/analyzer.py

Sends stock data + news to Gemini and returns a structured JSON
investment analysis.  Works without an API key by returning a
placeholder analysis.
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
_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

_SYSTEM_PROMPT = """Sen bir kısa ve orta vadeli yatırım analiz asistanısın.
Kısa ve net karar üret, gereksiz laf kalabalığı yapma.

Her varlık için şu formatı kullan:
- Kısa vade (2 hafta - 1 ay): AL/EKLE/TUT/AZALT/SAT/İZLE
- Orta vade (6 ay - 1 yıl): AL/EKLE/TUT/AZALT/SAT/İZLE
- Alım bölgesi, hedef fiyat, stop-loss
- Max 2 cümle gerekçe
- Risk seviyesi: Düşük/Orta/Yüksek
- Güven seviyesi: Düşük/Orta/Yüksek
- Kararı değiştirecek koşul

Portföy uyarıları:
- Stop seviyesine %5 yaklaşan varlıklar → UYARI
- Hedefe %5 yaklaşan varlıklar → BİLDİRİM
- Yüksek hacimle sert düşen varlıklar → DİKKAT

Bu içerik bilgilendirme amaçlıdır, 
yatırım tavsiyesi değildir."""

_JSON_SCHEMA = """{
  "summary": "...",
  "recommendations": [
    {
      "symbol": "EREGL",
      "short_term": "AL",
      "long_term": "TUT",
      "buy_zone": "28.5-29.2",
      "target": "31.0",
      "stop": "27.0",
      "rationale": "...",
      "risk": "Orta",
      "confidence": "Orta",
      "trigger": "..."
    }
  ],
  "portfolio_alerts": [
    {
      "symbol": "...",
      "alert_type": "STOP_YAKLAŞIYOR",
      "message": "..."
    }
  ],
  "daily_actions": {
    "buy": [],
    "add": [],
    "watch": [],
    "avoid": []
  }
}"""


def analyze(symbol: str, stock_info: dict, history: list[dict], news: list[dict]) -> dict:
    """
    Call the Gemini API and return a structured analysis dict.

    Returns
    -------
    dict with keys: summary, recommendations, portfolio_alerts, daily_actions
    """
    if not _GEMINI_API_KEY or _GEMINI_API_KEY == "your_gemini_api_key_here":
        return _placeholder_analysis(symbol, stock_info)

    user_content = _build_user_prompt(symbol, stock_info, history, news)

    try:
        import google.generativeai as genai  # type: ignore

        genai.configure(api_key=_GEMINI_API_KEY)
        model = genai.GenerativeModel(
            model_name=_GEMINI_MODEL,
            system_instruction=_SYSTEM_PROMPT,
        )
        response = model.generate_content(
            user_content,
            generation_config=genai.GenerationConfig(
                temperature=0.4,
                max_output_tokens=1024,
            ),
        )
        raw = response.text.strip()
        return _parse_response(raw)
    except Exception:
        logger.exception("Gemini stock analysis failed for %s", symbol)
        return {
            "summary": f"{symbol.upper()} analizi şu anda kullanılamıyor.",
            "recommendations": [],
            "portfolio_alerts": [],
            "daily_actions": {"buy": [], "add": [], "watch": [], "avoid": []},
        }


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


def _build_user_prompt(
    symbol: str, info: dict, history: list[dict], news: list[dict]
) -> str:
    recent = history[-10:] if len(history) >= 10 else history
    price_lines = "\n".join(
        f"  {r['date']}: kapanış={r['close']}, hacim={r['volume']}" for r in recent
    )

    news_lines = ""
    for i, article in enumerate(news[:5], 1):
        news_lines += f"  {i}. {article['title']} ({article['source']})\n"
        if article.get("summary"):
            news_lines += f"     {article['summary'][:200]}\n"

    return (
        f"Hisse: {symbol.upper()} — {info.get('name', symbol)}\n"
        f"Sektör: {info.get('sector', 'N/A')} | Endüstri: {info.get('industry', 'N/A')}\n"
        f"Güncel fiyat: {info.get('currentPrice')} {info.get('currency', 'TRY')}\n"
        f"52 haftalık aralık: {info.get('fiftyTwoWeekLow')} – {info.get('fiftyTwoWeekHigh')}\n"
        f"F/K (trailing): {info.get('trailingPE')} | Beta: {info.get('beta')}\n"
        f"Piyasa değeri: {info.get('marketCap')}\n\n"
        f"Son {len(recent)} seans fiyat geçmişi:\n{price_lines}\n\n"
        f"Son haberler:\n{news_lines if news_lines else '  Güncel haber bulunamadı.'}\n\n"
        f"Yanıtını YALNIZCA aşağıdaki JSON formatında ver, başka hiçbir şey ekleme:\n{_JSON_SCHEMA}"
    )


def _parse_response(raw: str) -> dict:
    """Extract JSON from the model response."""
    text = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("```").strip()

    start = text.find("{")
    end = text.rfind("}") + 1
    if start != -1 and end > start:
        text = text[start:end]

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.warning("Could not parse Gemini response as JSON; returning raw text")
        return {
            "summary": raw,
            "recommendations": [],
            "portfolio_alerts": [],
            "daily_actions": {"buy": [], "add": [], "watch": [], "avoid": []},
        }


def _placeholder_analysis(symbol: str, info: dict) -> dict:
    sym = symbol.upper()
    return {
        "summary": (
            f"Demo analiz — Gemini API anahtarı yapılandırılmamış. "
            f"backend/.env dosyasına GEMINI_API_KEY ekleyin."
        ),
        "recommendations": [
            {
                "symbol": sym,
                "short_term": "İZLE",
                "long_term": "TUT",
                "buy_zone": "N/A",
                "target": "N/A",
                "stop": "N/A",
                "rationale": "API anahtarı eksik, gerçek analiz yapılamıyor.",
                "risk": "Orta",
                "confidence": "Düşük",
                "trigger": "GEMINI_API_KEY yapılandırıldığında gerçek analiz alınabilir.",
            }
        ],
        "portfolio_alerts": [],
        "daily_actions": {"buy": [], "add": [], "watch": [sym], "avoid": []},
    }
