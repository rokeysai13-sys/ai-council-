import React, { useState } from 'react';
import useEventStream from '../hooks/useEventStream';
import { Shield, Activity, Database, Cpu, Terminal, ChevronRight } from 'lucide-react';

const AGENTS = [
  { id: 'researcher', name: 'Researcher Agent', role: 'Data Mining', color: '#10b981', desc: 'Queries search APIs, scrapes text, and builds raw source files.' },
  { id: 'coder', name: 'Coder Agent', role: 'Software Engineer', color: '#8b5cf6', desc: 'Synthesizes modules, debugs, and runs automated code checks.' },
  { id: 'analyst', name: 'Analyst Agent', role: 'Data Scientist', color: '#f59e0b', desc: 'Aggregates statistics, scores confidence, and maps structures.' },
  { id: 'writer', name: 'Writer Agent', role: 'Technical Writer', color: '#ec4899', desc: 'Drafts reports, compiles project plans, and structures outputs.' },
  { id: 'shell', name: 'Shell Agent', role: 'Systems Admin', color: '#a3a3a3', desc: 'Runs CLI commands, audits files, and verifies binary paths.' },
  { id: 'critic', name: 'Critic Agent', role: 'Quality Control', color: '#ef4444', desc: 'Reviews agent plan compliance and grades execution confidence.' },
  { id: 'security', name: 'Security Agent', role: 'Security Auditor', color: '#06b6d4', desc: 'Audits dependency layers, credentials, and potential injection attacks.' }
];

export default function AgentInspectorPage({ agentId: propAgentId }) {
  const [selectedAgentId, setSelectedAgentId] = useState(propAgentId || 'coder');
  const { events } = useEventStream();
  
  const agent = AGENTS.find(a => a.id === selectedAgentId) || AGENTS[1];
  const agentEvents = events.filter(e => e.agent_id === selectedAgentId);

  return (
    <div style={{ flex: 1, display: 'flex', height: '100%', background: 'var(--bg-color)', overflow: 'hidden' }}>
      {/* Agent Roster Sidebar */}
      <div style={{ width: '220px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '13px', margin: 0, fontWeight: '700', color: 'var(--text-secondary)' }}>Agent Swarm Roster</h3>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {AGENTS.map(a => (
            <button key={a.id} onClick={() => setSelectedAgentId(a.id)} style={{
              width: '100%', padding: '10px 12px', borderRadius: '6px', border: 'none', background: selectedAgentId === a.id ? 'var(--bg-sidebar)' : 'transparent',
              color: selectedAgentId === a.id ? 'var(--accent-primary)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textAlign: 'left', fontSize: '12px'
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: a.color }} />
              <span style={{ flex: 1, fontWeight: selectedAgentId === a.id ? '600' : '400' }}>{a.name}</span>
              <ChevronRight size={12} style={{ opacity: selectedAgentId === a.id ? 1 : 0 }} />
            </button>
          ))}
        </div>
      </div>

      {/* Main Details and Trace Logs */}
      <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <span style={{ color: agent.color }}>●</span> {agent.name}
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Swarm Role: <strong>{agent.role}</strong></span>
          </div>
          <div className="glass-panel" style={{ padding: '6px 12px', borderRadius: '4px', fontSize: '11px', color: 'var(--text-success)' }}>
            🟢 Swarm Node Connected
          </div>
        </div>

        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>{agent.desc}</p>

        {/* Dashboard Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div className="apple-card" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Cpu size={20} color="var(--accent-primary)" />
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Simulation Load</span>
              <strong style={{ fontSize: '14px' }}>0.0% CPU</strong>
            </div>
          </div>
          <div className="apple-card" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Database size={20} color="var(--accent-secondary)" />
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Consolidated Memory Keywrites</span>
              <strong style={{ fontSize: '14px' }}>{agentEvents.length} updates</strong>
            </div>
          </div>
          <div className="apple-card" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Shield size={20} color="var(--accent-success)" />
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Node Priority</span>
              <strong style={{ fontSize: '14px', textTransform: 'capitalize' }}>High-Availability</strong>
            </div>
          </div>
        </div>

        {/* Execution Traces */}
        <div className="apple-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '200px' }}>
          <h3 style={{ fontSize: '14px', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={15} color="var(--text-secondary)" /> Swarm Execution Trace Logs
          </h3>
          <div style={{ flex: 1, background: 'var(--bg-sidebar)', padding: '12px', borderRadius: '4px', border: 'var(--glass-border)', fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-secondary)', overflowY: 'auto' }}>
            {agentEvents.length > 0 ? (
              agentEvents.map((e, idx) => (
                <div key={idx} style={{ marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>[{new Date(e.timestamp).toLocaleTimeString()}]</span>{' '}
                  <strong style={{ color: 'var(--accent-primary)' }}>{e.type}</strong>:{' '}
                  <span>{e.payload?.preview || e.payload?.key || JSON.stringify(e.payload)}</span>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', padding: '24px', textAlign: 'center' }}>
                No active execution logs on the network for {agent.name} yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
