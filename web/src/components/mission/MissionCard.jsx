import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import ProgressBar from '../shared/ProgressBar';
import StatusDot from '../shared/StatusDot';

export default function MissionCard({ mission, isActive, onClick }) {
  const { id, goal, status, team, created_at, progress } = mission;
  
  const dateStr = new Date(created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={14} color="var(--success)" />;
      case 'failed':
        return <AlertCircle size={14} color="var(--error)" />;
      default:
        return <StatusDot state={status} size="6px" />;
    }
  };

  const getProgressVal = () => {
    if (!progress) return 0;
    return progress.current_step / (mission.max_steps || 12);
  };

  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: isActive ? 'var(--accent-dim)' : 'var(--bg-elevated)',
        border: isActive ? '1px solid var(--accent)' : '1px solid var(--surface-border)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justify: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: '10px', 
            fontWeight: 600, 
            color: 'var(--text-muted)' 
          }}>
            #{id}
          </span>
          <span style={{
            fontSize: '10px',
            backgroundColor: 'var(--bg-hover)',
            color: 'var(--text-secondary)',
            padding: '2px 6px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            fontWeight: 600
          }}>
            {team}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {getStatusIcon()}
        </div>
      </div>

      <div style={{ 
        fontSize: '13px', 
        fontWeight: 600, 
        color: 'var(--text-primary)',
        lineHeight: 1.4,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {goal}
      </div>

      {status === 'running' && (
        <div style={{ marginTop: '4px' }}>
          <ProgressBar value={getProgressVal()} height="2px" />
        </div>
      )}

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        fontSize: '10px', 
        color: 'var(--text-muted)',
        marginTop: '4px'
      }}>
        <span>{dateStr}</span>
        {status === 'running' && (
          <span style={{ fontFamily: 'var(--font-mono)' }}>
            Step {progress?.current_step || 0}/{mission.max_steps || 12}
          </span>
        )}
      </div>
    </div>
  );
}
