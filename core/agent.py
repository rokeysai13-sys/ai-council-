"""
core/agent.py — Master Orchestrator
Routes requests: simple → direct tool-use loop | complex → planner + sub-agents
"""
import json, re, requests
from .tools import call_tool, tools_manifest, memory_read, soul_read, memory_append

OLLAMA_URL = "http://localhost:11434/api/generate"
DEFAULT_MODEL = "llama3"
MAX_STEPS = 10

SYSTEM_PROMPT = """You are kirannn, an autonomous AI agent with real tools and sub-agents.

{soul}

{tools}

## Tool Usage
When you need a tool, respond ONLY with JSON:
{{"tool": "tool_name", "args": {{"arg1": "value1"}}}}

When done, respond normally in plain text.

## Principles
1. Check memory first for context
2. Use web_search + web_fetch for research tasks
3. Use code_exec to run computations
4. Log important findings to memory
5. For COMPLEX tasks (research, analysis, multi-step), tell the user you're using the planning system
"""

def run_agent(message: str, model: str = DEFAULT_MODEL, session_id: str = None) -> dict:
    """Smart router: simple tasks use tool loop, complex tasks use planner+subagents."""
    soul = soul_read().get("result", "")[:600]
    memory = memory_read().get("result", "")[:800]
    tools = tools_manifest()

    # Complexity check
    complex_keywords = ["research", "analyze", "investigate", "compare", "comprehensive",
                        "deep dive", "study", "report on", "explain in detail", "overview of"]
    is_complex = any(kw in message.lower() for kw in complex_keywords) or len(message) > 120

    if is_complex:
        return run_full_pipeline(message, model)
    
    return run_tool_loop(message, model, soul, memory, tools)


def run_tool_loop(message: str, model: str, soul: str, memory: str, tools: str) -> dict:
    """Simple tool-use loop for direct tasks."""
    system = SYSTEM_PROMPT.format(soul=soul, tools=tools)
    context = f"Memory:\n{memory}\n\nUser: {message}"
    trace = []

    current_prompt = context
    for step in range(MAX_STEPS):
        try:
            r = requests.post(OLLAMA_URL, json={
                "model": model, "system": system,
                "prompt": current_prompt, "stream": False,
                "options": {"temperature": 0.3}
            }, timeout=60)
            reply = r.json().get("response", "").strip()
        except Exception as e:
            return {"response": f"Model error: {e}", "trace": trace}

        tool_call = _parse_tool_call(reply)
        if tool_call:
            name = tool_call.get("tool")
            args = tool_call.get("args", {})
            result = call_tool(name, **args)
            trace.append({"step": step+1, "tool": name, "args": args, "result": result})
            current_prompt = f"Tool result for {name}:\n{json.dumps(result)[:1000]}\n\nContinue."
        else:
            if trace:
                memory_append(f"Task: {message[:60]} | Used: {[t['tool'] for t in trace]}")
            return {"response": reply, "trace": trace, "steps": len(trace)}

    return {"response": "Max steps reached.", "trace": trace}


def run_full_pipeline(message: str, model: str = DEFAULT_MODEL) -> dict:
    """Full pipeline: decompose → orchestrate sub-agents → synthesize report."""
    from .planner import decompose, format_plan_md
    from .subagents import orchestrate, analyst_agent, writer_agent

    # Step 1: Decompose
    plan = decompose(message, model=model)
    plan_text = format_plan_md(plan)

    if not plan.get("success"):
        # Fallback to simple loop
        soul = soul_read().get("result", "")[:600]
        memory = memory_read().get("result", "")[:600]
        return run_tool_loop(message, model, soul, memory, tools_manifest())

    # Step 2: Execute sub-tasks
    orch_result = orchestrate(plan)
    all_findings = "\n\n".join(
        f"=== Task {tid} ===\n{text}"
        for tid, text in orch_result.get("context", {}).items()
    )

    # Step 3: Synthesize final report
    final = analyst_agent(f"Synthesize findings for: {message}", all_findings)
    report_result = writer_agent(message, all_findings + "\n\n" + final.get("analysis",""), title=message[:40])

    # Log to memory
    memory_append(f"Full pipeline: '{message[:60]}' → {len(orch_result.get('results',{}))} sub-tasks completed")

    return {
        "response": report_result.get("report", final.get("analysis", "Pipeline completed")),
        "plan": plan_text,
        "sub_results": orch_result.get("results", {}),
        "report_path": report_result.get("saved_to"),
        "trace": [{"tool": "planner"}, {"tool": "orchestrator"}, {"tool": "writer"}],
        "pipeline": True
    }


# ── Specialist runners (for direct API calls) ─────────────────────────────────

def run_debate(message: str) -> dict:
    models = ["llama3", "mistral", "qwen2.5:7b"]
    responses = {}
    for m in models:
        try:
            r = requests.post(OLLAMA_URL, json={
                "model": m, "prompt": message, "stream": False,
                "options": {"temperature": 0.7}
            }, timeout=60)
            responses[m] = r.json().get("response", "").strip()
        except Exception as e:
            responses[m] = f"Error: {e}"
    # Vote
    try:
        vp = f"Responses to: \"{message}\"\n" + "\n".join(f"{k}: {v[:200]}" for k,v in responses.items())
        rv = requests.post(OLLAMA_URL, json={
            "model": "qwen2.5:7b",
            "prompt": vp + "\nWhich is most accurate? Reply ONLY with the model name.",
            "stream": False, "options": {"temperature": 0.1}
        }, timeout=30)
        winner_raw = rv.json().get("response","").lower()
        winner = next((k for k in responses if k in winner_raw), list(responses.keys())[0])
    except:
        winner = list(responses.keys())[0]
    return {"responses": responses, "best": responses[winner], "winner": winner}


def run_code_agent(message: str) -> dict:
    from .subagents import coder_agent
    return coder_agent(message)


def run_research_agent(message: str) -> dict:
    from .subagents import researcher_agent, analyst_agent
    research = researcher_agent(message)
    analysis = analyst_agent(message, research.get("findings", ""))
    return {
        "findings": research.get("findings"),
        "analysis": analysis.get("analysis"),
        "sources": research.get("sources", []),
        "response": analysis.get("analysis", research.get("findings", ""))
    }


def _parse_tool_call(text: str):
    text = text.strip()
    try:
        obj = json.loads(text)
        if "tool" in obj: return obj
    except: pass
    match = re.search(r'\{[^{}]*"tool"[^{}]*\}', text, re.DOTALL)
    if match:
        try: return json.loads(match.group())
        except: pass
    return None