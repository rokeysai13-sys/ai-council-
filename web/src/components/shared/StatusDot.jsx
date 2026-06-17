import React from 'react';

export default function StatusDot({ state = 'idle', agent = null, size = '8px' }) {
  const getColor = () => {
    switch (state.toLowerCase()) {
      case 'idle':
        return 'var(--text-muted)';
      case 'planning':
        return 'var(--warning)';
      case 'thinking':
        return 'var(--accent)';
      case 'executing':
        return agent ? `var(--agent-${agent.toLowerCase()}, var(--accent))` : 'var(--accent)';
      case 'waiting':
        return 'var(--text-secondary)';
      case 'voting':
        return 'var(--accent-hover)';
      case 'retrying':
        return 'var(--warning)';
      case 'failed':
        return 'var(--error)';
      case 'completed':
      case 'done':
        return 'var(--success)';
      default:
        return 'var(--accent)';
    }
  };

  const color = getColor();
  const isPulsing = ['planning', 'thinking', 'executing', 'voting', 'retrying'].includes(state.toLowerCase());

  return (
    <span
      className={isPulsing ? 'pulse-glowing' : ''}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow: isPulsing ? `0 0 6px ${color}` : 'none',
        transition: 'all 0.3s ease',
      }}
    />
  );
}
