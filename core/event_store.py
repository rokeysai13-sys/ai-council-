"""
Append-only event store.
- Writes events to memory/events/YYYY-MM-DD.jsonl
- Broadcasts to connected WebSocket clients
- Provides query/replay capabilities
"""
import json, uuid, asyncio, threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from core.logger import logger

EVENTS_DIR = Path(__file__).parent.parent / "memory" / "events"

class EventStore:
    def __init__(self):
        EVENTS_DIR.mkdir(parents=True, exist_ok=True)
        self._ws_clients: list = []
        self._lock = threading.Lock()
        self._loop: Optional[asyncio.AbstractEventLoop] = None
    
    def set_loop(self, loop: asyncio.AbstractEventLoop):
        """Set the asyncio event loop for WebSocket broadcasting."""
        self._loop = loop
    
    def emit(self, event_type: str, agent_id: str, 
             payload: dict = None, mission_id: str = None,
             status: str = "completed") -> dict:
        """Persist event, then broadcast. Called from sync agent code."""
        event = {
            "id": f"evt_{uuid.uuid4().hex[:8]}",
            "mission_id": mission_id,
            "agent_id": agent_id,
            "type": event_type,
            "status": status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "payload": payload or {}
        }
        
        # 1. Persist to JSONL (append-only, never lose data)
        today = datetime.now().strftime("%Y-%m-%d")
        log_file = EVENTS_DIR / f"{today}.jsonl"
        with self._lock:
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(event) + "\n")
        
        # 2. Broadcast to WebSocket clients
        self._broadcast(event)
        
        return event
    
    def _broadcast(self, event: dict):
        """Send event to all connected WebSocket clients."""
        if not self._loop or not self._ws_clients:
            return
        dead = []
        for ws in self._ws_clients:
            try:
                asyncio.run_coroutine_threadsafe(
                    ws.send_json(event), self._loop
                )
            except Exception as e:
                logger.debug(f"[EVENT_STORE] Failed to broadcast event to client {ws}: {e}")
                dead.append(ws)
        for ws in dead:
            try:
                self._ws_clients.remove(ws)
                logger.debug(f"[EVENT_STORE] Removed disconnected client: {ws}")
            except ValueError:
                pass
    
    def connect(self, ws):
        self._ws_clients.append(ws)
    
    def disconnect(self, ws):
        if ws in self._ws_clients:
            self._ws_clients.remove(ws)
    
    def query(self, date: str = None, mission_id: str = None,
              agent_id: str = None, event_type: str = None,
              limit: int = 200) -> list:
        """Query persisted events with filters."""
        target_date = date or datetime.now().strftime("%Y-%m-%d")
        log_file = EVENTS_DIR / f"{target_date}.jsonl"
        if not log_file.exists():
            return []
        
        results = []
        with open(log_file, "r", encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                evt = json.loads(line)
                if mission_id and evt.get("mission_id") != mission_id:
                    continue
                if agent_id and evt.get("agent_id") != agent_id:
                    continue
                if event_type and evt.get("type") != event_type:
                    continue
                results.append(evt)
        
        return results[-limit:]
    
    def get_mission_events(self, mission_id: str) -> list:
        """Get all events for a mission (across all days)."""
        all_events = []
        for log_file in sorted(EVENTS_DIR.glob("*.jsonl")):
            with open(log_file, "r", encoding="utf-8") as f:
                for line in f:
                    if not line.strip():
                        continue
                    evt = json.loads(line)
                    if evt.get("mission_id") == mission_id:
                        all_events.append(evt)
        return all_events

# Global singleton
event_store = EventStore()
