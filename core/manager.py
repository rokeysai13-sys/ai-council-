import asyncio
import json
from concurrent.futures import ThreadPoolExecutor
from agents.vote import vote

executor = ThreadPoolExecutor(max_workers=8)

# Memory stores conversation + user profile per session
memory = {}
user_profiles = {}


def get_history(session_id):
    return memory.get(session_id, [])


def get_profile(session_id):
    return user_profiles.get(session_id, {})


def update_profile(session_id, prompt, response):
    """Learn about the user from their messages."""
    if session_id not in user_profiles:
        user_profiles[session_id] = {
            "name": "Kiran",
            "message_count": 0,
            "topics": [],
        }
    p = user_profiles[session_id]
    p["message_count"] += 1

    # Track topics from keywords
    keywords = {
        "python": "Python", "javascript": "JavaScript", "code": "coding",
        "ml": "machine learning", "ai": "AI", "data": "data science",
        "web": "web dev", "game": "game dev", "linux": "Linux",
    }
    for kw, topic in keywords.items():
        if kw in prompt.lower() and topic not in p["topics"]:
            p["topics"].append(topic)
            if len(p["topics"]) > 10:
                p["topics"].pop(0)


def build_context_prompt(prompt, session_id):
    """Inject user profile into the prompt for personalization."""
    profile = get_profile(session_id)
    if not profile:
        return prompt
    topics = ", ".join(profile.get("topics", [])) if profile.get("topics") else "general topics"
    name = profile.get("name", "Kiran")
    count = profile.get("message_count", 0)
    context = (
        f"[User: {name} | Messages so far: {count} | Interests: {topics}]\n"
        f"{prompt}"
    )
    return context


def save_to_memory(session_id, user_prompt, response):
    if session_id not in memory:
        memory[session_id] = []
    memory[session_id].append({"role": "user", "content": user_prompt})
    memory[session_id].append({"role": "assistant", "content": str(response)})
    # Keep last 20 messages (10 exchanges) to stay fast
    if len(memory[session_id]) > 20:
        memory[session_id] = memory[session_id][-20:]


def clear_memory(session_id):
    memory.pop(session_id, None)
    user_profiles.pop(session_id, None)


def _ask(model_key, prompt, history=None):
    from core.models import ask, MODELS
    return ask(MODELS[model_key], prompt, history, model_key)


def _ask_stream(model_key, prompt, history=None):
    from core.models import ask_stream, MODELS
    return ask_stream(MODELS[model_key], prompt, history, model_key)


async def run(agent, prompt, session_id="default"):
    history = get_history(session_id)
    loop = asyncio.get_event_loop()
    update_profile(session_id, prompt, "")
    enriched = build_context_prompt(prompt, session_id)

    try:
        if agent == "debate":
            r1, r2, r3 = await asyncio.gather(
                loop.run_in_executor(executor, lambda: _ask("general",  enriched, history)),
                loop.run_in_executor(executor, lambda: _ask("reason",   enriched, history)),
                loop.run_in_executor(executor, lambda: _ask("analysis", enriched, history)),
            )
            answers = {"llama3": r1, "mistral": r2, "qwen": r3}
            best = await loop.run_in_executor(executor, lambda: vote(prompt, answers))
            save_to_memory(session_id, prompt, best)
            return {"agent": "debate", "answers": answers, "best_answer": best}

        if agent == "code":
            result = await loop.run_in_executor(executor, lambda: _ask("coder", enriched, history))
            save_to_memory(session_id, prompt, result)
            return {"agent": "code", "result": result}

        if agent == "research":
            r1, r2 = await asyncio.gather(
                loop.run_in_executor(executor, lambda: _ask("general", enriched, history)),
                loop.run_in_executor(executor, lambda: _ask("reason",  enriched, history)),
            )
            result = r1 + "\n\n" + r2
            save_to_memory(session_id, prompt, result)
            return {"agent": "research", "result": result}

        return {"agent": agent, "error": f"Unknown agent: {agent}"}
    except Exception as e:
        return {"agent": agent, "error": str(e)}


async def stream_run(agent, prompt, session_id="default"):
    history = get_history(session_id)
    loop = asyncio.get_event_loop()
    update_profile(session_id, prompt, "")
    enriched = build_context_prompt(prompt, session_id)

    def ev(data):
        return f"data: {json.dumps(data)}\n\n"

    try:
        if agent == "code":
            full = ""
            for chunk in _ask_stream("coder", enriched, history):
                full += chunk
                yield ev({"type": "chunk", "text": chunk})
            save_to_memory(session_id, prompt, full)
            yield ev({"type": "done"})

        elif agent == "research":
            yield ev({"type": "label", "text": "SUMMARY"})
            part1 = ""
            for chunk in _ask_stream("general", enriched, history):
                part1 += chunk
                yield ev({"type": "chunk", "text": chunk})
            yield ev({"type": "label", "text": "ANALYSIS"})
            part2 = ""
            for chunk in _ask_stream("reason", enriched, history):
                part2 += chunk
                yield ev({"type": "chunk", "text": chunk})
            save_to_memory(session_id, prompt, part1 + "\n\n" + part2)
            yield ev({"type": "done"})

        elif agent == "debate":
            collected = {}
            for model_key, label in [("general","LLAMA3"),("reason","MISTRAL"),("analysis","QWEN")]:
                yield ev({"type": "model_start", "model": label})
                text = ""
                for chunk in _ask_stream(model_key, enriched, history):
                    text += chunk
                    yield ev({"type": "chunk", "text": chunk})
                collected[label.lower()] = text
                yield ev({"type": "model_end"})
            yield ev({"type": "voting"})
            answers = {
                "llama3":  collected.get("llama3", ""),
                "mistral": collected.get("mistral", ""),
                "qwen":    collected.get("qwen", ""),
            }
            best = await loop.run_in_executor(executor, lambda: vote(prompt, answers))
            save_to_memory(session_id, prompt, best)
            yield ev({"type": "best", "text": best})
            yield ev({"type": "done"})

        else:
            yield ev({"type": "error", "text": f"Unknown agent: {agent}"})

    except Exception as e:
        yield ev({"type": "error", "text": str(e)})