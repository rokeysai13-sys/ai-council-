from core.models import ask, MODELS
 
def code(prompt, history=None):
    return ask(MODELS["coder"], prompt, history)