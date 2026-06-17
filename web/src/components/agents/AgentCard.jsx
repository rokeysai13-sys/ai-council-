import React from 'react';
import { Cpu, Shield, Zap, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle, MessageSquare, Edit3 } from 'lucide-react';

const STATE_CONFIGS = {
  IDLE: { color: 'var(--text-muted)', label: 'IDLE', pulseClass: '' },
  PLANNING: { color: 'var(--warning)', label: 'PLANNING', pulseClass: 'pulse-slow' },
  THINKING: { color: 'var(--accent)', label: 'THINKING', pulseClass: 'pulse-medium' },
  EXECUTING: { color: 'var(--accent-hover)', label: 'EXECUTING', pulseClass: 'pulse-fast' },
  WAITING: { color: 'var(--text-secondary)', label: 'WAITING', pulseClass: 'blink-slow' },
  VOTING: { color: '#8b5cf6', label: 'VOTING', pulseClass: 'glow-glow' },
  RETRYING: { color: 'var(--warning)', label: 'RETRYING', pulseClass: 'shake-anim' },
  FAILED: { color: 'var(--error)', label: 'FAILED', pulseClass: '' },
  COMPLETED: { color: 'var(--success)', label: 'COMPLETED', pulseClass: 'glow-success' },
};

export default function AgentCard({ agent, currentState = 'IDLE', currentAction = '', stats = { tools: 0, writes: 0, messages: 0 }, history = [] }) {
  const stateVal = (currentState || 'IDLE').toUpperCase();
  const stateConf = STATE_CONFIGS[stateVal] || STATE_CONFIGS.IDLE;
  const agentColor = agent.color || 'var(--accent)';

  // Determine icon based on role/type
  const getRoleIcon = () => {
    const role = (agent.role || '').toLowerCase();
    if (role.includes('pm') || role.includes('product')) return <Cpu size={16} />;
    if (role.includes('coder') || role.includes('programmer') || role.includes('developer')) return <Zap size={16} />;
    if (role.includes('critic') || role.includes('evaluator') || role.includes('judge')) return <AlertTriangle size={16} />;
    if (role.includes('security') || role.includes('auditor')) return <Shield size={16} />;
    return <Cpu size={16} />;
  };

  return (
    <div className="apple-card" style={{
      position: 'relative',
      padding: '20px',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--bg-elevated)',
      border: `1px solid var(--surface-border)`,
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
      cursor: 'default',
      overflow: 'hidden',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.borderColor = agentColor;
      e.currentTarget.style.boxShadow = `0 8px 24px rgba(0, 0, 0, 0.2), 0 0 12px ${agentColor}20`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'none';
      e.currentTarget.style.borderColor = 'var(--surface-border)';
      e.currentTarget.style.boxShadow = 'none';
    }}
    >
      {/* Accent strip */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '4px',
        height: '100%',
        backgroundColor: agentColor,
      }} />

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginLeft: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: agentColor }}>{getRoleIcon()}</span>
          <h3 style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>{agent.name}</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div className={`status-dot ${stateConf.pulseClass}`} style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: stateConf.color,
            boxShadow: `0 0 8px ${stateConf.color}`
          }} />
          <span style={{ fontSize: '11px', fontWeight: '700', color: stateConf.color, letterSpacing: '0.05em' }}>
            {stateConf.label}
          </span>
        </div>
      </div>

      {/* Description */}
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '6px', lineHeight: '1.4' }}>
        {agent.role_description || agent.description}
      </div>

      {/* Current Task/Action Area */}
      <div style={{
        background: 'var(--bg-primary)',
        borderRadius: 'var(--radius-sm)',
        padding: '10px 12px',
        fontSize: '12px',
        marginLeft: '6px',
        border: '1px solid var(--surface-border)',
        minHeight: '48px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}>
        {currentAction ? (
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '10px', display: 'block', textTransform: 'uppercase', marginBottom: '2px' }}>
              Current Activity
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
              {currentAction}
            </span>
          </div>
        ) : (
          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Agent is currently idle.
          </span>
        )}
      </div>

      {/* Stats Counter */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '6px',
        fontSize: '11px',
        textAlign: 'center',
        marginLeft: '6px',
        borderTop: '1px solid var(--surface-border)',
        borderBottom: '1px solid var(--surface-border)',
        padding: '8px 0',
      }}>
        <div>
          <span style={{ color: 'var(--text-muted)', display: 'block' }}>Tools</span>
          <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{stats.tools}</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)', display: 'block' }}>Writes</span>
          <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{stats.writes}</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)', display: 'block' }}>Msgs</span>
          <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{stats.messages}</span>
        </div>
      </div>

      {/* State History Line */}
      <div style={{ marginLeft: '6px', fontSize: '11px' }}>
        <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>State Path</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          {history.length > 0 ? (
            history.map((s, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span style={{ color: 'var(--text-muted)' }}>→</span>}
                <span style={{
                  color: s === currentState ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: s === currentState ? '600' : '400',
                  padding: '1px 4px',
                  borderRadius: '3px',
                  background: s === currentState ? 'var(--surface-active)' : 'transparent',
                }}>
                  {s}
                </span>
              </React.Fragment>
            ))
          ) : (
            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No state transitions yet.</span>
          )}
        </div>
      </div>
    </div>
  );
}
