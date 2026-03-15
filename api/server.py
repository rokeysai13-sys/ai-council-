import threading
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, PlainTextResponse
from core.models import warmup
from core.manager import run, stream_run, clear_memory, get_history


def start_telegram():
    try:
        import telegram_bot
        print("🤖 Starting Telegram bot...")
        telegram_bot.main()
    except Exception as e:
        print(f"⚠️  Telegram bot failed to start: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    warmup()
    # Start Telegram bot in background thread
    t = threading.Thread(target=start_telegram, daemon=True)
    t.start()
    yield


app = FastAPI(title="AI Team", version="3.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/")
def root():
    return {"status": "running", "agents": ["debate", "code", "research"]}


@app.get("/chat")
async def chat(agent: str, prompt: str, session_id: str = "default"):
    if not prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    result = await run(agent, prompt, session_id)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@app.get("/stream")
async def stream(agent: str, prompt: str, session_id: str = "default"):
    if not prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    return StreamingResponse(
        stream_run(agent, prompt, session_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )


@app.post("/whatsapp")
async def whatsapp(request: Request):
    from agents.whatsapp import whatsapp_reply
    xml = await whatsapp_reply(request)
    return PlainTextResponse(content=xml, media_type="text/xml")


@app.get("/memory/{session_id}")
def get_mem(session_id: str):
    return {"session_id": session_id, "history": get_history(session_id)}


@app.delete("/memory/{session_id}")
def del_mem(session_id: str):
    clear_memory(session_id)
    return {"status": "cleared"}