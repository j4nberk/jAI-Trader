"""
backend/data/portfolio.py

Async data-access helpers for portfolio, watchlist, and transaction tables.
All functions accept an open aiosqlite connection so callers control the
transaction boundary (via database.db.get_db).
"""

from __future__ import annotations

from typing import Optional

import aiosqlite

# Whitelisted column names for UPDATE statements.  Only these exact strings
# can ever appear in a SET clause — no user-supplied value reaches the SQL
# template itself; values are still passed as bound parameters.
_PORTFOLIO_ALLOWED_FIELDS: frozenset[str] = frozenset(
    {"symbol", "type", "quantity", "avg_cost", "date_added"}
)
_WATCHLIST_ALLOWED_FIELDS: frozenset[str] = frozenset(
    {"target_price", "stop_price", "notes"}
)


# ---------------------------------------------------------------------------
# Portfolio CRUD
# ---------------------------------------------------------------------------


async def db_list_portfolio(db: aiosqlite.Connection) -> list[dict]:
    """Return all portfolio positions ordered by newest first."""
    cursor = await db.execute("SELECT * FROM portfolio ORDER BY id DESC")
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]


async def db_get_portfolio_item(db: aiosqlite.Connection, item_id: int) -> Optional[dict]:
    """Return a single portfolio position by primary key, or None."""
    row = await (
        await db.execute("SELECT * FROM portfolio WHERE id=?", (item_id,))
    ).fetchone()
    return dict(row) if row else None


async def db_add_portfolio_item(
    db: aiosqlite.Connection,
    symbol: str,
    asset_type: str,
    quantity: float,
    avg_cost: float,
    date_added: Optional[str] = None,
) -> dict:
    """Insert a new portfolio position and return the created row."""
    if date_added:
        cursor = await db.execute(
            "INSERT INTO portfolio (symbol, type, quantity, avg_cost, date_added)"
            " VALUES (?,?,?,?,?)",
            (symbol.upper(), asset_type, quantity, avg_cost, date_added),
        )
    else:
        cursor = await db.execute(
            "INSERT INTO portfolio (symbol, type, quantity, avg_cost) VALUES (?,?,?,?)",
            (symbol.upper(), asset_type, quantity, avg_cost),
        )
    await db.commit()
    row = await (
        await db.execute("SELECT * FROM portfolio WHERE id=?", (cursor.lastrowid,))
    ).fetchone()
    return dict(row)


async def db_update_portfolio_item(
    db: aiosqlite.Connection,
    item_id: int,
    fields: dict,
) -> dict:
    """
    Update whitelisted columns for a portfolio position.

    *fields* should only contain keys from _PORTFOLIO_ALLOWED_FIELDS with
    non-None values.  Returns the updated row.
    """
    safe_fields = {
        k: v for k, v in fields.items() if k in _PORTFOLIO_ALLOWED_FIELDS and v is not None
    }
    if safe_fields:
        set_clause = ", ".join(f"{k}=?" for k in safe_fields)
        values = list(safe_fields.values()) + [item_id]
        await db.execute(f"UPDATE portfolio SET {set_clause} WHERE id=?", values)
        await db.commit()
    return await db_get_portfolio_item(db, item_id)


async def db_delete_portfolio_item(db: aiosqlite.Connection, item_id: int) -> None:
    """Delete a portfolio position by primary key."""
    await db.execute("DELETE FROM portfolio WHERE id=?", (item_id,))
    await db.commit()


# ---------------------------------------------------------------------------
# Watchlist CRUD
# ---------------------------------------------------------------------------


async def db_list_watchlist(db: aiosqlite.Connection) -> list[dict]:
    """Return all watchlist entries ordered by newest first."""
    cursor = await db.execute("SELECT * FROM watchlist ORDER BY id DESC")
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]


async def db_get_watchlist_item(db: aiosqlite.Connection, item_id: int) -> Optional[dict]:
    """Return a single watchlist entry by primary key, or None."""
    row = await (
        await db.execute("SELECT * FROM watchlist WHERE id=?", (item_id,))
    ).fetchone()
    return dict(row) if row else None


async def db_add_watchlist_item(
    db: aiosqlite.Connection,
    symbol: str,
    target_price: Optional[float] = None,
    stop_price: Optional[float] = None,
    notes: Optional[str] = None,
) -> dict:
    """Insert a watchlist entry and return the created row."""
    cursor = await db.execute(
        "INSERT INTO watchlist (symbol, target_price, stop_price, notes) VALUES (?,?,?,?)",
        (symbol.upper(), target_price, stop_price, notes),
    )
    await db.commit()
    row = await (
        await db.execute("SELECT * FROM watchlist WHERE id=?", (cursor.lastrowid,))
    ).fetchone()
    return dict(row)


async def db_update_watchlist_item(
    db: aiosqlite.Connection,
    item_id: int,
    fields: dict,
) -> dict:
    """
    Update whitelisted columns for a watchlist entry.

    *fields* should only contain keys from _WATCHLIST_ALLOWED_FIELDS with
    non-None values.  Returns the updated row.
    """
    safe_fields = {
        k: v for k, v in fields.items() if k in _WATCHLIST_ALLOWED_FIELDS and v is not None
    }
    if safe_fields:
        set_clause = ", ".join(f"{k}=?" for k in safe_fields)
        values = list(safe_fields.values()) + [item_id]
        await db.execute(f"UPDATE watchlist SET {set_clause} WHERE id=?", values)
        await db.commit()
    return await db_get_watchlist_item(db, item_id)


async def db_delete_watchlist_item(db: aiosqlite.Connection, item_id: int) -> None:
    """Delete a watchlist entry by primary key."""
    await db.execute("DELETE FROM watchlist WHERE id=?", (item_id,))
    await db.commit()


# ---------------------------------------------------------------------------
# Transactions CRUD
# ---------------------------------------------------------------------------


async def db_list_transactions(db: aiosqlite.Connection) -> list[dict]:
    """Return all transaction records ordered by newest first."""
    cursor = await db.execute("SELECT * FROM transactions ORDER BY id DESC")
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]


async def db_add_transaction(
    db: aiosqlite.Connection,
    symbol: str,
    tx_type: str,
    quantity: float,
    price: float,
    date: Optional[str] = None,
) -> dict:
    """Insert a transaction record and return the created row."""
    if date:
        cursor = await db.execute(
            "INSERT INTO transactions (symbol, type, quantity, price, date)"
            " VALUES (?,?,?,?,?)",
            (symbol.upper(), tx_type, quantity, price, date),
        )
    else:
        cursor = await db.execute(
            "INSERT INTO transactions (symbol, type, quantity, price) VALUES (?,?,?,?)",
            (symbol.upper(), tx_type, quantity, price),
        )
    await db.commit()
    row = await (
        await db.execute("SELECT * FROM transactions WHERE id=?", (cursor.lastrowid,))
    ).fetchone()
    return dict(row)
