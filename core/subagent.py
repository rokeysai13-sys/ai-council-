"""
core/subagents.py — Specialist Sub-Agent Pool
Each agent has a focused role. Orchestrator runs them in parallel.
"""
import re, json, requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from .tools import (web_search, web_fetch, shell_exec, code_exec,
                    memory_append, file_write, save_report)

OLLAMA_URL = "http://localhost:11434/api/generate"

# ── Individual specialist agents ──────────────────────────────────────────────

def researcher_agent(task: str, context: str = "") -> dict:
    """Searches web, fetches pages, returns gathered raw data."""
    findings = []
    
    # Step 1: Search for the topic
    search = web_search(task, num=5)
    if search["success"]:
        findings.append(f"Search results for '{task}':")
        for url, snippet in search.get("results", [])[:3]:
            findings.append(f"- {url}\n  {snippet}")
            # Step 2: Fetch top 2 pages for deeper content
            page = web_fetch(url)
            if page["success"]:
                findings.append(f"  Content: {page['result'][:800]}")
    
    raw = "\n".join(findings)
    
    # Step 3: Ask model to extract key facts
    try:
        r = requests.post(OLLAMA_URL, json={
            "model": "mistral",
            "system": "You are a research analyst. Extract key facts, statistics, and insights from raw data. Be precise.",
            "prompt": f"Task: {task}\n\nRaw data:\n{raw[:3000]}\n\nExtract the most important findings as bullet points.",
            "stream": False,
            "options": {"temperature": 0.3}
        }, timeout=90)
        summary = r.json().get("response", raw[:1000])
    except:
        summary = raw[:1500]
    
    return {"agent": "researcher", "task": task, "findings": summary, "sources": [u for u,_ in search.get("results", [])[:3]]}


def coder_agent(task: str, context: str = "") -> dict:
    """Writes and optionally executes code to solve a problem."""
    try:
        r = requests.post(OLLAMA_URL, json={
            "model": "deepseek-coder:6.7b",
            "system": """You are an expert programmer. 
Write clean, working Python code.
If the task needs execution, add: # EXECUTE
at the top of the code.""",
            "prompt": f"Task: {task}\nContext: {context[:500]}",
            "stream": False,
            "options": {"temperature": 0.2}
        }, timeout=90)
        response = r.json().get("response", "")
    except Exception as e:
        return {"agent": "coder", "task": task, "error": str(e)}
    
    # Extract code block
    code_match = re.search(r"```python\n?(.*?)```", response, re.DOTALL)
    code = code_match.group(1) if code_match else ""
    
    executed = None
    if "# EXECUTE" in response and code:
        executed = code_exec(code, "python")
    
    return {"agent": "coder", "task": task, "code": code, "response": response, "executed": executed}


def analyst_agent(task: str, data: str = "", context: str = "") -> dict:
    """Synthesizes data, scores confidence, finds patterns."""
    try:
        r = requests.post(OLLAMA_URL, json={
            "model": "llama3",
            "system": """You are a senior data analyst. 
For every major claim or conclusion, assign a confidence level: [HIGH], [MEDIUM], or [LOW].
Structure your analysis clearly with sections.""",
            "prompt": f"Analyze this for: {task}\n\nData:\n{data[:3000]}\n\nProvide structured analysis with confidence scores.",
            "stream": False,
            "options": {"temperature": 0.3}
        }, timeout=90)
        analysis = r.json().get("response", "No analysis available")
    except Exception as e:
        return {"agent": "analyst", "task": task, "error": str(e)}
    
    return {"agent": "analyst", "task": task, "analysis": analysis}


def writer_agent(task: str, data: str = "", title: str = "Report") -> dict:
    """Produces polished, publication-ready reports."""
    try:
        r = requests.post(OLLAMA_URL, json={
            "model": "llama3",
            "system": """You are a professional technical writer.
Write publication-ready reports with:
- Executive Summary
- Key Findings (with [HIGH/MEDIUM/LOW] confidence)
- Detailed Analysis
- Sources & Evidence
- Conclusion & Recommendations

Use proper Markdown formatting.""",
            "prompt": f"Write a comprehensive report on: {task}\n\nResearch data:\n{data[:4000]}",
            "stream": False,
            "options": {"temperature": 0.4}
        }, timeout=120)
        report = r.json().get("response", "Report generation failed")
    except Exception as e:
        return {"agent": "writer", "task": task, "error": str(e)}
    
    # Auto-save to disk
    saved = save_report(title, report)
    
    return {"agent": "writer", "task": task, "report": report, "saved_to": saved.get("path")}


def shell_agent(task: str, context: str = "") -> dict:
    """Handles file system operations and system commands."""
    # Ask llama3 what command to run
    try:
        r = requests.post(OLLAMA_URL, json={
            "model": "llama3",
            "system": "You are a system administrator. Given a task, respond with ONLY the shell command to run. No explanation.",
            "prompt": f"Task: {task}",
            "stream": False,
            "options": {"temperature": 0.1}
        }, timeout=30)
        command = r.json().get("response", "").strip().strip("`")
    except Exception as e:
        return {"agent": "shell", "task": task, "error": str(e)}
    
    result = shell_exec(command)
    return {"agent": "shell", "task": task, "command": command, "result": result}


def self_coder_agent(capability_needed: str) -> dict:
    """
    The self-improvement agent. When kirannn can't do something,
    it writes its own code/skill to handle it.
    """
    try:
        r = requests.post(OLLAMA_URL, json={
            "model": "deepseek-coder:6.7b",
            "system": """You write Python skill modules for an autonomous AI agent.
Each skill must be a Python function that takes keyword arguments and returns a dict with {success, result/error}.
Output ONLY the Python code, no explanation.""",
            "prompt": f"""Write a Python skill function for: {capability_needed}

The function should:
1. Be named after the capability (snake_case)
2. Accept **kwargs
3. Return {{"success": True/False, "result": ...}} 
4. Handle errors gracefully

Output only the Python function code.""",
            "stream": False,
            "options": {"temperature": 0.2}
        }, timeout=90)
        code = r.json().get("response", "")
    except Exception as e:
        return {"success": False, "error": str(e)}
    
    # Extract and save as a new skill
    code_match = re.search(r"```python\n?(.*?)```", code, re.DOTALL)
    skill_code = code_match.group(1) if code_match else code
    
    # Try to extract function name
    name_match = re.search(r"def (\w+)", skill_code)
    skill_name = name_match.group(1) if name_match else "custom_skill"
    
    # Save to skills_hub
    from pathlib import Path
    skill_path = Path(__file__).parent.parent / "skills_hub" / f"{skill_name}.py"
    skill_path.write_text(skill_code, encoding="utf-8")
    
    memory_append(f"Self-coded new skill: {skill_name} for '{capability_needed}'", "Learned Facts")
    
    return {"success": True, "skill_name": skill_name, "code": skill_code, "path": str(skill_path)}


# ── Orchestrator: runs sub-agents in parallel ─────────────────────────────────

AGENT_MAP = {
    "researcher": researcher_agent,
    "coder":      coder_agent,
    "analyst":    analyst_agent,
    "writer":     writer_agent,
    "shell":      shell_agent,
}

def orchestrate(plan: dict, max_workers: int = 4) -> dict:
    """
    Take a decomposed plan and execute sub-tasks.
    Parallel tasks run concurrently, sequential tasks wait for dependencies.
    """
    if not plan.get("success"):
        return {"error": "Invalid plan"}
    
    sub_tasks = plan["plan"].get("sub_tasks", [])
    results = {}
    task_context = {}  # accumulated context passed between tasks
    
    # Group by dependency
    parallel_tasks = [t for t in sub_tasks if t.get("parallel") and not t.get("depends_on")]
    sequential_tasks = [t for t in sub_tasks if not t.get("parallel") or t.get("depends_on")]
    
    # Run parallel tasks
    if parallel_tasks:
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {}
            for task in parallel_tasks:
                agent_fn = AGENT_MAP.get(task["agent"], researcher_agent)
                ctx = "\n".join(str(v) for v in task_context.values())[:500]
                f = executor.submit(agent_fn, task["description"], ctx)
                futures[f] = task
            
            for f in as_completed(futures):
                task = futures[f]
                try:
                    result = f.result(timeout=120)
                except Exception as e:
                    result = {"error": str(e)}
                results[task["id"]] = result
                # Extract useful text for context
                task_context[task["id"]] = _extract_text(result)
                memory_append(f"Task {task['id']} [{task['agent']}]: {task['title']} → done", "Completed Tasks")
    
    # Run sequential tasks
    for task in sequential_tasks:
        agent_fn = AGENT_MAP.get(task["agent"], researcher_agent)
        # Build context from dependencies
        dep_context = "\n".join(str(task_context.get(d, "")) for d in task.get("depends_on", []))
        all_context = dep_context + "\n" + "\n".join(task_context.values())
        try:
            result = agent_fn(task["description"], all_context[:1000])
        except Exception as e:
            result = {"error": str(e)}
        results[task["id"]] = result
        task_context[task["id"]] = _extract_text(result)
        memory_append(f"Task {task['id']} [{task['agent']}]: {task['title']} → done", "Completed Tasks")
    
    return {
        "plan": plan["plan"],
        "results": results,
        "context": task_context
    }


def _extract_text(result: dict) -> str:
    """Pull the most useful text out of any result dict."""
    for key in ["findings", "analysis", "report", "response", "stdout", "result"]:
        if key in result and result[key]:
            return str(result[key])[:600]
    return str(result)[:300]