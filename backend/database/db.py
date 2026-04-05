"""
backend/database/db.py

SQLite database setup and connection helpers using aiosqlite.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import aiosqlite

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "jai_trader.db")


async def init_db() -> None:
    """Create tables if they do not exist."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS portfolio (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol     TEXT    NOT NULL,
                type       TEXT    NOT NULL CHECK(type IN ('BIST','CRYPTO','US')),
                quantity   REAL    NOT NULL,
                avg_cost   REAL    NOT NULL,
                date_added TEXT    NOT NULL DEFAULT (date('now'))
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS watchlist (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol       TEXT    NOT NULL UNIQUE,
                target_price REAL,
                stop_price   REAL,
                notes        TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol   TEXT    NOT NULL,
                type     TEXT    NOT NULL CHECK(type IN ('BUY','SELL')),
                quantity REAL    NOT NULL,
                price    REAL    NOT NULL,
                date     TEXT    NOT NULL DEFAULT (datetime('now'))
            )
        """)
        await db.commit()


@asynccontextmanager
async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    """Async context manager that yields an open database connection."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db
