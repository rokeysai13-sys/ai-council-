import React from 'react';

const LEGEND_ITEMS = [
  { type: 'system', emoji: '🤖', label: 'System Engine', desc: 'Core platform orchestrators and tools.' },
  { type: 'project', emoji: '📁', label: 'Projects', desc: 'Active workspace code repositories.' },
  { type: 'mission', emoji: '🎯', label: 'Missions', desc: 'Stateful multi-agent execution loops.' },
  { type: 'decision', emoji: '💡', label: 'Decisions', desc: 'Swarms logs and decision records.' },
  { type: 'memory', emoji: '🧠', label: 'Memories', desc: 'Episodic RAG memory elements.' }
];

export default function GraphLegend() {
  return (
    <div className="graph-legend-panel glass-panel" style={{
      padding: '12px',
      borderRadius: '8px',
      fontSize: '11px',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      color: 'var(--text-secondary)'
    }}>
      <h4 style={{ 
        fontSize: '12px', 
        fontWeight: '600', 
        color: 'var(--text-primary)', 
        marginBottom: '8px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '4px'
      }}>
        Legend
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {LEGEND_ITEMS.map((item) => (
          <div key={item.type} style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
            <span style={{ fontSize: '14px', flexShrink: 0 }}>{item.emoji}</span>
            <div>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{item.label}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
