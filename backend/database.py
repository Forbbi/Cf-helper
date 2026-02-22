import sqlite3
from typing import List, Optional
from datetime import datetime
from models import Bookmark, BookmarkCreate
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "cf_tracker.db")


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS bookmarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contest_id INTEGER,
            idx TEXT NOT NULL,
            name TEXT NOT NULL,
            rating INTEGER,
            tags TEXT DEFAULT '[]',
            url TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.commit()
    conn.close()


def _row_to_bookmark(row) -> Bookmark:
    return Bookmark(
        id=row[0],
        contest_id=row[1],
        index=row[2],
        name=row[3],
        rating=row[4],
        tags=json.loads(row[5] or "[]"),
        url=row[6],
        created_at=datetime.fromisoformat(row[7]),
    )


def get_bookmarks() -> List[Bookmark]:
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT id, contest_id, idx, name, rating, tags, url, created_at FROM bookmarks ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return [_row_to_bookmark(r) for r in rows]


def get_bookmarked_ids() -> set:
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute("SELECT contest_id, idx FROM bookmarks").fetchall()
    conn.close()
    return {(r[0], r[1]) for r in rows}


def add_bookmark(bm: BookmarkCreate) -> Bookmark:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.execute(
        """INSERT INTO bookmarks (contest_id, idx, name, rating, tags, url)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (bm.contest_id, bm.index, bm.name, bm.rating, json.dumps(bm.tags), bm.url),
    )
    conn.commit()
    row = conn.execute(
        "SELECT id, contest_id, idx, name, rating, tags, url, created_at FROM bookmarks WHERE id = ?",
        (cur.lastrowid,),
    ).fetchone()
    conn.close()
    return _row_to_bookmark(row)


def remove_bookmark(contest_id: Optional[int], index: str) -> bool:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.execute(
        "DELETE FROM bookmarks WHERE contest_id = ? AND idx = ?",
        (contest_id, index),
    )
    conn.commit()
    conn.close()
    return cur.rowcount > 0
