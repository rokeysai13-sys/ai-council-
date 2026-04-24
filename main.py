"""
main.py — kirannn single launcher
Starts: FastAPI + Telegram bot + Discord bot
"""
import os, sys, threading
from pathlib import Path
try: from dotenv import load_dotenv; load_dotenv(Path(__file__).parent/".env")
except: pass

BANNER = """
 ██╗  ██╗██╗██████╗  █████╗ ███╗   ██╗███╗   ██╗███╗   ██╗
 ██║ ██╔╝██║██╔══██╗██╔══██╗████╗  ██║████╗  ██║████╗  ██║
 █████╔╝ ██║██████╔╝███████║██╔██╗ ██║██╔██╗ ██║██╔██╗ ██║
 ██╔═██╗ ██║██╔══██╗██╔══██║██║╚██╗██║██║╚██╗██║██║╚██╗██║
 ██║  ██╗██║██║  ██║██║  ██║██║ ╚████║██║ ╚████║██║ ╚████║
 ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═══╝╚═╝  ╚═══╝
  Autonomous Agent System v2.0 — by Kiran
  Capabilities: Planning · Sub-Agents · Memory · Self-Coding · Heartbeat
"""

def start_fastapi():
    import uvicorn
    uvicorn.run("api.server:app", host="0.0.0.0", port=8000, reload=False, log_level="info")

def start_telegram():
    if not os.getenv("TELEGRAM_TOKEN"): print("[MAIN] TELEGRAM_TOKEN not set — skipping"); return
    try: from bots.telegram_bot import run_telegram_bot; run_telegram_bot()
    except Exception as e: print(f"[TELEGRAM] {e}")

def start_discord():
    if not os.getenv("DISCORD_TOKEN"): print("[MAIN] DISCORD_TOKEN not set — skipping"); return
    try: from bots.discord_bot import run_discord_bot; run_discord_bot()
    except Exception as e: print(f"[DISCORD] {e}")

if __name__ == "__main__":
    print(BANNER)
    for name, fn in [("Telegram", start_telegram), ("Discord", start_discord)]:
        t = threading.Thread(target=fn, name=name, daemon=True)
        t.start()
    print("[MAIN] API starting on http://localhost:8000")
    start_fastapi()