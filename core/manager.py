import asyncio
import json
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=8)
memory = {}  # session_id -> list of messages (in-memory cache)
user_profiles = {}

def get_history(session_id):
    return memory.get(session_id, [])

def update_profile(session_id, prompt):
    if session_id not in user_profiles:
        user_profiles[session_id] = {"name": "Kiran", "message_count": 0, "topics": []}
    p = user_profiles[session_id]
    p["message_count"] += 1
    for kw, topic in {"python":"Python","javascript":"JavaScript","code":"coding","ml":"ML","ai":"AI","web":"web dev"}.items():
        if kw in prompt.lower() and topic not in p["topics"]:
            p["topics"].append(topic)

def build_context_prompt(prompt, session_id):
    profile = user_profiles.get(session_id, {})
    if not profile:
        return prompt
    topics = ", ".join(profile.get("topics", [])) or "general"
    return f"[User: Kiran | Interests: {topics}]\n{prompt}"

def save_to_memory(session_id, user_prompt, response, username="guest"):
    if session_id not in memory:
        memory[session_id] = []
    memory[session_id].append({"role": "user", "content": user_prompt})
    memory[session_id].append({"role": "assistant", "content": str(response)})
    if len(memory[session_id]) > 20:
        memory[session_id] = memory[session_id][-20:]
    # Also persist to DB
    try:
        from database import save_persistent_memory
        save_persistent_memory(username, "user", user_prompt)
        save_persistent_memory(username, "assistant", str(response))
    except Exception as e:
        print(f"Persist memory error: {e}")

def load_user_memory(session_id, username="guest"):
    """Load persistent memory from DB into session cache on login."""
    if session_id not in memory:
        try:
            from database import load_persistent_memory
            memory[session_id] = load_persistent_memory(username)
        except:
            memory[session_id] = []
    return memory.get(session_id, [])

def clear_memory(session_id, username="guest"):
    memory.pop(session_id, None)
    user_profiles.pop(session_id, None)
    try:
        from database import clear_persistent_memory
        clear_persistent_memory(username)
    except:
        pass

def _ask(model_key, prompt, history=None, debate_phase=None):
    from core.models import ask, MODELS
    return ask(MODELS[model_key], prompt, history, model_key, debate_phase)

def _ask_stream(model_key, prompt, history=None, debate_phase=None):
    from core.models import ask_stream, MODELS
    return ask_stream(MODELS[model_key], prompt, history, model_key, debate_phase)

def _save_db(session_id, agent, prompt, response, extra=None, username="guest"):
    try:
        from database import save_conversation
        save_conversation(session_id, agent, prompt, response, extra, username)
    except Exception as e:
        print(f"DB error: {e}")

async def run(agent, prompt, session_id="default", username="guest", use_web=False):
    history = load_user_memory(session_id, username)
    loop = asyncio.get_event_loop()
    update_profile(session_id, prompt)
    enriched = build_context_prompt(prompt, session_id)

    # Inject web search if requested
    if use_web:
        try:
            from websearch import search_and_inject
            enriched = await loop.run_in_executor(executor, lambda: search_and_inject(prompt, enriched))
        except Exception as e:
            print(f"Web search error: {e}")

    try:
        if agent == "code":
            result = await loop.run_in_executor(executor, lambda: _ask("coder", enriched, history))
            save_to_memory(session_id, prompt, result, username)
            _save_db(session_id, "code", prompt, result, username=username)
            return {"agent": "code", "result": result}

        if agent == "research":
            r1, r2 = await asyncio.gather(
                loop.run_in_executor(executor, lambda: _ask("general", enriched, history)),
                loop.run_in_executor(executor, lambda: _ask("reason", enriched, history)),
            )
            result = r1 + "\n\nAnalysis:\n" + r2
            save_to_memory(session_id, prompt, result, username)
            _save_db(session_id, "research", prompt, result, username=username)
            return {"agent": "research", "result": result}

        if agent == "debate":
            from agents.debate import run_debate
            from agents.vote import vote
            all_rounds, final_answers = await loop.run_in_executor(
                executor, lambda: run_debate(enriched, history, rounds=2)
            )
            winner, votes, best_text = await loop.run_in_executor(
                executor, lambda: vote(prompt, final_answers)
            )
            save_to_memory(session_id, prompt, best_text, username)
            _save_db(session_id, "debate", prompt, best_text,
                     {"winner": winner, "votes": str(votes), "rounds": 2}, username)
            return {"agent":"debate","winner":winner,"votes":votes,"best_answer":best_text}

        return {"agent": agent, "error": f"Unknown agent: {agent}"}
    except Exception as e:
        return {"agent": agent, "error": str(e)}


async def stream_run(agent, prompt, session_id="default", username="guest", use_web=False):
    history = load_user_memory(session_id, username)
    loop = asyncio.get_event_loop()
    update_profile(session_id, prompt)
    enriched = build_context_prompt(prompt, session_id)

    if use_web:
        try:
            from websearch import search_and_inject
            enriched = await loop.run_in_executor(executor, lambda: search_and_inject(prompt, enriched))
            yield f"data: {json.dumps({'type':'web_search','text':'Searching the web...'})}\n\n"
        except Exception as e:
            print(f"Web search error: {e}")

    def ev(data):
        return f"data: {json.dumps(data)}\n\n"

    try:
        if agent == "code":
            full = ""
            for chunk in _ask_stream("coder", enriched, history):
                full += chunk
                yield ev({"type": "chunk", "text": chunk})
            save_to_memory(session_id, prompt, full, username)
            _save_db(session_id, "code", prompt, full, username=username)
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
            result = part1 + "\n\n" + part2
            save_to_memory(session_id, prompt, result, username)
            _save_db(session_id, "research", prompt, result, username=username)
            yield ev({"type": "done"})

        elif agent == "debate":
            research = {}
            final_answers = {}

            for round_num in range(1, 3):  # 2 rounds
                # RESEARCH (only round 1) or use previous rewrites
                if round_num == 1:
                    yield ev({"type": "phase", "phase": "research", "text": "PHASE 1 — RESEARCH"})
                    for model_key, label in [("general","LLAMA3"),("reason","MISTRAL"),("analysis","QWEN")]:
                        yield ev({"type": "model_start", "model": label, "phase": "research"})
                        text = ""
                        for chunk in _ask_stream(model_key, enriched, history, debate_phase="research"):
                            text += chunk
                            yield ev({"type": "chunk", "text": chunk})
                        research[label] = text
                        final_answers[label] = text
                        yield ev({"type": "model_end", "model": label})

                # CRITIQUE
                yield ev({"type": "phase", "phase": "critique", "text": f"ROUND {round_num} — CRITIQUE"})
                critiques = {}
                for model_key, label in [("general","LLAMA3"),("reason","MISTRAL"),("analysis","QWEN")]:
                    others = "\n\n".join(f"[{n}]:\n{a}" for n,a in final_answers.items() if n != label)
                    cp = (f"Question: {prompt}\n\nYour answer:\n{final_answers[label]}\n\n"
                          f"Other models:\n{others}\n\n"
                          f"Round {round_num} of 2. Point out specific mistakes in the OTHER answers. Use bullet points.")
                    yield ev({"type": "model_start", "model": label, "phase": "critique"})
                    text = ""
                    for chunk in _ask_stream(model_key, cp, None, debate_phase="critique"):
                        text += chunk
                        yield ev({"type": "chunk", "text": chunk})
                    critiques[label] = text
                    yield ev({"type": "model_end", "model": label})

                # REWRITE
                yield ev({"type": "phase", "phase": "rewrite", "text": f"ROUND {round_num} — REWRITE"})
                new_answers = {}
                for model_key, label in [("general","LLAMA3"),("reason","MISTRAL"),("analysis","QWEN")]:
                    received = "\n\n".join(f"[{n} criticized you]:\n{c}" for n,c in critiques.items() if n != label)
                    rp = (f"Question: {prompt}\n\nYour answer:\n{final_answers[label]}\n\n"
                          f"Criticism:\n{received}\n\nRound {round_num} of 2. Rewrite fixing valid mistakes.")
                    yield ev({"type": "model_start", "model": label, "phase": "rewrite"})
                    text = ""
                    for chunk in _ask_stream(model_key, rp, None, debate_phase="rewrite"):
                        text += chunk
                        yield ev({"type": "chunk", "text": chunk})
                    new_answers[label] = text
                    yield ev({"type": "model_end", "model": label})
                final_answers = new_answers

            # VOTE
            yield ev({"type": "phase", "phase": "vote", "text": "FINAL — VOTING"})
            yield ev({"type": "voting"})
            from agents.vote import vote as do_vote
            winner, votes, best_text = await loop.run_in_executor(executor, lambda: do_vote(prompt, final_answers))
            save_to_memory(session_id, prompt, best_text, username)
            _save_db(session_id, "debate", prompt, best_text,
                     {"winner": winner, "rounds": 2}, username)
            yield ev({"type": "best", "text": best_text, "winner": winner, "votes": str(votes)})
            yield ev({"type": "done"})

        else:
            yield ev({"type": "error", "text": f"Unknown agent: {agent}"})

    except Exception as e:
        yield ev({"type": "error", "text": str(e)})