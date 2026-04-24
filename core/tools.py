"""
core/tools.py — All agent tools: file, shell, web, memory, code execution
"""
import os, subprocess, datetime, re, json
from pathlib import Path

BASE = Path(__file__).parent.parent

# ── File Tools ────────────────────────────────────────────────────────────────
def file_read(path):
    try:
        p = Path(path).expanduser()
        return {"success": True, "result": p.read_text(encoding="utf-8", errors="replace")}
    except Exception as e:
        return {"success": False, "error": str(e)}

def file_write(path, content, mode="w"):
    try:
        p = Path(path).expanduser()
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, mode, encoding="utf-8") as f:
            f.write(content)
        return {"success": True, "result": f"Written {len(content)} chars to {p}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def file_list(path="."):
    try:
        items = [{"name": i.name, "type": "dir" if i.is_dir() else "file",
                  "size": i.stat().st_size if i.is_file() else None}
                 for i in sorted(Path(path).expanduser().iterdir())]
        return {"success": True, "result": items}
    except Exception as e:
        return {"success": False, "error": str(e)}

def file_delete(path):
    try:
        Path(path).expanduser().unlink()
        return {"success": True, "result": f"Deleted {path}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

# ── Shell Tool ────────────────────────────────────────────────────────────────
def shell_exec(command, cwd=None, timeout=30):
    try:
        r = subprocess.run(command, shell=True, capture_output=True,
                           text=True, timeout=timeout, cwd=cwd)
        return {"success": r.returncode == 0, "stdout": r.stdout,
                "stderr": r.stderr, "returncode": r.returncode}
    except subprocess.TimeoutExpired:
        return {"success": False, "error": f"Timed out after {timeout}s"}
    except Exception as e:
        return {"success": False, "error": str(e)}

# ── Code Execution Tool ───────────────────────────────────────────────────────
def code_exec(code, language="python"):
    """Write code to temp file and execute it."""
    import tempfile
    suffix = {"python": ".py", "js": ".js", "bash": ".sh"}.get(language, ".py")
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix=suffix, delete=False, encoding='utf-8') as f:
            f.write(code)
            tmp = f.name
        if language == "python":
            result = shell_exec(f"python {tmp}", timeout=60)
        elif language == "bash":
            result = shell_exec(f"bash {tmp}", timeout=60)
        else:
            result = shell_exec(f"node {tmp}", timeout=60)
        os.unlink(tmp)
        return result
    except Exception as e:
        return {"success": False, "error": str(e)}

# ── Memory Tools ──────────────────────────────────────────────────────────────
MEMORY_FILE = BASE / "memory" / "MEMORY.md"
SOUL_FILE   = BASE / "memory" / "SOUL.md"
AGENTS_FILE = BASE / "memory" / "AGENTS.md"

def memory_read():
    return file_read(str(MEMORY_FILE))

def soul_read():
    return file_read(str(SOUL_FILE))

def agents_log_read():
    return file_read(str(AGENTS_FILE))

def memory_append(entry, section="Recent Context"):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    new_line = f"\n- [{ts}] {entry}"
    try:
        txt = MEMORY_FILE.read_text(encoding="utf-8")
        marker = f"## {section}"
        idx = txt.find(marker)
        if idx != -1:
            insert_at = txt.find("\n", idx) + 1
            txt = txt[:insert_at] + new_line + txt[insert_at:]
        else:
            txt += f"\n\n## {section}{new_line}"
        MEMORY_FILE.write_text(txt, encoding="utf-8")
        return {"success": True, "result": "Memory updated"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def agents_log_append(entry):
    return memory_append(entry, section="Completed Tasks") if True else file_write(
        str(AGENTS_FILE), f"\n- {entry}", mode="a")

# ── Web Fetch Tool ────────────────────────────────────────────────────────────
def web_fetch(url):
    try:
        import urllib.request
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (kirannn-agent/1.0)"
        })
        with urllib.request.urlopen(req, timeout=12) as r:
            raw = r.read().decode("utf-8", errors="replace")
        text = re.sub(r"<script[^>]*>.*?</script>", " ", raw, flags=re.DOTALL)
        text = re.sub(r"<style[^>]*>.*?</style>", " ", text, flags=re.DOTALL)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        return {"success": True, "result": text[:6000], "url": url}
    except Exception as e:
        return {"success": False, "error": str(e)}

def web_search(query, num=5):
    """Search DuckDuckGo and return result snippets."""
    try:
        import urllib.parse, urllib.request
        q = urllib.parse.quote(query)
        url = f"https://html.duckduckgo.com/html/?q={q}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=12) as r:
            html = r.read().decode("utf-8", errors="replace")
        # Extract result links + snippets
        links = re.findall(r'href="(https?://[^"]+)"', html)
        snippets = re.findall(r'class="result__snippet"[^>]*>(.*?)</a>', html, re.DOTALL)
        snippets = [re.sub(r"<[^>]+>", "", s).strip() for s in snippets[:num]]
        links = [l for l in links if "duckduckgo" not in l][:num]
        return {"success": True, "results": list(zip(links, snippets)), "query": query}
    except Exception as e:
        return {"success": False, "error": str(e)}

# ── Report Tool ───────────────────────────────────────────────────────────────
def save_report(title, content):
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M")
    fname = BASE / "reports" / f"{ts}_{title[:30].replace(' ','_')}.md"
    fname.parent.mkdir(parents=True, exist_ok=True)
    fname.write_text(content, encoding="utf-8")
    return {"success": True, "result": str(fname), "path": str(fname)}

def list_reports():
    d = BASE / "reports"
    d.mkdir(exist_ok=True)
    return {"success": True, "result": [f.name for f in sorted(d.iterdir()) if f.suffix == ".md"]}

# ── Tool Registry ─────────────────────────────────────────────────────────────
TOOLS = {
    "file_read":      (file_read,      ["path"],            "Read a file"),
    "file_write":     (file_write,     ["path","content"],  "Write content to a file"),
    "file_list":      (file_list,      ["path"],            "List directory contents"),
    "file_delete":    (file_delete,    ["path"],            "Delete a file"),
    "shell_exec":     (shell_exec,     ["command"],         "Run a shell/terminal command"),
    "code_exec":      (code_exec,      ["code"],            "Execute Python/bash code"),
    "memory_read":    (memory_read,    [],                  "Read agent long-term memory"),
    "memory_append":  (memory_append,  ["entry"],           "Save something to memory"),
    "soul_read":      (soul_read,      [],                  "Read agent identity & user prefs"),
    "web_fetch":      (web_fetch,      ["url"],             "Fetch a webpage as text"),
    "web_search":     (web_search,     ["query"],           "Search DuckDuckGo for a query"),
    "save_report":    (save_report,    ["title","content"], "Save a report to disk"),
    "list_reports":   (list_reports,   [],                  "List saved reports"),
}

def call_tool(name, **kwargs):
    if name not in TOOLS:
        return {"success": False, "error": f"Unknown tool: {name}"}
    try:
        return TOOLS[name][0](**kwargs)
    except Exception as e:
        return {"success": False, "error": str(e)}

def tools_manifest():
    lines = ["TOOLS (call by responding with JSON: {\"tool\":\"name\",\"args\":{...}}):"]
    for name, (_, args, desc) in TOOLS.items():
        lines.append(f"  {name}({', '.join(args)}) — {desc}")
    return "\n".join(lines)