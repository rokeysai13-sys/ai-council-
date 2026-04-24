"""
core/heartbeat.py — Proactive Scheduler
Wakes up every N minutes. Checks tasks, sends briefs, monitors health.
"""
import asyncio, datetime, requests
from pathlib import Path

OLLAMA_URL = "http://localhost:11434/api/generate"
BASE = Path(__file__).parent.parent
_notify_fn = None  # injected by Telegram/Discord bot

def register_notifier(fn):
    global _notify_fn
    _notify_fn = fn

def _notify(msg: str):
    print(f"[HEARTBEAT ⏰] {msg}")
    if _notify_fn:
        try: asyncio.create_task(_notify_fn(msg))
        except: pass

async def task_morning_brief():
    now = datetime.datetime.now()
    if now.hour != 8 or now.minute > 5: return
    mem = (BASE/"memory"/"MEMORY.md").read_text(encoding="utf-8")[:500] if (BASE/"memory"/"MEMORY.md").exists() else ""
    try:
        r = requests.post(OLLAMA_URL, json={
            "model": "llama3",
            "prompt": f"Today is {now.strftime('%A %B %d')}. Memory: {mem}\nWrite a 100-word morning brief for Kiran: 1 tech tip, 1 AI trend, 1 focus suggestion.",
            "stream": False, "options": {"temperature": 0.7}
        }, timeout=30)
        brief = r.json().get("response", "Good morning, Kiran!")
        _notify(f"☀️ Morning Brief:\n{brief}")
    except: _notify("☀️ Good morning, Kiran! Time to build something great.")

async def task_pending():
    mem = (BASE/"memory"/"MEMORY.md")
    if not mem.exists(): return
    txt = mem.read_text(encoding="utf-8")
    if "## Pending Tasks" not in txt: return
    start = txt.find("## Pending Tasks")
    end = txt.find("\n##", start+1)
    section = txt[start:end if end!=-1 else start+400]
    if "- " in section:
        _notify(f"📋 Pending tasks:\n{section[:300]}")

async def task_health():
    issues = []
    try:
        r = requests.get("http://localhost:11434/api/tags", timeout=4)
        models = [m["name"] for m in r.json().get("models",[])]
        if not models: issues.append("Ollama: no models loaded")
        else: print(f"[HEARTBEAT] Ollama OK — {len(models)} models")
    except: issues.append("Ollama offline")
    try: requests.get("http://localhost:8000/", timeout=3)
    except: issues.append("kirannn API offline")
    if issues: _notify("⚠️ Health Alert:\n" + "\n".join(issues))

async def task_reports():
    """Notify if new reports were saved since last heartbeat."""
    reports_dir = BASE/"reports"
    if not reports_dir.exists(): return
    recent = sorted(reports_dir.glob("*.md"), key=lambda f: f.stat().st_mtime, reverse=True)
    if recent:
        latest = recent[0]
        import time
        if time.time() - latest.stat().st_mtime < 1800:  # last 30min
            _notify(f"📄 New report saved: {latest.name}")

async def heartbeat_loop(interval_minutes: int = 30):
    tick = 0
    print(f"[HEARTBEAT] Started — every {interval_minutes} min")
    while True:
        await asyncio.sleep(interval_minutes * 60)
        tick += 1
        now = datetime.datetime.now().strftime("%H:%M")
        print(f"[HEARTBEAT] Tick #{tick} @ {now}")
        try:
            await task_morning_brief()
            await task_pending()
            if tick % 2 == 0: await task_health()
            await task_reports()
        except Exception as e:
            print(f"[HEARTBEAT] Error: {e}")

def start_heartbeat(interval_minutes: int = 30):
    loop = asyncio.get_event_loop()
    loop.create_task(heartbeat_loop(interval_minutes))