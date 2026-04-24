"""
api/server.py — kirannn FastAPI backend
"""
import os, sys, datetime
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager

from core.agent import run_agent, run_debate, run_code_agent, run_research_agent, run_full_pipeline
from core.tools import (file_read, file_write, file_list, shell_exec,
                        memory_read, memory_append, call_tool, list_reports,
                        web_search, web_fetch, code_exec)
from core.planner import decompose, format_plan_md

BASE = Path(__file__).parent.parent

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🦾 kirannn starting up...")
    try:
        from core.heartbeat import start_heartbeat
        start_heartbeat(30)
    except Exception as e:
        print(f"[WARNING] Heartbeat: {e}")
    yield
    print("kirannn shutting down.")

app = FastAPI(title="kirannn", version="2.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

if (BASE/"index.html").exists():
    app.mount("/static", StaticFiles(directory=str(BASE)), name="static")

# ── Pydantic models ───────────────────────────────────────────────────────────
class ChatReq(BaseModel):
    message: str
    session_id: str = "default"
    model: str = "llama3"

class ToolReq(BaseModel):
    tool: str
    args: dict = {}

class FileReq(BaseModel):
    path: str
    content: str = ""
    mode: str = "w"

class MemReq(BaseModel):
    entry: str
    section: str = "Recent Context"

class ShellReq(BaseModel):
    command: str
    cwd: str = None

class PlanReq(BaseModel):
    goal: str
    model: str = "llama3"
    execute: bool = False

class CodeReq(BaseModel):
    code: str
    language: str = "python"

# ── Routes ────────────────────────────────────────────────────────────────────
BASE = Path("C:/my_ai_team")  # ← hardcode the exact path

@app.get("/")
def root():
    return FileResponse("C:/my_ai_team/index.html")

@app.get("/health")
def health():
    import requests as req
    status = {"api": "ok", "ollama": "unknown", "models": []}
    try:
        r = req.get("http://localhost:11434/api/tags", timeout=3)
        status["ollama"] = "ok"
        status["models"] = [m["name"] for m in r.json().get("models", [])]
    except:
        status["ollama"] = "offline"
    return status

# ── Chat endpoints ────────────────────────────────────────────────────────────
@app.post("/chat/agent")
def chat_agent(req: ChatReq):
    return run_agent(req.message, model=req.model, session_id=req.session_id)

@app.post("/chat/debate")
def chat_debate(req: ChatReq):
    return run_debate(req.message)

@app.post("/chat/code")
def chat_code(req: ChatReq):
    return run_code_agent(req.message)

@app.post("/chat/research")
def chat_research(req: ChatReq):
    return run_research_agent(req.message)

@app.post("/chat/pipeline")
def chat_pipeline(req: ChatReq):
    """Full planning pipeline: decompose + parallel sub-agents + report."""
    return run_full_pipeline(req.message, model=req.model)

@app.post("/chat")
def chat(req: ChatReq):
    return run_agent(req.message, model=req.model, session_id=req.session_id)

# ── Planner endpoints ─────────────────────────────────────────────────────────
@app.post("/plan")
def plan(req: PlanReq):
    result = decompose(req.goal, model=req.model)
    if req.execute and result.get("success"):
        from core.subagents import orchestrate
        orch = orchestrate(result)
        return {"plan": result, "plan_md": format_plan_md(result), "execution": orch}
    return {"plan": result, "plan_md": format_plan_md(result)}

# ── Tool endpoints ────────────────────────────────────────────────────────────
@app.post("/tool")
def run_tool(req: ToolReq):
    return call_tool(req.tool, **req.args)

@app.get("/files")
def list_files(path: str = "."):
    return file_list(path)

@app.get("/files/read")
def read_file(path: str):
    return file_read(path)

@app.post("/files/write")
def write_file(req: FileReq):
    return file_write(req.path, req.content, req.mode)

@app.post("/shell")
def run_shell(req: ShellReq):
    return shell_exec(req.command, cwd=req.cwd)

@app.post("/code")
def run_code(req: CodeReq):
    return code_exec(req.code, req.language)

@app.post("/search")
def search_web(q: str):
    return web_search(q)

# ── Memory endpoints ──────────────────────────────────────────────────────────
@app.get("/memory")
def get_memory():
    return memory_read()

@app.post("/memory")
def add_memory(req: MemReq):
    return memory_append(req.entry, req.section)

# ── Reports endpoints ─────────────────────────────────────────────────────────
@app.get("/reports")
def get_reports():
    return list_reports()

@app.get("/reports/{name}")
def get_report(name: str):
    p = BASE / "reports" / name
    return file_read(str(p))

# ── Self-coding endpoint ──────────────────────────────────────────────────────
@app.post("/self-code")
def self_code(capability: str):
    from core.subagents import self_coder_agent
    return self_coder_agent(capability)

# ── Skills hub ────────────────────────────────────────────────────────────────
@app.get("/skills")
def list_skills():
    skills_dir = BASE / "skills_hub"
    skills_dir.mkdir(exist_ok=True)
    skills = []
    for f in skills_dir.glob("*.py"):
        skills.append({"name": f.stem, "file": f.name,
                        "size": f.stat().st_size,
                        "modified": datetime.datetime.fromtimestamp(f.stat().st_mtime).isoformat()})
    return {"skills": skills, "count": len(skills)}