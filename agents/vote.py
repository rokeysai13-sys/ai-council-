from core.models import ask, MODELS

def vote(question, answers):

    voting_prompt = f"""
Question: {question}

Answers:
{answers}

Choose the best answer and explain shortly.
Return only the best answer.
"""

    result = ask(MODELS["analysis"], voting_prompt)

    return result