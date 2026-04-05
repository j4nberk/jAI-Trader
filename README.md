# jAI-Trader

An investment analysis desktop application built with **Electron + React (Vite)** for the frontend and **Python FastAPI** for the backend.

---

## Features

- 📊 **Dashboard** — Live watchlist of popular stocks with real-time price data
- 🔍 **Stock Analysis** — Deep-dive page with interactive price chart, key metrics, and AI-generated investment insights
- 📰 **News** — Latest headlines per ticker via Yahoo Finance RSS
- 🤖 **AI Analysis** — Optional LLM-powered analysis (requires OpenAI API key)

---

## Project Structure

```
jAI-Trader/
├── frontend/              # Electron + React + Vite
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js        # Axios API client
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   └── StockChart.jsx   # Recharts price chart
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── StockAnalysis.jsx
│   │   │   └── News.jsx
│   │   ├── App.jsx
│   │   ├── index.css            # Tailwind CSS
│   │   └── main.jsx
│   ├── electron.js              # Electron main process
│   ├── preload.js               # Electron context bridge
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
└── backend/               # Python FastAPI
    ├── data/
    │   └── stock_data.py        # yfinance + feedparser helpers
    ├── llm/
    │   └── analyzer.py          # OpenAI-compatible LLM analysis
    ├── main.py                  # FastAPI app & routes
    ├── requirements.txt
    └── .env.example
```

---

## Getting Started

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# (Optional) configure LLM API key
cp .env.example .env
# edit .env and set OPENAI_API_KEY=...

python main.py
# API available at http://127.0.0.1:8000
# Interactive docs at http://127.0.0.1:8000/docs
```

### 2. Frontend (development)

```bash
cd frontend
npm install

# Web-only dev server
npm run dev

# Electron + Vite concurrently
npm run electron:dev
```

### 3. Frontend (production build)

```bash
cd frontend
npm run electron:build
# Installer output in frontend/dist-electron/
```

---

## Backend API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/stock/{symbol}` | Company info & current price |
| GET | `/api/stock/{symbol}/history` | OHLCV price history |
| GET | `/api/stock/{symbol}/news` | Recent news articles |
| GET | `/api/stock/{symbol}/analyze` | AI investment analysis |
| GET | `/api/search?q=query` | Ticker search |

---

## Dependencies

### Frontend
- **electron** — Desktop shell
- **react** + **react-dom** — UI framework
- **vite** + **@vitejs/plugin-react** — Build tool
- **react-router-dom** — Client-side routing
- **axios** — HTTP client
- **recharts** — Interactive charts
- **tailwindcss** — Utility-first CSS

### Backend
- **fastapi** — Web framework
- **uvicorn** — ASGI server
- **yfinance** — Yahoo Finance data
- **requests** — HTTP client
- **feedparser** — RSS/Atom news feed parser
- **python-dotenv** — `.env` file support
- **httpx** — Async HTTP client for LLM API calls
