from core.models import ask, MODELS
 
def research(query, history=None):
    summary   = ask(MODELS["general"], query, history)
    reasoning = ask(MODELS["reason"],  query, history)
    return summary + "\n\nAnalysis:\n" + reasoning
