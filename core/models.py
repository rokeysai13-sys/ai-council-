import ollama

MODELS = {
    "coder":    "deepseek-coder:6.7b",
    "general":  "llama3",
    "reason":   "mistral",
    "analysis": "qwen2.5:7b"
}

OPTIONS = {
    "num_ctx": 2048,
    "num_gpu": 99,
    "num_thread": 8,
    "temperature": 0.7,
}

# Personality + brevity injected into every request
SYSTEM_PROMPTS = {
    "coder": (
        "You are Kiran's personal coding assistant. "
        "Give short, clean, working code. No long explanations unless asked. "
        "Use comments only where necessary. Be direct and efficient."
    ),
    "general": (
        "You are Kiran's AI assistant. Be concise — max 3-4 sentences unless asked for more. "
        "No filler phrases like 'Great question!' or 'Certainly!'. Get straight to the point."
    ),
    "reason": (
        "You are a sharp reasoning engine for Kiran. "
        "Give the most accurate answer in as few words as possible. No padding."
    ),
    "analysis": (
        "You are Kiran's analyst. Pick the single best answer and explain it in 2-3 sentences max. "
        "Be decisive. No 'it depends' without a clear recommendation."
    ),
}


def ask(model, prompt, history=None, model_key="general"):
    messages = []
    # Add system prompt for personality
    system = SYSTEM_PROMPTS.get(model_key, SYSTEM_PROMPTS["general"])
    messages.append({"role": "system", "content": system})
    if history:
        messages.extend(history[-10:])  # last 10 messages only for speed
    messages.append({"role": "user", "content": prompt})
    try:
        response = ollama.chat(model=model, messages=messages, options=OPTIONS)
        return response["message"]["content"]
    except Exception as e:
        raise RuntimeError(f"Ollama error: {e}")


def ask_stream(model, prompt, history=None, model_key="general"):
    messages = []
    system = SYSTEM_PROMPTS.get(model_key, SYSTEM_PROMPTS["general"])
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