"""
Mission management endpoints.
Creates missions, tracks state, returns history.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import json, uuid, threading
from pathlib import Path
from datetime import datetime
from core.event_store import event_store

router = APIRouter()
MISSIONS_FILE = Path(__file__).parent.parent.parent / "memory" / "missions.json"

class MissionCreateReq(BaseModel):
    goal: str
    team: str = "research"       # preset team name or "standard"
    autonomy: str = "semi"       # full | semi | manual
    max_steps: int = 12

@router.get("/missions")
def list_missions():
    """List all missions."""
    if not MISSIONS_FILE.exists():
        return {"missions": []}
    try:
        data = json.loads(MISSIONS_FILE.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            missions = list(data.values())
        elif isinstance(data, list):
            missions = data
        else:
            missions = []
        # Sort by created_at desc if available
        try:
            missions.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        except Exception:
            pass
        return {"missions": missions}
    except Exception:
        return {"missions": []}

@router.post("/missions")
def create_mission(req: MissionCreateReq):
    """Create and start a new mission."""
    mission_id = f"msn_{uuid.uuid4().hex[:6]}"
    
    # We support standard mode vs multi_agent mode
    mode = "multi_agent" if req.team != "standard" else "standard"
    
    mission = {
        "id": mission_id,
        "goal": req.goal,
        "team": req.team,
        "autonomy": req.autonomy,
        "max_steps": req.max_steps,
        "mode": mode,
        "status": "running",
        "created_at": datetime.now().isoformat(),
        "plan": {"multi_agent": True, "sub_tasks": []} if mode == "multi_agent" else {},
        "progress": {
            "current_step": 0,
            "completed_tasks": [],
            "failures": [],
            "history": []
        },
        "result": None
    }
    
    _save_mission_to_file(mission)
    
    # Emit event
    event_store.emit("mission.created", "system", 
                     {"goal": req.goal, "team": req.team, "mode": mode},
                     mission_id=mission_id, status="running")
    
    # Start execution in background
    thread = threading.Thread(
        target=_execute_mission, 
        args=(mission_id, req.goal, req.team, mode, req.max_steps, req.autonomy),
        daemon=True
    )
    thread.start()
    
    return mission

@router.get("/missions/{mission_id}")
def get_mission(mission_id: str):
    """Get mission detail with events."""
    if not MISSIONS_FILE.exists():
        return {"error": "not found"}
    try:
        data = json.loads(MISSIONS_FILE.read_text(encoding="utf-8"))
        mission = None
        if isinstance(data, dict):
            mission = data.get(mission_id)
        elif isinstance(data, list):
            for m in data:
                if (m.get("mission_id") or m.get("id")) == mission_id:
                    mission = m
                    break
        
        if mission:
            # Normalize id field
            if "id" not in mission:
                mission["id"] = mission.get("mission_id")
            mission["events"] = event_store.get_mission_events(mission_id)
            return mission
    except Exception as e:
        return {"error": f"Error loading mission: {str(e)}"}
    return {"error": "not found"}

@router.post("/missions/{mission_id}/step")
async def execute_mission_step(mission_id: str):
    """Execute the next step in the mission's plan."""
    if not MISSIONS_FILE.exists():
        return {"error": "Mission not found"}
    
    try:
        data = json.loads(MISSIONS_FILE.read_text(encoding="utf-8"))
        mission = None
        if isinstance(data, dict):
            mission = data.get(mission_id)
        elif isinstance(data, list):
            for m in data:
                if (m.get("mission_id") or m.get("id")) == mission_id:
                    mission = m
                    break
        
        if not mission:
            return {"error": "Mission not found"}
        
        # Check if it's paused multi_agent mission
        if mission.get("status") == "paused" and mission.get("mode") == "multi_agent":
            # Resume in background
            mission["status"] = "running"
            _save_mission_to_file(mission)
            
            # Emit mission step resume event
            event_store.emit("mission.step", "system",
                             {"step": "Resuming mission execution from checkpoint"},
                             mission_id=mission_id, status="running")
            
            # Extract saved state
            progress = mission.get("progress") or {}
            saved_state = progress.get("multi_agent_state")
            autonomy = mission.get("autonomy", "semi")
            
            # Start background thread
            thread = threading.Thread(
                target=_execute_mission,
                args=(mission_id, mission["goal"], mission["team"], "multi_agent", mission.get("max_steps", 12), autonomy, saved_state),
                daemon=True
            )
            thread.start()
            
            return {"status": "running", "message": "Mission resumed in background."}
            
    except Exception as e:
        import logging
        logging.error(f"Error resuming mission: {e}")
        return {"error": f"Failed to resume mission: {str(e)}"}

    # Fallback to standard step execution (for standard single agent mode)
    from core.mission import MissionManager
    manager = MissionManager()
    result = await manager.execute_mission_step(mission_id)
    return result

def _save_mission_to_file(mission: dict):
    missions_data = {}
    if MISSIONS_FILE.exists():
        try:
            raw = json.loads(MISSIONS_FILE.read_text(encoding="utf-8"))
            if isinstance(raw, dict):
                missions_data = raw
            elif isinstance(raw, list):
                missions_data = {m.get("mission_id") or m.get("id"): m for m in raw if m}
        except Exception:
            pass
    missions_data[mission["id"]] = {
        "mission_id": mission["id"],
        "goal": mission["goal"],
        "status": mission["status"],
        "mode": mission.get("mode", "standard"),
        "autonomy": mission.get("autonomy", "semi"),
        "plan": mission.get("plan") or {},
        "progress": mission.get("progress") or {
            "current_step": 0,
            "completed_tasks": [],
            "failures": [],
            "history": []
        },
        "created_at": mission["created_at"],
        "updated_at": datetime.now().isoformat(),
        "result": mission.get("result")
    }
    MISSIONS_FILE.write_text(json.dumps(missions_data, indent=2), encoding="utf-8")

def _update_mission_status(mission_id: str, status: str, result, progress=None):
    """Update mission status in persistent store."""
    if not MISSIONS_FILE.exists():
        return
    try:
        data = json.loads(MISSIONS_FILE.read_text(encoding="utf-8"))
        if isinstance(data, dict) and mission_id in data:
            data[mission_id]["status"] = status
            data[mission_id]["result"] = result
            if progress:
                existing_progress = data[mission_id].get("progress") or {}
                new_history = existing_progress.get("history", []) + progress.get("history", [])
                progress["history"] = new_history
                progress["current_step"] = max(existing_progress.get("current_step", 0), progress.get("current_step", 0))
                data[mission_id]["progress"] = progress
            data[mission_id]["updated_at"] = datetime.now().isoformat()
            MISSIONS_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"Error updating mission status: {e}")

def _execute_mission(mission_id: str, goal: str, team: str, mode: str, max_steps: int, autonomy: str = "semi", saved_state: dict = None):
    """Background mission execution using either multi-agent or standard pipeline."""
    from core.llm import set_active_mission_id
    try:
        set_active_mission_id(mission_id)
        if mode == "multi_agent":
            # Call MultiAgentOrchestrator
            from core.multi_agent import MultiAgentOrchestrator
            
            if saved_state:
                event_store.emit("mission.step", "system",
                                 {"step": "Resuming collaboration from checkpoint"},
                                 mission_id=mission_id, status="running")
            else:
                event_store.emit("mission.step", "system",
                                 {"step": "Spawning team and initializing collaboration"},
                                 mission_id=mission_id, status="running")
            
            res = MultiAgentOrchestrator.run_mission(
                mission_id=mission_id,
                goal=goal,
                team_name=team,
                autonomy=autonomy,
                saved_state=saved_state
            )
            
            is_checkpoint = res.get("checkpoint", False)
            if is_checkpoint:
                status = "paused"
            else:
                success = res.get("success", False)
                status = "completed" if success else "failed"
                
                # Emit final status
                event_store.emit(
                    "mission.completed" if success else "mission.failed", 
                    "system",
                    {"result_preview": str(res.get("report_path", ""))},
                    mission_id=mission_id, 
                    status=status
                )
            
            # Prepare progress structure for persistence
            progress = {
                "current_step": len(res.get("rounds", {}).get("history", [])) if res.get("rounds") else 0,
                "completed_tasks": [],
                "failures": [],
                "history": [f"Execution paused at checkpoint: {res.get('message', '')}."] if is_checkpoint else [f"Multi-agent loop execution complete. Success: {success}."],
                "multi_agent_state": res.get("state", {})
            }
            
            _update_mission_status(mission_id, status, res, progress=progress)
        else:
            # Standard single agent pipeline
            from core.agent import run_full_pipeline
            from config.loader import MODEL_PLAN
            
            event_store.emit("mission.step", "system",
                             {"step": "Decomposing goal into sub-tasks"},
                             mission_id=mission_id, status="running")
            
            result = run_full_pipeline(goal, model=MODEL_PLAN())
            
            event_store.emit("mission.completed", "system",
                             {"result_preview": str(result)[:500]},
                             mission_id=mission_id, status="completed")
            
            _update_mission_status(mission_id, "completed", result)
    except Exception as e:
        event_store.emit("mission.failed", "system",
                         {"error": str(e)},
                         mission_id=mission_id, status="failed")
        _update_mission_status(mission_id, "failed", {"error": str(e)})
    finally:
        set_active_mission_id("")
