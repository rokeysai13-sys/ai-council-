import urllib.request
import urllib.parse
import json
import re

def search_web(query, max_results=3):
    """Search DuckDuckGo instant answers API — no API key needed."""
    try:
        encoded = urllib.parse.quote(query)
        url = f"https://api.duckduckgo.com/?q={encoded}&format=json&no_html=1&skip_disambig=1"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=8) as r:
            data = json.loads(r.read().decode())

        results = []

        # Abstract (main answer)
        if data.get("AbstractText"):
            results.append({
                "title": data.get("Heading", ""),
                "snippet": data["AbstractText"][:500],
                "url": data.get("AbstractURL", "")
            })

        # Related topics
        for topic in data.get("RelatedTopics", [])[:max_results]:
            if isinstance(topic, dict) and topic.get("Text"):
                results.append({
                    "title": topic.get("Name", ""),
                    "snippet": topic["Text"][:300],
                    "url": topic.get("FirstURL", "")
                })

        if results:
            return results

        # Fallback: DuckDuckGo HTML search
        return _html_search(query, max_results)

    except Exception as e:
        return [{"title": "Search error", "snippet": str(e), "url": ""}]


def _html_search(query, max_results=3):
    """Fallback search via DuckDuckGo HTML."""
    try:
        encoded = urllib.parse.quote(query)
        url = f"https://html.duckduckgo.com/html/?q={encoded}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=8) as r:
            html = r.read().decode("utf-8", errors="ignore")

        # Extract snippets
        snippets = re.findall(r'class="result__snippet">(.*?)</a>', html)
        titles = re.findall(r'class="result__title".*?>(.*?)</a>', html)

        results = []
        for i in range(min(max_results, len(snippets))):
            snippet = re.sub(r'<[^>]+>', '', snippets[i]).strip()
            title = re.sub(r'<[^>]+>', '', titles[i]).strip() if i < len(titles) else ""
            if snippet:
                results.append({"title": title, "snippet": snippet, "url": ""})

        return results if results else [{"title": "No results", "snippet": "Could not find search results.", "url": ""}]
    except Exception as e:
        return [{"title": "Search failed", "snippet": str(e), "url": ""}]


def format_search_results(results):
    """Format results for injection into model prompt."""
    if not results:
        return "No search results found."
    parts = []
    for i, r in enumerate(results, 1):
        parts.append(f"[Result {i}] {r['title']}\n{r['snippet']}")
    return "\n\n".join(parts)


def search_and_inject(query, prompt):
    """Search web and inject results into prompt."""
    results = search_web(query, max_results=3)
    formatted = format_search_results(results)
    return (
        f"Web search results for '{query}':\n\n"
        f"{formatted}\n\n"
        f"---\n"
        f"Using the above search results as context, answer this:\n{prompt}"
    )