"""
WebSocket endpoint for real-time event streaming.
REST endpoints for event queries.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from core.event_store import event_store

router = APIRouter()

@router.websocket("/ws/events")
async def ws_events(ws: WebSocket):
    """Clients connect here to receive real-time agent events."""
    await ws.accept()
    event_store.connect(ws)
    try:
        while True:
            await ws.receive_text()  # Keep alive
    except WebSocketDisconnect:
        event_store.disconnect(ws)

@router.get("/events")
def get_events(date: str = None, mission_id: str = None,
               agent_id: str = None, type: str = None, limit: int = 200):
    """Query persisted events."""
    return event_store.query(date, mission_id, agent_id, type, limit)

@router.get("/events/mission/{mission_id}")
def get_mission_events(mission_id: str):
    """Get full event timeline for a mission."""
    return event_store.get_mission_events(mission_id)
