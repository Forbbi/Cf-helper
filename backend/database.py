import sqlite3
from typing import List, Optional
from datetime import datetime
from models import Bookmark, BookmarkCreate, User, UserCreate
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "cf_tracker.db")

def _get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            google_id TEXT UNIQUE NOT NULL,
            email TEXT NOT NULL,
            name TEXT NOT NULL,
            picture TEXT,
            cf_handle TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS bookmarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            contest_id INTEGER,
            idx TEXT NOT NULL,
            name TEXT NOT NULL,
            rating INTEGER,
            tags TEXT DEFAULT '[]',
            url TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmark_user_problem ON bookmarks(user_id, contest_id, idx)")
    conn.commit()
    conn.close()

# --- User operations ---

def _row_to_user(row) -> User:
    return User(
        id=row['id'],
        google_id=row['google_id'],
        email=row['email'],
        name=row['name'],
        picture=row['picture'],
        cf_handle=row['cf_handle'],
        created_at=datetime.fromisoformat(row['created_at'].replace('Z', '+00:00')) if row['created_at'] else datetime.utcnow()
    )

def get_user_by_google_id(google_id: str) -> Optional[User]:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM users WHERE google_id = ?", (google_id,)).fetchone()
    conn.close()
    if row:
        return _row_to_user(row)
    return None

def get_user_by_id(user_id: int) -> Optional[User]:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    if row:
        return _row_to_user(row)
    return None

def create_user(user: UserCreate) -> User:
    conn = _get_conn()
    cur = conn.execute(
        """INSERT INTO users (google_id, email, name, picture, cf_handle)
           VALUES (?, ?, ?, ?, ?)""",
        (user.google_id, user.email, user.name, user.picture, user.cf_handle)
    )
    conn.commit()
    inserted_id = cur.lastrowid
    conn.close()
    return get_user_by_id(inserted_id)

def update_user_handle(user_id: int, handle: str) -> Optional[User]:
    conn = _get_conn()
    conn.execute("UPDATE users SET cf_handle = ? WHERE id = ?", (handle, user_id))
    conn.commit()
    conn.close()
    return get_user_by_id(user_id)

# --- Bookmark operations ---

def _row_to_bookmark(row) -> Bookmark:
    return Bookmark(
        id=row['id'],
        user_id=row['user_id'],
        contest_id=row['contest_id'],
        index=row['idx'],
        name=row['name'],
        rating=row['rating'],
        tags=json.loads(row['tags'] or "[]"),
        url=row['url'],
        created_at=datetime.fromisoformat(row['created_at'].replace('Z', '+00:00')) if row['created_at'] else datetime.utcnow(),
    )

def get_bookmarks(user_id: int) -> List[Bookmark]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,)
    ).fetchall()
    conn.close()
    return [_row_to_bookmark(r) for r in rows]

def get_bookmarked_ids(user_id: int) -> set:
    conn = _get_conn()
    rows = conn.execute("SELECT contest_id, idx FROM bookmarks WHERE user_id = ?", (user_id,)).fetchall()
    conn.close()
    return {(r['contest_id'], r['idx']) for r in rows}

def add_bookmark(user_id: int, bm: BookmarkCreate) -> Bookmark:
    conn = _get_conn()
    try:
        cur = conn.execute(
            """INSERT INTO bookmarks (user_id, contest_id, idx, name, rating, tags, url)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (user_id, bm.contest_id, bm.index, bm.name, bm.rating, json.dumps(bm.tags), bm.url),
        )
        conn.commit()
        inserted_id = cur.lastrowid
    except sqlite3.IntegrityError:
        # Already bookmarked
        row = conn.execute("SELECT * FROM bookmarks WHERE user_id = ? AND contest_id = ? AND idx = ?", (user_id, bm.contest_id, bm.index)).fetchone()
        inserted_id = row['id']
    
    conn.close()
    conn2 = _get_conn()
    row = conn2.execute("SELECT * FROM bookmarks WHERE id = ?", (inserted_id,)).fetchone()
    conn2.close()
    return _row_to_bookmark(row)

def remove_bookmark(user_id: int, contest_id: Optional[int], index: str) -> bool:
    conn = _get_conn()
    cur = conn.execute(
        "DELETE FROM bookmarks WHERE user_id = ? AND contest_id = ? AND idx = ?",
        (user_id, contest_id, index),
    )
    conn.commit()
    conn.close()
    return cur.rowcount > 0
