import React, { useMemo } from 'react';
import { BarChart2, PieChart, Shield, Clock, Tool, Database, CheckCircle, XCircle } from 'lucide-react';

export default function MissionAnalytics({ events = [] }) {
  const stats = useMemo(() => {
    if (events.length === 0) return null;

    const sorted = [...events].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const firstTime = new Date(sorted[0].timestamp);
    const lastTime = new Date(sorted[sorted.length - 1].timestamp);
    const durationMs = lastTime - firstTime;
    
    // Format duration
    let durationStr = '0s';
    if (durationMs > 0) {
      const totalSec = Math.floor(durationMs / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      durationStr = min > 0 ? `${min}m ${sec}s` : `${sec}s`;
    }

    let agentUtilization = {};
    let toolUsage = {};
    let memoryWrites = 0;
    let votes = [];
    let isCompleted = false;
    let isFailed = false;
    let consensusPct = 0;
    let passed = false;

    events.forEach(evt => {
      const agent = evt.agent_id || 'unknown';
      
      // Count agent actions (utilization)
      if (agent !== 'system' && agent !== 'council') {
        agentUtilization[agent] = (agentUtilization[agent] || 0) + 1;
      }

      // Tool usage
      if (evt.type === 'agent.tool_call') {
        const tool = evt.payload?.tool || 'unknown';
        toolUsage[tool] = (toolUsage[tool] || 0) + 1;
      }

      // Memory writes
      if (evt.type === 'agent.memory_write') {
        memoryWrites += 1;
      }

      // Votes
      if (evt.type === 'council.vote_cast') {
        votes.push({
          agent,
          vote: evt.payload?.vote,
          reason: evt.payload?.reason || evt.payload?.feedback || ''
        });
      }

      // Council Consensus
      if (evt.type === 'council.result') {
        passed = evt.payload?.passed;
        consensusPct = evt.payload?.consensus_pct || 0;
      }

      // Completion
      if (evt.type === 'mission.completed') isCompleted = true;
      if (evt.type === 'mission.failed') isFailed = true;
    });

    return {
      durationStr,
      agentUtilization,
      toolUsage,
      memoryWrites,
      votes,
      status: isCompleted ? 'Completed' : isFailed ? 'Failed' : 'Running',
      passed,
      consensusPct
    };
  }, [events]);

  if (!stats) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '24px' }}>
        No analytics available. Start execution to compute.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        <div className="glass-panel" style={{ padding: '12px', borderRadius: '6px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Duration</span>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} color="var(--accent-secondary)" />
            {stats.durationStr}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '12px', borderRadius: '6px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Memory Writes</span>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Database size={14} color="var(--accent-primary)" />
            {stats.memoryWrites} updates
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '12px', borderRadius: '6px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Consensus Rate</span>
          <div style={{ fontSize: '15px', fontWeight: '700', color: stats.passed ? 'var(--success)' : 'var(--text-primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={14} color={stats.passed ? 'var(--success)' : 'var(--text-muted)'} />
            {stats.consensusPct}%
          </div>
        </div>
      </div>

      {/* Utilization and Tools */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
        {/* Agent utilization list */}
        <div className="glass-panel" style={{ padding: '16px', borderRadius: '8px' }}>
          <h4 style={{ fontSize: '12px', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
            <BarChart2 size={14} /> Agent Utilization
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(stats.agentUtilization).map(([agent, count]) => (
              <div key={agent} style={{ fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontWeight: '600' }}>{agent}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{count} actions</span>
                </div>
                <div style={{ height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (count / 20) * 100)}%`, height: '100%', background: 'var(--accent-primary)' }} />
                </div>
              </div>
            ))}
            {Object.keys(stats.agentUtilization).length === 0 && (
              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '11px' }}>No agent actions logged.</span>
            )}
          </div>
        </div>

        {/* Tool usage counts */}
        <div className="glass-panel" style={{ padding: '16px', borderRadius: '8px' }}>
          <h4 style={{ fontSize: '12px', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
            <PieChart size={14} /> Swarm Tool Invocations
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(stats.toolUsage).map(([tool, count]) => (
              <div key={tool} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                <code style={{ color: 'var(--accent-secondary)' }}>{tool}</code>
                <span style={{ fontWeight: '600' }}>{count} runs</span>
              </div>
            ))}
            {Object.keys(stats.toolUsage).length === 0 && (
              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '11px' }}>No tool calls made yet.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
