import os

# Run this from inside your project folder:
# cd C:\my_ai_team2
# python fix_all.py

BASE = os.path.dirname(os.path.abspath(__file__))

files = {}

files["agents/debate.py"] = '''from core.models import ask, MODELS

def run_debate(prompt, history=None):
    print("DEBATE: Phase 1 - Research")
    initial = {}
    initial["LLAMA3"]  = ask(MODELS["general"],  prompt, history, "general",  "research")
    initial["MISTRAL"] = ask(MODELS["reason"],   prompt, history, "reason",   "research")
    initial["QWEN"]    = ask(MODELS["analysis"], prompt, history, "analysis", "research")
    print("DEBATE: Phase 2 - Critique")
    critiques = {}
    for my_name, my_key in [("LLAMA3","general"),("MISTRAL","reason"),("QWEN","analysis")]:
        others = "\\n\\n".join(f"[{n}]:\\n{a}" for n,a in initial.items() if n != my_name)
        cp = (f"Question: {prompt}\\n\\nYour answer:\\n{initial[my_name]}\\n\\n"
              f"Other models answered:\\n{others}\\n\\n"
              "Point out specific factual mistakes and weak reasoning in the OTHER models answers. "
              "Use bullet points. Be precise.")
        critiques[my_name] = ask(MODELS[my_key], cp, None, my_key, "critique")
    print("DEBATE: Phase 3 - Rewrite")
    rewrites = {}
    for my_name, my_key in [("LLAMA3","general"),("MISTRAL","reason"),("QWEN","analysis")]:
        received = "\\n\\n".join(f"[{n} criticized you]:\\n{c}" for n,c in critiques.items() if n != my_name)
        rp = (f"Question: {prompt}\\n\\nYour original answer:\\n{initial[my_name]}\\n\\n"
              f"Other models criticized you:\\n{received}\\n\\n"
              "Rewrite your answer fixing valid mistakes. Make it the best possible answer.")
        rewrites[my_name] = ask(MODELS[my_key], rp, None, my_key, "rewrite")
    return initial, critiques, rewrites
'''

files["agents/vote.py"] = '''from core.models import ask, MODELS

def vote(question, answers):
    formatted = "\\n\\n".join(f"[{name}]:\\n{ans}" for name, ans in answers.items())
    vote_prompt = (
        f"Question: {question}\\n\\n"
        f"Final answers after debate:\\n{formatted}\\n\\n"
        "Which answer is most accurate and complete?\\n"
        "Reply with ONLY the name: LLAMA3, MISTRAL, or QWEN"
    )
    votes = {}
    for model_key in ["general", "reason", "analysis"]:
        result = ask(MODELS[model_key], vote_prompt, None, model_key, "vote").strip().upper()
        for name in ["LLAMA3", "MISTRAL", "QWEN"]:
            if name in result:
                votes[name] = votes.get(name, 0) + 1
                break
    winner = max(votes, key=votes.get) if votes else "LLAMA3"
    return winner, votes, answers.get(winner, list(answers.values())[0])
'''

files["core/models.py"] = '''import ollama

MODELS = {
    "coder":    "deepseek-coder:6.7b",
    "general":  "llama3",
    "reason":   "mistral",
    "analysis": "qwen2.5:7b"
}

OPTIONS = {"num_ctx": 2048, "num_gpu": 99, "num_thread": 8, "temperature": 0.7}

SYSTEM_PROMPTS = {
    "coder":    "You are a coding assistant. Give clean working code. Be direct.",
    "general":  "You are a knowledgeable AI. Give accurate well-structured answers.",
    "reason":   "You are a sharp reasoning engine. Give accurate well-reasoned answers.",
    "analysis": "You are an analytical AI. Give thorough accurate analysis.",
}

DEBATE_PROMPTS = {
    "research": "You are in an AI debate. Give a thorough well-structured answer covering all important aspects. Be detailed.",
    "critique": "You are reviewing other AI answers. Find specific factual errors, missing info, and weak reasoning. Be harsh and use bullet points.",
    "rewrite":  "You are rewriting your answer after criticism. Fix mistakes, keep what was correct, make it the best answer possible.",
    "vote":     "You are voting for the best debate answer. Pick the most accurate and complete one.",
}

def ask(model, prompt, history=None, model_key="general", debate_phase=None):
    messages = []
    system = DEBATE_PROMPTS.get(debate_phase) if debate_phase else SYSTEM_PROMPTS.get(model_key, SYSTEM_PROMPTS["general"])
    messages.append({"role": "system", "content": system})
    if history:
        messages.extend(history[-10:])
    messages.append({"role": "user", "content": prompt})
    try:
        response = ollama.chat(model=model, messages=messages, options=OPTIONS)
        return response["message"]["content"]
    except Exception as e:
        raise RuntimeError(f"Ollama error: {e}")

def ask_stream(model, prompt, history=None, model_key="general", debate_phase=None):
    messages = []
    system = DEBATE_PROMPTS.get(debate_phase) if debate_phase else SYSTEM_PROMPTS.get(model_key, SYSTEM_PROMPTS["general"])
    messages.append({"role": "system", "content": system})
    if history:
        messages.extend(history[-10:])
    messages.append({"role": "user", "content": prompt})
    try:
        for chunk in ollama.chat(model=model, messages=messages, stream=True, options=OPTIONS):
            text = chunk.get("message", {}).get("content", "")
            if text:
                yield text
    except Exception as e:
        yield f"[Error: {e}]"

def warmup():
    print("Warming up models...")
    for name, model in MODELS.items():
        try:
            ollama.chat(model=model, messages=[{"role": "user", "content": "hi"}], options=OPTIONS)
            print(f"  OK {model} ready")
        except Exception as e:
            print(f"  FAIL {model}: {e}")
'''

files["core/manager.py"] = '''import asyncio
import json
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=8)
memory = {}
user_profiles = {}

def get_history(session_id):
    return memory.get(session_id, [])

def update_profile(session_id, prompt):
    if session_id not in user_profiles:
        user_profiles[session_id] = {"name": "Kiran", "message_count": 0, "topics": []}
    p = user_profiles[session_id]
    p["message_count"] += 1
    for kw, topic in {"python":"Python","javascript":"JavaScript","code":"coding","ml":"ML","ai":"AI"}.items():
        if kw in prompt.lower() and topic not in p["topics"]:
            p["topics"].append(topic)

def build_context_prompt(prompt, session_id):
    profile = user_profiles.get(session_id, {})
    if not profile:
        return prompt
    topics = ", ".join(profile.get("topics", [])) or "general"
    return f"[User: Kiran | Interests: {topics}]\\n{prompt}"

def save_to_memory(session_id, user_prompt, response):
    if session_id not in memory:
        memory[session_id] = []
    memory[session_id].append({"role": "user", "content": user_prompt})
    memory[session_id].append({"role": "assistant", "content": str(response)})
    if len(memory[session_id]) > 20:
        memory[session_id] = memory[session_id][-20:]

def clear_memory(session_id):
    memory.pop(session_id, None)
    user_profiles.pop(session_id, None)

def _ask(model_key, prompt, history=None, debate_phase=None):
    from core.models import ask, MODELS
    return ask(MODELS[model_key], prompt, history, model_key, debate_phase)

def _ask_stream(model_key, prompt, history=None, debate_phase=None):
    from core.models import ask_stream, MODELS
    return ask_stream(MODELS[model_key], prompt, history, model_key, debate_phase)

async def run(agent, prompt, session_id="default"):
    history = get_history(session_id)
    loop = asyncio.get_event_loop()
    update_profile(session_id, prompt)
    enriched = build_context_prompt(prompt, session_id)
    try:
        if agent == "code":
            result = await loop.run_in_executor(executor, lambda: _ask("coder", enriched, history))
            save_to_memory(session_id, prompt, result)
            return {"agent": "code", "result": result}
        if agent == "research":
            r1, r2 = await asyncio.gather(
                loop.run_in_executor(executor, lambda: _ask("general", enriched, history)),
                loop.run_in_executor(executor, lambda: _ask("reason", enriched, history)),
            )
            result = r1 + "\\n\\nAnalysis:\\n" + r2
            save_to_memory(session_id, prompt, result)
            return {"agent": "research", "result": result}
        if agent == "debate":
            from agents.debate import run_debate
            from agents.vote import vote
            initial, critiques, rewrites = await loop.run_in_executor(executor, lambda: run_debate(enriched, history))
            winner, votes, best_text = await loop.run_in_executor(executor, lambda: vote(prompt, rewrites))
            save_to_memory(session_id, prompt, best_text)
            return {"agent":"debate","initial":initial,"critiques":critiques,"rewrites":rewrites,"winner":winner,"votes":votes,"best_answer":best_text}
        return {"agent": agent, "error": f"Unknown agent: {agent}"}
    except Exception as e:
        return {"agent": agent, "error": str(e)}

async def stream_run(agent, prompt, session_id="default"):
    history = get_history(session_id)
    loop = asyncio.get_event_loop()
    update_profile(session_id, prompt)
    enriched = build_context_prompt(prompt, session_id)
    def ev(data):
        return f"data: {json.dumps(data)}\\n\\n"
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
            save_to_memory(session_id, prompt, part1 + "\\n\\n" + part2)
            yield ev({"type": "done"})
        elif agent == "debate":
            yield ev({"type": "phase", "phase": "research", "text": "PHASE 1 - RESEARCH"})
            research = {}
            for model_key, label in [("general","LLAMA3"),("reason","MISTRAL"),("analysis","QWEN")]:
                yield ev({"type": "model_start", "model": label, "phase": "research"})
                text = ""
                for chunk in _ask_stream(model_key, enriched, history, debate_phase="research"):
                    text += chunk
                    yield ev({"type": "chunk", "text": chunk})
                research[label] = text
                yield ev({"type": "model_end", "model": label})
            yield ev({"type": "phase", "phase": "critique", "text": "PHASE 2 - CRITIQUE"})
            critiques = {}
            for model_key, label in [("general","LLAMA3"),("reason","MISTRAL"),("analysis","QWEN")]:
                others = "\\n\\n".join(f"[{n}]:\\n{a}" for n,a in research.items() if n != label)
                cp = (f"Question: {prompt}\\n\\nYour answer:\\n{research[label]}\\n\\n"
                      f"Other models answered:\\n{others}\\n\\n"
                      "Point out specific factual mistakes and weak reasoning in the OTHER models answers. Use bullet points.")
                yield ev({"type": "model_start", "model": label, "phase": "critique"})
                text = ""
                for chunk in _ask_stream(model_key, cp, None, debate_phase="critique"):
                    text += chunk
                    yield ev({"type": "chunk", "text": chunk})
                critiques[label] = text
                yield ev({"type": "model_end", "model": label})
            yield ev({"type": "phase", "phase": "rewrite", "text": "PHASE 3 - REWRITE"})
            rewrites = {}
            for model_key, label in [("general","LLAMA3"),("reason","MISTRAL"),("analysis","QWEN")]:
                received = "\\n\\n".join(f"[{n} criticized you]:\\n{c}" for n,c in critiques.items() if n != label)
                rp = (f"Question: {prompt}\\n\\nYour original answer:\\n{research[label]}\\n\\n"
                      f"Other models criticized you:\\n{received}\\n\\n"
                      "Rewrite your answer. Fix valid mistakes. Make it the best answer possible.")
                yield ev({"type": "model_start", "model": label, "phase": "rewrite"})
                text = ""
                for chunk in _ask_stream(model_key, rp, None, debate_phase="rewrite"):
                    text += chunk
                    yield ev({"type": "chunk", "text": chunk})
                rewrites[label] = text
                yield ev({"type": "model_end", "model": label})
            yield ev({"type": "phase", "phase": "vote", "text": "PHASE 4 - VOTING"})
            yield ev({"type": "voting"})
            from agents.vote import vote as do_vote
            winner, votes, best_text = await loop.run_in_executor(executor, lambda: do_vote(prompt, rewrites))
            save_to_memory(session_id, prompt, best_text)
            yield ev({"type": "best", "text": best_text, "winner": winner, "votes": str(votes)})
            yield ev({"type": "done"})
        else:
            yield ev({"type": "error", "text": f"Unknown agent: {agent}"})
    except Exception as e:
        yield ev({"type": "error", "text": str(e)})
'''

# Write all files
for path, content in files.items():
    full_path = os.path.join(BASE, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"WRITTEN: {path}")

print("\nALL FILES UPDATED! Now restart uvicorn.")
