import requests
import time
import json

BASE_URL = "http://127.0.0.1:8000"

def test_mission_flow():
    print("1. Creating a semi-autonomous research mission...")
    payload = {
        "goal": "Identify top 3 AI frameworks in 2026",
        "team": "research",
        "autonomy": "semi",
        "max_steps": 10
    }
    r = requests.post(f"{BASE_URL}/missions", json=payload)
    r.raise_for_status()
    mission = r.json()
    mission_id = mission["id"]
    print(f"Mission created successfully! ID: {mission_id}, Status: {mission['status']}, Autonomy: {mission['autonomy']}")
    
    print("\n2. Waiting for mission to progress and reach the checkpoint...")
    # Poll for status to change to paused
    paused = False
    for i in range(60):
        time.sleep(3)
        r = requests.get(f"{BASE_URL}/missions/{mission_id}")
        r.raise_for_status()
        details = r.json()
        status = details.get("status")
        print(f"Polling... Status: {status}, Current Step: {details.get('progress', {}).get('current_step')}")
        
        # Look for token events and checkpoint events
        events = details.get("events", [])
        llm_usage_events = [e for e in events if e.get("type") == "agent.llm_usage"]
        checkpoint_events = [e for e in events if e.get("type") == "mission.checkpoint"]
        
        if llm_usage_events:
            first_usage = llm_usage_events[0]["payload"]
            print(f"  [Found LLM Usage Event] Model: {first_usage.get('model')}, In: {first_usage.get('tokens_in')}, Out: {first_usage.get('tokens_out')}")
            
        if status == "paused":
            paused = True
            print(f"  [Checkpoint Reached] Status is paused. Checkpoint msg: {details.get('progress', {}).get('history', [])[-1]}")
            break
            
        if status in ("completed", "failed"):
            print(f"  [Mission Ended Early] Status: {status}")
            break
            
    if not paused:
        print("Mission did not reach paused state in time.")
        return
        
    print("\n3. Testing Resumption endpoint...")
    r = requests.post(f"{BASE_URL}/missions/{mission_id}/step")
    r.raise_for_status()
    resume_res = r.json()
    print(f"Resume response: {resume_res}")
    
    print("\n4. Polling after resume...")
    for i in range(10):
        time.sleep(3)
        r = requests.get(f"{BASE_URL}/missions/{mission_id}")
        r.raise_for_status()
        details = r.json()
        status = details.get("status")
        print(f"Polling... Status: {status}")
        if status in ("completed", "failed"):
            print(f"Mission execution finished! Status: {status}")
            break

if __name__ == "__main__":
    test_flow_success = False
    try:
        test_mission_flow()
        test_flow_success = True
    except Exception as e:
        print(f"Verification script failed: {e}")
