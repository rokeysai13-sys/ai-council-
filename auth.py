from core.logger import logger
import sqlite3
import hashlib
import secrets
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "conversations.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password, salt=None):
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.sha256((password + salt).encode('utf-8')).hexdigest()
    return hashed, salt

def init_auth():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            expires_at TEXT NOT NULL
        )
    """)
    conn.commit()
    
    # Dynamic schema update: ensure 'salt' column exists
    try:
        cursor = conn.execute("PRAGMA table_info(users)")
        cols = [r["name"] for r in cursor.fetchall()]
        if "salt" not in cols:
            conn.execute("ALTER TABLE users ADD COLUMN salt TEXT NOT NULL DEFAULT ''")
            conn.commit()
    except Exception as e:
        logger.warning(f"Failed to migrate auth tables: {e}")

    # Create default admin user if no users exist
    count = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
    if count == 0:
        default_user = os.getenv("DEFAULT_USER", "kiran")
        default_pass = os.getenv("DEFAULT_PASSWORD", "kiran123")
        create_user(default_user, default_pass)
        logger.info(f"  Default user created: {default_user} / [password hidden]")
    conn.close()

def create_user(username, password):
    conn = get_db()
    try:
        hashed, salt = hash_password(password)
        conn.execute(
            "INSERT INTO users (username, password_hash, salt, created_at) VALUES (?,?,?,?)",
            (username.lower(), hashed, salt, datetime.now().isoformat())
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def login(username, password):
    conn = get_db()
    user = conn.execute(
        "SELECT * FROM users WHERE username=?",
        (username.lower(),)
    ).fetchone()
    if not user:
        conn.close()
        return None
    
    salt = user["salt"] if "salt" in user.keys() else ""
    hashed, _ = hash_password(password, salt)
    if user["password_hash"] != hashed:
        conn.close()
        return None
        
    # Create session token
    token = secrets.token_urlsafe(32)
    expires = (datetime.now() + timedelta(days=7)).isoformat()
    conn.execute(
        "INSERT INTO sessions (token, user_id, username, expires_at) VALUES (?,?,?,?)",
        (token, user["id"], user["username"], expires)
    )
    conn.commit()
    conn.close()
    return {"token": token, "username": user["username"]}

def verify_token(token):
    if not token:
        return None
    conn = get_db()
    session = conn.execute(
        "SELECT * FROM sessions WHERE token=?", (token,)
    ).fetchone()
    conn.close()
    if not session:
        return None
    if datetime.fromisoformat(session["expires_at"]) < datetime.now():
        return None
    return {"username": session["username"], "user_id": session["user_id"]}

def logout(token):
    conn = get_db()
    conn.execute("DELETE FROM sessions WHERE token=?", (token,))
    conn.commit()
    conn.close()

def get_all_users():
    conn = get_db()
    users = conn.execute("SELECT id, username, created_at FROM users").fetchall()
    conn.close()
    return [dict(u) for u in users]

def delete_user(username):
    conn = get_db()
    conn.execute("DELETE FROM users WHERE username=?", (username,))
    conn.commit()
    conn.close()