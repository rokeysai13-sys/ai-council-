from core.logger import logger
import sqlite3
import json
import os
import threading
from datetime import datetime
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "conversations.db")

_db_lock = threading.Lock()

@contextmanager
def db_conn():
    with _db_lock:
        conn = sqlite3.connect(DB_PATH, timeout=30.0)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

def get_db():
    # Deprecated: use db_conn context manager instead to prevent locks and leaks.
    # Provided for backward compatibility.
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with db_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                username TEXT DEFAULT 'guest',
                agent TEXT NOT NULL,
                prompt TEXT NOT NULL,
                response TEXT NOT NULL,
                extra TEXT,
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS persistent_memory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS summaries (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                username   TEXT DEFAULT 'guest',
                summary    TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        
        # Run dynamic migrations for existing tables
        try:
            conn.execute("ALTER TABLE conversations ADD COLUMN username TEXT DEFAULT 'guest'")
        except sqlite3.OperationalError:
            pass  # already exists
            
        try:
            conn.execute("ALTER TABLE summaries ADD COLUMN username TEXT DEFAULT 'guest'")
        except sqlite3.OperationalError:
            pass  # already exists
            
        conn.execute("CREATE INDEX IF NOT EXISTS idx_session ON conversations(session_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_pmem ON persistent_memory(username)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_summaries ON summaries(session_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_conv_created_at ON conversations(created_at)")
        conn.commit()
    logger.info(f"  DB ready: {DB_PATH}")

def save_conversation(session_id, agent, prompt, response, extra=None, username="guest"):
    try:
        with db_conn() as conn:
            conn.execute(
                "INSERT INTO conversations (session_id, username, agent, prompt, response, extra, created_at) VALUES (?,?,?,?,?,?,?)",
                (session_id, username, agent, prompt, str(response),
                 json.dumps(extra) if extra else None, datetime.now().isoformat())
            )
            conn.commit()
    except Exception as e:
        logger.error(f"DB save error: {e}")

# ── PERSISTENT MEMORY ──
def save_persistent_memory(username, role, content):
    """Save a message to persistent memory for a user."""
    try:
        with db_conn() as conn:
            conn.execute(
                "INSERT INTO persistent_memory (username, role, content, created_at) VALUES (?,?,?,?)",
                (username, role, content, datetime.now().isoformat())
            )
            # Keep last 40 messages per user
            conn.execute("""
                DELETE FROM persistent_memory WHERE username=? AND id NOT IN (
                    SELECT id FROM persistent_memory WHERE username=? ORDER BY id DESC LIMIT 40
                )
            """, (username, username))
            conn.commit()
    except Exception as e:
        logger.error(f"Memory save error: {e}")

def load_persistent_memory(username, limit=100):
    """Load conversation history for a user from DB."""
    try:
        with db_conn() as conn:
            rows = conn.execute(
                "SELECT role, content FROM persistent_memory WHERE username=? ORDER BY id ASC LIMIT ?",
                (username, limit)
            ).fetchall()
            return [{"role": r["role"], "content": r["content"]} for r in rows]
    except Exception as e:
        logger.error(f"Memory load error: {e}")
        return []

def count_messages(session_id: str) -> int:
    """Count messages in persistent_memory for a given session (username used as key)."""
    try:
        with db_conn() as conn:
            row = conn.execute(
                "SELECT COUNT(*) as c FROM persistent_memory WHERE username=?",
                (session_id,)
            ).fetchone()
            return row["c"] if row else 0
    except Exception as e:
        logger.error(f"count_messages error: {e}")
        return 0

def save_summary(session_id: str, summary: str, username: str = "guest"):
    """Persist an episodic summary to the summaries table."""
    try:
        with db_conn() as conn:
            conn.execute(
                "INSERT INTO summaries (session_id, username, summary, created_at) VALUES (?,?,?,?)",
                (session_id, username, summary, datetime.now().isoformat())
            )
            conn.commit()
    except Exception as e:
        logger.error(f"save_summary error: {e}")

def clear_persistent_memory(username):
    try:
        with db_conn() as conn:
            conn.execute("DELETE FROM persistent_memory WHERE username=?", (username,))
            conn.commit()
    except Exception as e:
        logger.error(f"clear_persistent_memory error: {e}")

# ── CONVERSATIONS ──
def get_all_conversations(limit=100, offset=0, agent=None, username=None):
    try:
        with db_conn() as conn:
            query = "SELECT * FROM conversations WHERE 1=1"
            params = []
            if agent:
                query += " AND agent=?"; params.append(agent)
            if username:
                query += " AND username=?"; params.append(username)
            query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            rows = conn.execute(query, params).fetchall()
            return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"get_all_conversations error: {e}")
        return []

def get_conversation(conv_id):
    try:
        with db_conn() as conn:
            row = conn.execute("SELECT * FROM conversations WHERE id=?", (conv_id,)).fetchone()
            return dict(row) if row else None
    except Exception as e:
        logger.error(f"get_conversation error: {e}")
        return None

def delete_conversation(conv_id):
    try:
        with db_conn() as conn:
            conn.execute("DELETE FROM conversations WHERE id=?", (conv_id,))
            conn.commit()
    except Exception as e:
        logger.error(f"delete_conversation error: {e}")

def search_conversations(query, username=None):
    try:
        with db_conn() as conn:
            if username:
                rows = conn.execute(
                    "SELECT * FROM conversations WHERE username=? AND (prompt LIKE ? OR response LIKE ?) ORDER BY created_at DESC LIMIT 50",
                    (username, f"%{query}%", f"%{query}%")
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM conversations WHERE prompt LIKE ? OR response LIKE ? ORDER BY created_at DESC LIMIT 50",
                    (f"%{query}%", f"%{query}%")
                ).fetchall()
            return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"search_conversations error: {e}")
        return []

def get_stats(username=None):
    try:
        with db_conn() as conn:
            if username:
                total = conn.execute("SELECT COUNT(*) as c FROM conversations WHERE username=?", (username,)).fetchone()["c"]
                by_agent = conn.execute("SELECT agent, COUNT(*) as c FROM conversations WHERE username=? GROUP BY agent", (username,)).fetchall()
            else:
                total = conn.execute("SELECT COUNT(*) as c FROM conversations").fetchone()["c"]
                by_agent = conn.execute("SELECT agent, COUNT(*) as c FROM conversations GROUP BY agent").fetchall()
            return {"total": total, "by_agent": {r["agent"]: r["c"] for r in by_agent}}
    except Exception as e:
        logger.error(f"get_stats error: {e}")
        return {"total": 0, "by_agent": {}}