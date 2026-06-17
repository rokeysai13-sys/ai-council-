"""
Persistent council vote history.
Every vote is stored, queryable, and becomes governance data over time.
"""
from fastapi import APIRouter
import json
from pathlib import Path
from core.event_store import event_store

router = APIRouter()
DECISIONS_FILE = Path(__file__).parent.parent.parent / "memory" / "decision_log.json"

@router.get("/decisions")
def list_decisions():
    """All council decisions with full vote history."""
    if not DECISIONS_FILE.exists():
        return {"decisions": []}
    try:
        data = json.loads(DECISIONS_FILE.read_text(encoding="utf-8"))
        return {"decisions": data if isinstance(data, list) else []}
    except Exception:
        return {"decisions": []}

@router.get("/decisions/{decision_id}")
def get_decision(decision_id: str):
    """Single decision with all votes and reasoning."""
    if not DECISIONS_FILE.exists():
        return {"error": "not found"}
    try:
        data = json.loads(DECISIONS_FILE.read_text(encoding="utf-8"))
        decisions = data if isinstance(data, list) else []
        for d in decisions:
            if d.get("id") == decision_id or d.get("mission_id") == decision_id:
                # Enrich with related events
                mission_id = d.get("mission_id")
                if mission_id:
                    d["events"] = [e for e in event_store.get_mission_events(mission_id)
                                  if e["type"].startswith("council.")]
                return d
    except Exception as e:
        return {"error": str(e)}
    return {"error": "not found"}
