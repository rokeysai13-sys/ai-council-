from core.models import ask, MODELS

def vote(question, answers):
    formatted = "\n\n".join(f"[{name}]:\n{ans}" for name, ans in answers.items())
    vote_prompt = (
        f"Question: {question}\n\n"
        f"Final answers after debate:\n{formatted}\n\n"
        "Which answer is most accurate, complete and helpful?\n"
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