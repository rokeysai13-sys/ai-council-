"""
core/planner.py — Task Decomposition Engine
Breaks big goals into structured sub-tasks with assigned specialist agents.
"""
import json, re, requests

OLLAMA_URL = "http://localhost:11434/api/generate"

PLANNER_SYSTEM = """You are a master project planner for an autonomous AI agent system called kirannn.

When given a high-level goal, you MUST respond with ONLY a JSON plan like this:
{
  "goal": "original goal",
  "complexity": "simple|medium|complex",
  "estimated_steps": 3,
  "sub_tasks": [
    {
      "id": 1,
      "title": "Short task name",
      "description": "What exactly needs to be done",
      "agent": "researcher|coder|analyst|writer|shell",
      "depends_on": [],
      "parallel": true
    }
  ],
  "final_output": "What the final deliverable should be"
}

Agent types:
- researcher: web search, URL fetching, data gathering
- coder: writing/executing Python or shell code
- analyst: synthesizing data, finding patterns, scoring confidence
- writer: drafting reports, summaries, structured documents
- shell: file operations, system commands, process management

Respond ONLY with the JSON. No other text."""


def decompose(goal: str, model: str = "llama3") -> dict:
    """Break a goal into structured sub-tasks."""
    try:
        r = requests.post(OLLAMA_URL, json={
            "model": model,
            "system": PLANNER_SYSTEM,
            "prompt": f"Create a plan for: {goal}",
            "stream": False,
            "options": {"temperature": 0.2}
        }, timeout=60)
        raw = r.json().get("response", "").strip()
        
        # Extract JSON
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            plan = json.loads(match.group())
            return {"success": True, "plan": plan}
        return {"success": False, "error": "Could not parse plan", "raw": raw}
    except Exception as e:
        return {"success": False, "error": str(e)}


def format_plan_md(plan: dict) -> str:
    """Format a plan as readable markdown."""
    if not plan.get("success"):
        return f"Planning failed: {plan.get('error')}"
    
    p = plan["plan"]
    lines = [
        f"## 📋 Plan: {p.get('goal', 'Unknown')}",
        f"**Complexity:** {p.get('complexity', '?')} | **Steps:** {p.get('estimated_steps', '?')}",
        "",
        "### Sub-Tasks"
    ]
    for t in p.get("sub_tasks", []):
        parallel = "⚡ parallel" if t.get("parallel") else "→ sequential"
        deps = f" (after {t['depends_on']})" if t.get("depends_on") else ""
        lines.append(f"{t['id']}. **[{t['agent'].upper()}]** {t['title']}{deps} _{parallel}_")
        lines.append(f"   {t['description']}")
    
    lines += ["", f"**Final Output:** {p.get('final_output', '?')}"]
    return "\n".join(lines)