from core.logger import logger
import sqlite3
import hashlib
import secrets
import os
from datetime import datetime, timedelta
from database import db_conn

try:
    import bcrypt
    HAS_BCRYPT = True
except ImportError:
    HAS_BCRYPT = False

# In-memory session cache: token -> (session_info, expires_at)
_session_cache = {}

def hash_password(password: str) -> tuple[str, str]:
    """
    Hash a password. Returns (hashed_password, salt).
    If bcrypt is available, returns (bcrypt_hash, "").
    If bcrypt is not available, returns (salted_sha256_hash, salt).
    """
    if HAS_BCRYPT:
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8'), ""
    else:
        salt = secrets.token_hex(16)
        hashed = hashlib.sha256((password + salt).encode('utf-8')).hexdigest()
        return hashed, salt

def verify_password(password: str, password_hash: str, salt: str) -> bool:
    """
    Verify a password against its hash and salt.
    Handles both bcrypt and salted SHA-256 fallback schemes.
    """
    if HAS_BCRYPT and not salt:
        try:
            return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
        except Exception:
            pass
    # Fallback to salted/unsalted SHA-256 verification
    hashed = hashlib.sha256((password + salt).encode('utf-8')).hexdigest()
    return password_hash == hashed

def init_auth():
    with db_conn() as conn:
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
            default_pass = os.getenv("DEFAULT_PASSWORD")
            is_random = False
            if not default_pass:
                default_pass = secrets.token_urlsafe(12)
                is_random = True
            
            # Use lower-level create_user logic with the connection
            hashed, salt = hash_password(default_pass)
            conn.execute(
                "INSERT INTO users (username, password_hash, salt, created_at) VALUES (?,?,?,?)",
                (default_user.lower(), hashed, salt, datetime.now().isoformat())
            )
            conn.commit()
            
            if is_random:
                logger.warning(f"  [SECURITY] Created default admin user: '{default_user}' with RANDOM password: '{default_pass}'")
                logger.warning("             Please save this password or configure DEFAULT_PASSWORD in your .env file!")
            else:
                logger.info(f"  Default user created: '{default_user}' (password from env)")
                
        # Clean up any expired sessions on startup
        try:
            conn.execute("DELETE FROM sessions WHERE expires_at < ?", (datetime.now().isoformat(),))
            conn.commit()
        except Exception as e:
            logger.warning(f"Failed to clean up expired sessions: {e}")

def create_user(username, password):
    try:
        with db_conn() as conn:
            hashed, salt = hash_password(password)
            conn.execute(
                "INSERT INTO users (username, password_hash, salt, created_at) VALUES (?,?,?,?)",
                (username.lower(), hashed, salt, datetime.now().isoformat())
            )
            conn.commit()
            return True
    except sqlite3.IntegrityError:
        return False
    except Exception as e:
        logger.error(f"create_user error: {e}")
        return False

def login(username, password):
    try:
        with db_conn() as conn:
            user = conn.execute(
                "SELECT * FROM users WHERE username=?",
                (username.lower(),)
            ).fetchone()
            if not user:
                return None
            
            salt = user["salt"] if "salt" in user.keys() else ""
            if not verify_password(password, user["password_hash"], salt):
                return None
                
            # Create session token
            token = secrets.token_urlsafe(32)
            expires_at = datetime.now() + timedelta(days=7)
            expires = expires_at.isoformat()
            conn.execute(
                "INSERT INTO sessions (token, user_id, username, expires_at) VALUES (?,?,?,?)",
                (token, user["id"], user["username"], expires)
            )
            conn.commit()
            
            # Cache the token
            info = {"username": user["username"], "user_id": user["id"]}
            _session_cache[token] = (info, expires_at)
            
            return {"token": token, "username": user["username"]}
    except Exception as e:
        logger.error(f"login error: {e}")
        return None

def verify_token(token):
    if not token:
        return None
        
    # Check in-memory cache first
    now = datetime.now()
    if token in _session_cache:
        info, expires_at = _session_cache[token]
        if expires_at > now:
            return info
        else:
            del _session_cache[token]
            logout(token)
            return None

    # Fall back to DB query
    try:
        with db_conn() as conn:
            session = conn.execute(
                "SELECT * FROM sessions WHERE token=?", (token,)
            ).fetchone()
            if not session:
                return None
                
            expires_at = datetime.fromisoformat(session["expires_at"])
            if expires_at < now:
                # Expired token, delete from DB
                conn.execute("DELETE FROM sessions WHERE token=?", (token,))
                conn.commit()
                return None
                
            info = {"username": session["username"], "user_id": session["user_id"]}
            # Cache it
            _session_cache[token] = (info, expires_at)
            return info
    except Exception as e:
        logger.error(f"verify_token error: {e}")
        return None

def logout(token):
    # Remove from cache
    _session_cache.pop(token, None)
    # Remove from DB
    try:
        with db_conn() as conn:
            conn.execute("DELETE FROM sessions WHERE token=?", (token,))
            conn.commit()
    except Exception as e:
        logger.error(f"logout error: {e}")

def get_all_users():
    try:
        with db_conn() as conn:
            users = conn.execute("SELECT id, username, created_at FROM users").fetchall()
            return [dict(u) for u in users]
    except Exception as e:
        logger.error(f"get_all_users error: {e}")
        return []

def delete_user(username):
    try:
        with db_conn() as conn:
            conn.execute("DELETE FROM users WHERE username=?", (username.lower(),))
            conn.commit()
    except Exception as e:
        logger.error(f"delete_user error: {e}")