from core.logger import logger
import requests
import json
import os
import hashlib
import threading
from config.loader import cfg

# Thread-local storage for active mission tracking
_local_state = threading.local()

def set_active_mission_id(mission_id: str):
    _local_state.mission_id = mission_id

def get_active_mission_id() -> str:
    return getattr(_local_state, "mission_id", None)

# Simple in-memory cache for LLM outputs
_llm_cache = {}

class LlmResponse(str):
    def __new__(cls, value, prompt_tokens=0, completion_tokens=0, model=""):
        obj = str.__new__(cls, value)
        obj.prompt_tokens = prompt_tokens
        obj.completion_tokens = completion_tokens
        obj.model = model
        return obj

    def get(self, key, default=None):
        if key == "response":
            return str(self)
        if key == "prompt_tokens":
            return self.prompt_tokens
        if key == "completion_tokens":
            return self.completion_tokens
        if key == "model":
            return self.model
        return default

def _emit_token_usage_if_active(res: LlmResponse):
    mission_id = get_active_mission_id()
    if mission_id:
        try:
            from core.event_store import event_store
            event_store.emit(
                "agent.llm_usage", 
                "system", 
                {
                    "tokens_in": res.prompt_tokens,
                    "tokens_out": res.completion_tokens,
                    "model": res.model
                },
                mission_id=mission_id
            )
        except Exception as e:
            logger.warning(f"[LLM] Failed to emit LLM token usage: {e}")

def _get_cache_key(model: str, system: str, prompt: str, options: dict) -> str:
    key_src = f"{model}:{system}:{prompt}:{json.dumps(options or {}, sort_keys=True)}"
    return hashlib.sha256(key_src.encode("utf-8")).hexdigest()

def get_available_ollama_models():
    """Fetch the list of locally pulled Ollama models."""
    try:
        ollama_url = cfg("models", "ollama_url", default="http://localhost:11434")
        r = requests.get(f"{ollama_url}/api/tags", timeout=3)
        if r.status_code == 200:
            return [m["name"] for m in r.json().get("models", [])]
    except Exception as e:
        logger.warning(f"[LLM] Failed to check available Ollama models: {e}")
    return []

def llm_generate(prompt: str, model: str = None, system: str = "", stream: bool = False, options: dict = None, timeout: int = 90):
    """
    Unified LLM generation function.
    Routes to Ollama (local) or falls back to cloud providers (OpenAI/Gemini) if configured or if model prefix matches.
    Automatically handles offline models by routing to available local options.
    """
    if model is None:
        model = cfg("models", "fallback", default="llama3")

    options = options or {}
    
    # Check if we should use a cloud model based on prefix
    is_openai = model.startswith("gpt-")
    is_gemini = model.startswith("gemini-")
    
    # Check cache first
    cache_enabled = cfg("cache", "enabled", default=True)
    cache_key = _get_cache_key(model, system, prompt, options)
    
    if cache_enabled and cache_key in _llm_cache:
        logger.info(f"[LLM CACHE] Hit for model '{model}'")
        cached_val = _llm_cache[cache_key]
        res_val = LlmResponse(
            cached_val.get("response", ""),
            prompt_tokens=cached_val.get("prompt_tokens", 0),
            completion_tokens=cached_val.get("completion_tokens", 0),
            model=cached_val.get("model", model)
        )
        _emit_token_usage_if_active(res_val)
        return res_val
        
    if is_openai:
        result = _call_openai(model, system, prompt, options, timeout)
        if cache_enabled and "response" in result:
            _llm_cache[cache_key] = result
        res_val = LlmResponse(
            result.get("response", ""),
            prompt_tokens=result.get("prompt_tokens", 0),
            completion_tokens=result.get("completion_tokens", 0),
            model=result.get("model", model)
        )
        _emit_token_usage_if_active(res_val)
        return res_val
    elif is_gemini:
        result = _call_gemini(model, system, prompt, options, timeout)
        if cache_enabled and "response" in result:
            _llm_cache[cache_key] = result
        res_val = LlmResponse(
            result.get("response", ""),
            prompt_tokens=result.get("prompt_tokens", 0),
            completion_tokens=result.get("completion_tokens", 0),
            model=result.get("model", model)
        )
        _emit_token_usage_if_active(res_val)
        return res_val
        
    # Default to Ollama (Local)
    ollama_url = cfg("models", "ollama_url", default="http://localhost:11434") + "/api/generate"
    
    # Dynamic Model Routing: Ensure the requested model exists locally
    available = get_available_ollama_models()
    if available:
        if model not in available:
            # Try to match the base model name (e.g. "llama3" from "llama3:latest")
            base_model = model.split(":")[0]
            matched = next((m for m in available if m.startswith(base_model) or base_model in m), None)
            
            if matched:
                logger.info(f"[LLM] Model '{model}' not found. Routing to matched local model: '{matched}'")
                model = matched
            else:
                # Bypassing embedding models to find a text generation model
                non_embed = [m for m in available if "embed" not in m]
                fallback = non_embed[0] if non_embed else available[0]
                logger.info(f"[LLM] Model '{model}' not found. Routing to fallback local model: '{fallback}'")
                model = fallback
 
    try:
        r = requests.post(ollama_url, json={
            "model": model,
            "system": system,
            "prompt": prompt,
            "stream": stream,
            "options": options
        }, timeout=timeout)
        r.raise_for_status()
        result = r.json()
        
        prompt_tokens = result.get("prompt_eval_count", 0)
        completion_tokens = result.get("eval_count", 0)
        resp_text = result.get("response", "")
        
        # Save cache
        if cache_enabled:
            _llm_cache[cache_key] = {
                "response": resp_text,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "model": model
            }
            
        res_val = LlmResponse(resp_text, prompt_tokens=prompt_tokens, completion_tokens=completion_tokens, model=model)
        _emit_token_usage_if_active(res_val)
        return res_val
    except requests.exceptions.RequestException as e:
        # Fallback to cloud if Ollama fails and fallback is enabled
        fallback_model = cfg("models", "cloud_fallback_model", default="")
        if fallback_model:
            logger.error(f"[LLM] Ollama failed ({e}), falling back to {fallback_model}")
            if fallback_model.startswith("gpt-"):
                res_val = _call_openai(fallback_model, system, prompt, options, timeout)
                res_obj = LlmResponse(
                    res_val.get("response", ""),
                    prompt_tokens=res_val.get("prompt_tokens", 0),
                    completion_tokens=res_val.get("completion_tokens", 0),
                    model=res_val.get("model", fallback_model)
                )
                _emit_token_usage_if_active(res_obj)
                return res_obj
            elif fallback_model.startswith("gemini-"):
                res_val = _call_gemini(fallback_model, system, prompt, options, timeout)
                res_obj = LlmResponse(
                    res_val.get("response", ""),
                    prompt_tokens=res_val.get("prompt_tokens", 0),
                    completion_tokens=res_val.get("completion_tokens", 0),
                    model=res_val.get("model", fallback_model)
                )
                _emit_token_usage_if_active(res_obj)
                return res_obj
        raise Exception(f"Ollama request failed and no fallback available: {e}")

def _call_openai(model: str, system: str, prompt: str, options: dict, timeout: int) -> dict:
    api_key = cfg("api_keys", "openai", default=os.getenv("OPENAI_API_KEY"))
    if not api_key:
        raise ValueError("OpenAI API key missing. Please set it in config or OPENAI_API_KEY env.")
    
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    temperature = options.get("temperature", 0.7)
    
    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt}
        ],
        "temperature": temperature
    }
    
    if "stop" in options:
        data["stop"] = options["stop"]
        
    r = requests.post(url, headers=headers, json=data, timeout=timeout)
    r.raise_for_status()
    resp = r.json()
    
    content = resp["choices"][0]["message"]["content"]
    prompt_tokens = resp.get("usage", {}).get("prompt_tokens", 0)
    completion_tokens = resp.get("usage", {}).get("completion_tokens", 0)
    return {
        "response": content,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "model": resp.get("model", model)
    }

def _call_gemini(model: str, system: str, prompt: str, options: dict, timeout: int) -> dict:
    api_key = cfg("api_keys", "gemini", default=os.getenv("GEMINI_API_KEY"))
    if not api_key:
        raise ValueError("Gemini API key missing. Please set it in config or GEMINI_API_KEY env.")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    
    temperature = options.get("temperature", 0.7)
    
    data = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}]
            }
        ],
        "systemInstruction": {
            "parts": [{"text": system}]
        },
        "generationConfig": {
            "temperature": temperature
        }
    }
    
    if "stop" in options:
        data["generationConfig"]["stopSequences"] = options["stop"]
        
    r = requests.post(url, headers={"Content-Type": "application/json"}, json=data, timeout=timeout)
    r.raise_for_status()
    resp = r.json()
    
    try:
        content = resp["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        content = ""
        
    prompt_tokens = resp.get("usageMetadata", {}).get("promptTokenCount", 0)
    completion_tokens = resp.get("usageMetadata", {}).get("candidatesTokenCount", 0)
    return {
        "response": content,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "model": model
    }
