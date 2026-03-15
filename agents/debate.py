from core.models import ask, MODELS
 
def debate(question, history=None):
    answers = {}
    answers["llama3"]  = ask(MODELS["general"],  question, history)
    answers["mistral"] = ask(MODELS["reason"],   question, history)
    answers["qwen"]    = ask(MODELS["analysis"], question, history)
    return answers