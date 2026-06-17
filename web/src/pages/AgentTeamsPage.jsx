import React, { useState, useEffect } from 'react';
import AgentCard from '../components/agents/AgentCard';
import CouncilVote from '../components/agents/CouncilVote';
import { decisionsService, missionsService } from '../services/api';
import useEventStream from '../hooks/useEventStream';
import { Users, Code, Search, Settings, AlertCircle, Award } from 'lucide-react';

const ROSTER_INFOS = {
  "researcher": {
    name: "Researcher Agent",
    role: "Researcher",
    description: "Searches the web, extracts key facts, and gathers raw source materials.",
    budget: 10,
    priority: "high",
    color: "#10b981"
  },
  "coder": {
    name: "Coder Agent",
    role: "Programmer",
    description: "Writes clean, working Python/HTML/JS code and runs execution checks.",
    budget: 12,
    priority: "high",
    color: "#8b5cf6"
  },
  "analyst": {
    name: "Analyst Agent",
    role: "Analyst",
    description: "Synthesizes data, scores confidence levels, and identifies patterns.",
    budget: 8,
    priority: "medium",
    color: "#f59e0b"
  },
  "writer": {
    name: "Writer Agent",
    role: "Technical Writer",
    description: "Produces polished, publication-ready reports in structured markdown.",
    budget: 8,
    priority: "medium",
    color: "#ec4899"
  },
  "shell": {
    name: "Shell Agent",
    role: "Admin",
    description: "Executes shell commands and manages files to verify outcomes.",
    budget: 8,
    priority: "medium",
    color: "#a3a3a3"
  },
  "critic": {
    name: "Critic Agent",
    role: "Quality Control",
    description: "Reviews outputs strictly, scoring completions and proposing revisions.",
    budget: 8,
    priority: "low",
    color: "#ef4444"
  },
  "security": {
    name: "Security Agent",
    role: "Auditor",
    description: "Reviews the implementation and designs for potential security flaws.",
    budget: 8,
    priority: "low",
    color: "#06b6d4"
  }
};

const TEAMS_CONFIG = {
  "engineering": {
    id: "engineering",
    name: "Engineering Squad",
    description: "Specializes in software design, implementation, and code evaluation.",
    agents: ["researcher", "coder", "analyst", "writer", "critic"],
    icon: <Code size={18} />
  },
  "research": {
    id: "research",
    name: "Research Team",
    description: "Focused on data aggregation, fact extraction, and report writing.",
    agents: ["researcher", "analyst", "writer"],
    icon: <Search size={18} />
  },
  "devops": {
    id: "devops",
    name: "DevOps Crew",
    description: "Handles deployment scripting, shell tasks, and automation.",
    agents: ["coder", "shell"],
    icon: <Settings size={18} />
  }
};

export default function AgentTeamsPage() {
  const [selectedTeam, setSelectedTeam] = useState('engineering');
  const [decisions, setDecisions] = useState([]);
  const [loadingDecisions, setLoadingDecisions] = useState(false);
  const [runningMission, setRunningMission] = useState(null);
  
  // Connect to the event stream for agent visibility
  const { events } = useEventStream(runningMission?.id);

  // Fetch active running mission and decisions history
  useEffect(() => {
    async function loadData() {
      setLoadingDecisions(true);
      try {
        // Fetch decisions history
        const decRes = await decisionsService.getDecisions();
        setDecisions(decRes.decisions || []);

        // Fetch missions to see if any are running
        const missRes = await missionsService.getMissions();
        const missionsList = missRes.missions || [];
        const running = missionsList.find(m => m.status === 'running');
        if (running) {
          setRunningMission(running);
        }
      } catch (err) {
        console.error('Failed to load AgentTeamsPage data:', err);
      } finally {
        setLoadingDecisions(false);
      }
    }
    loadData();
  }, []);

  // Dynamically compute agent status from the event stream
  const getAgentStateAndStats = (agentKey) => {
    const defaultAgentInfo = ROSTER_INFOS[agentKey];
    if (!defaultAgentInfo) return { state: 'IDLE', action: '', stats: { tools: 0, writes: 0, messages: 0 }, history: [] };

    // Filter events related to this agent. Note that agent name might be the key or display name.
    const displayName = defaultAgentInfo.name;
    const roleKey = defaultAgentInfo.role;
    
    const agentEvents = events.filter(e => 
      e.agent_id === displayName || 
      e.agent_id === agentKey || 
      e.agent_id?.toLowerCase() === roleKey.toLowerCase()
    );

    // Initial state values
    let state = 'IDLE';
    let action = '';
    let toolCount = 0;
    let writeCount = 0;
    let messageCount = 0;
    const history = [];

    // Parse events sequentially
    agentEvents.forEach(evt => {
      if (evt.type === 'agent.state_change') {
        const nextState = (evt.payload?.to || 'IDLE').toUpperCase();
        state = nextState;
        if (!history.includes(nextState)) {
          history.push(nextState);
        }
      } else if (evt.type === 'agent.thinking') {
        state = 'THINKING';
        action = evt.payload?.thought || '';
      } else if (evt.type === 'agent.tool_call') {
        state = 'EXECUTING';
        action = `Invoking tool: ${evt.payload?.tool}`;
        toolCount++;
      } else if (evt.type === 'agent.tool_result') {
        state = 'THINKING';
        action = `Completed tool: ${evt.payload?.tool}`;
      } else if (evt.type === 'agent.memory_write') {
        action = `Wrote to blackboard key: ${evt.payload?.key}`;
        writeCount++;
      } else if (evt.type === 'agent.message') {
        action = `Sent message to: ${evt.payload?.to}`;
        messageCount++;
      }
    });

    // If the mission has finished
    if (runningMission && (runningMission.status === 'completed' || runningMission.status === 'failed')) {
      state = runningMission.status === 'completed' ? 'COMPLETED' : 'FAILED';
    }

    return {
      state,
      action,
      stats: { tools: toolCount, writes: writeCount, messages: messageCount },
      history: history.length > 0 ? history : ['IDLE']
    };
  };

  const currentTeamInfo = TEAMS_CONFIG[selectedTeam];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Top Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={24} color="var(--accent)" />
            Agent Swarm & Preset Teams
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Configure agent compositions, view real-time status transitions, and inspect council vote consensus.
          </p>
        </div>
      </div>

      {/* Preset team selectors */}
      <div style={{
        display: 'flex',
        gap: '12px',
        borderBottom: '1px solid var(--surface-border)',
        paddingBottom: '16px'
      }}>
        {Object.values(TEAMS_CONFIG).map((team) => {
          const isActive = selectedTeam === team.id;
          return (
            <button
              key={team.id}
              onClick={() => setSelectedTeam(team.id)}
              className="apple-btn"
              style={{
                background: isActive ? 'var(--accent)' : 'var(--bg-elevated)',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${isActive ? 'var(--accent)' : 'var(--surface-border)'}`,
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'background 0.2s, color 0.2s'
              }}
            >
              {team.icon}
              {team.name}
            </button>
          );
        })}
      </div>

      {/* Selected Team Description */}
      <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)' }}>
        <h4 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0' }}>
          {currentTeamInfo.name} Configuration
        </h4>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
          {currentTeamInfo.description} Includes {currentTeamInfo.agents.length} active roles.
        </p>
      </div>

      {/* Grid of Agent Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {currentTeamInfo.agents.map((agentKey) => {
          const agentConfig = ROSTER_INFOS[agentKey];
          const dynamicData = getAgentStateAndStats(agentKey);
          return (
            <AgentCard
              key={agentKey}
              agent={{
                name: agentConfig.name,
                role: agentConfig.role,
                role_description: agentConfig.description,
                priority: agentConfig.priority,
                budget: agentConfig.budget,
                color: agentConfig.color
              }}
              currentState={dynamicData.state}
              currentAction={dynamicData.action}
              stats={dynamicData.stats}
              history={dynamicData.history}
            />
          );
        })}
      </div>

      {/* Council Decisions history */}
      <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--surface-border)', paddingBottom: '10px' }}>
          <Award size={18} color="var(--success)" />
          <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Recent Council Decisions</h3>
        </div>

        {loadingDecisions ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
            Loading historical decisions...
          </div>
        ) : decisions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {decisions.slice(0, 5).map((dec, idx) => (
              <CouncilVote key={idx} decision={dec} />
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '30px',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--surface-border)',
            color: 'var(--text-muted)',
            fontSize: '13px'
          }}>
            No historical council decisions found. Let a team complete a mission to cast governance votes!
          </div>
        )}
      </div>

    </div>
  );
}
