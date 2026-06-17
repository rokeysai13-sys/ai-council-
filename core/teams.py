"""
core/teams.py — Agent Team Presets & Roster Definitions
"""

ROSTER = {
    "researcher": {
        "name": "Researcher Agent",
        "role": "Researcher",
        "description": "Searches the web, extracts key facts, and gathers raw source materials.",
        "budget": 10,
        "priority": "high",
        "color": "var(--agent-researcher)"
    },
    "coder": {
        "name": "Coder Agent",
        "role": "Programmer",
        "description": "Writes clean, working Python/HTML/JS code and runs execution checks.",
        "budget": 12,
        "priority": "high",
        "color": "var(--agent-coder)"
    },
    "analyst": {
        "name": "Analyst Agent",
        "role": "Analyst",
        "description": "Synthesizes data, scores confidence levels, and identifies patterns.",
        "budget": 8,
        "priority": "medium",
        "color": "var(--agent-analyst)"
    },
    "writer": {
        "name": "Writer Agent",
        "role": "Technical Writer",
        "description": "Produces polished, publication-ready reports in structured markdown.",
        "budget": 8,
        "priority": "medium",
        "color": "var(--agent-writer)"
    },
    "shell": {
        "name": "Shell Agent",
        "role": "Admin",
        "description": "Executes shell commands and manages files to verify outcomes.",
        "budget": 8,
        "priority": "medium",
        "color": "var(--agent-shell)"
    },
    "critic": {
        "name": "Critic Agent",
        "role": "Quality Control",
        "description": "Reviews outputs strictly, scoring completions and proposing revisions.",
        "budget": 8,
        "priority": "low",
        "color": "var(--agent-critic)"
    },
    "security": {
        "name": "Security Agent",
        "role": "Auditor",
        "description": "Reviews the implementation and designs for potential security flaws.",
        "budget": 8,
        "priority": "low",
        "color": "var(--agent-security)"
    }
}

TEAMS = {
    "engineering": {
        "name": "Engineering Squad",
        "description": "Specializes in software design, implementation, and code evaluation.",
        "agents": ["researcher", "coder", "analyst", "writer", "critic"],
    },
    "research": {
        "name": "Research Team",
        "description": "Focused on data aggregation, fact extraction, and report writing.",
        "agents": ["researcher", "analyst", "writer"],
    },
    "devops": {
        "name": "DevOps Crew",
        "description": "Handles deployment scripting, shell tasks, and automation.",
        "agents": ["coder", "shell"],
    },
}
