import React, { useState } from 'react';
import { 
  MessageSquare, Search, Database, Cpu, 
  CheckCircle2, XCircle, AlertCircle, PlayCircle, 
  Terminal, Brain, ChevronDown, ChevronUp, User 
} from 'lucide-react';
import StatusDot from '../shared/StatusDot';

export default function FeedItem({ event }) {
  const [expanded, setExpanded] = useState(false);
  const { id, type, agent_id, timestamp, payload, status } = event;
  
  const timeStr = new Date(timestamp).toLocaleTimeString();
  
  const getIcon = () => {
    switch (type) {
      case 'mission.created':
        return <PlayCircle size={16} color="var(--accent-secondary)" />;
      case 'mission.step':
        return <ActivityIcon size={16} />;
      case 'mission.completed':
        return <CheckCircle2 size={16} color="var(--success)" />;
      case 'mission.failed':
        return <XCircle size={16} color="var(--error)" />;
      case 'agent.state_change':
        return <Brain size={16} color={`var(--agent-${agent_id?.toLowerCase() || 'master'}, var(--accent))`} />;
      case 'agent.thinking':
        return <Brain size={16} color={`var(--agent-${agent_id?.toLowerCase() || 'master'}, var(--accent))`} />;
      case 'agent.tool_call':
        return <Terminal size={16} color="var(--accent-secondary)" />;
      case 'agent.tool_result':
        return <CheckCircle2 size={16} color="var(--success)" />;
      case 'agent.message':
        return <MessageSquare size={16} color="#06b6d4" />;
      case 'agent.memory_write':
        return <Database size={16} color="var(--warning)" />;
      case 'council.vote_cast':
        return <User size={16} color={payload?.vote === 'approve' ? 'var(--success)' : 'var(--error)'} />;
      case 'council.result':
        return <CheckCircle2 size={16} color={payload?.passed ? 'var(--success)' : 'var(--error)'} />;
      default:
        return <Cpu size={16} color="var(--text-muted)" />;
    }
  };

  const getAgentColor = () => {
    return `var(--agent-${agent_id?.toLowerCase() || 'master'}, var(--accent))`;
  };

  const renderContent = () => {
    switch (type) {
      case 'mission.created':
        return (
          <div>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Mission Created:</span> "{payload.goal}"
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Team: <strong style={{ color: 'var(--text-primary)' }}>{payload.team}</strong> · Mode: <strong style={{ color: 'var(--text-primary)' }}>{payload.mode}</strong>
            </div>
          </div>
        );
      case 'mission.step':
        return (
          <div>
            <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{payload.step}</span>
          </div>
        );
      case 'mission.completed':
        return (
          <div style={{ color: 'var(--success)', fontWeight: 600 }}>
            Mission completed successfully!
          </div>
        );
      case 'mission.failed':
        return (
          <div style={{ color: 'var(--error)', fontWeight: 600 }}>
            Mission failed: {payload.error}
          </div>
        );
      case 'agent.state_change':
        return (
          <div>
            Agent <span style={{ color: getAgentColor(), fontWeight: 500 }}>{agent_id}</span> state transitioned from <span style={{ color: 'var(--text-muted)' }}>{payload.from}</span> to <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{payload.to}</span>
          </div>
        );
      case 'agent.thinking':
        return (
          <div>
            <span style={{ color: getAgentColor(), fontWeight: 500 }}>{agent_id}</span> is thinking...
            <p style={{
              color: 'var(--text-primary)',
              fontStyle: 'italic',
              fontSize: '13px',
              marginTop: '6px',
              borderLeft: '2px solid var(--accent-dim)',
              paddingLeft: '12px',
              paddingTop: '4px',
              paddingBottom: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0'
            }}>
              "{payload.thought}"
            </p>
          </div>
        );
      case 'agent.tool_call':
        return (
          <div>
            <span style={{ color: getAgentColor(), fontWeight: 500 }}>{agent_id}</span> invoked tool <span style={{ color: 'var(--accent-hover)', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{payload.tool}</span>
            <div style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)',
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              marginTop: '6px',
              overflowX: 'auto'
            }}>
              args: {payload.args_preview || JSON.stringify(payload.args)}
            </div>
          </div>
        );
      case 'agent.tool_result':
        return (
          <div>
            Tool <span style={{ color: 'var(--accent-hover)', fontFamily: 'var(--font-mono)' }}>{payload.tool}</span> completed.
            <div style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-primary)',
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              marginTop: '6px',
              maxHeight: '120px',
              overflowY: 'auto'
            }}>
              {payload.preview || payload.result}
            </div>
          </div>
        );
      case 'agent.message':
        return (
          <div>
            <span style={{ color: getAgentColor(), fontWeight: 500 }}>{agent_id}</span> → <span style={{ fontWeight: 500, color: '#06b6d4' }}>{payload.to}</span>:
            <div style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              borderLeft: '2px solid rgba(6, 182, 212, 0.2)',
              paddingLeft: '12px',
              paddingTop: '4px',
              paddingBottom: '4px',
              marginTop: '6px',
              backgroundColor: 'rgba(6, 182, 212, 0.03)',
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0'
            }}>
              "{payload.content}"
            </div>
          </div>
        );
      case 'agent.memory_write':
        return (
          <div>
            <span style={{ color: getAgentColor(), fontWeight: 500 }}>{agent_id}</span> wrote to Blackboard:
            <div style={{
              fontSize: '12px',
              borderLeft: '2px solid var(--warning-dim)',
              paddingLeft: '12px',
              paddingTop: '4px',
              paddingBottom: '4px',
              marginTop: '6px',
              backgroundColor: 'rgba(245, 158, 11, 0.03)',
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0'
            }}>
              <span style={{ fontWeight: 'bold', color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>{payload.key}</span>: {payload.preview}
            </div>
          </div>
        );
      case 'council.vote_cast':
        const voteApprove = payload.vote === 'approve';
        return (
          <div>
            Council Ballot: <span style={{ color: getAgentColor(), fontWeight: 500 }}>{agent_id}</span> voted <span style={{ color: voteApprove ? 'var(--success)' : 'var(--error)', fontWeight: 'bold' }}>{payload.vote?.toUpperCase()}</span>
            <p style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              fontStyle: 'italic',
              borderLeft: '2px solid var(--surface-border)',
              paddingLeft: '12px',
              paddingTop: '2px',
              paddingBottom: '2px',
              marginTop: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0'
            }}>
              "{payload.reason || payload.feedback}"
            </p>
          </div>
        );
      case 'council.result':
        return (
          <div style={{
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--surface-border)',
            backgroundColor: payload.passed ? 'rgba(16, 185, 129, 0.04)' : 'rgba(239, 68, 68, 0.04)',
            marginTop: '8px'
          }}>
            <div style={{ fontWeight: 600, fontSize: '13px' }}>
              Council Consensus: {payload.passed ? <span style={{ color: 'var(--success)' }}>APPROVED ✅</span> : <span style={{ color: 'var(--error)' }}>REJECTED ❌</span>}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Consensus Tally: {payload.tally?.approvals} Approvals · {payload.tally?.rejections} Rejections ({Math.round(payload.consensus_pct || 0)}% consensus)
            </div>
          </div>
        );
      default:
        return <div>Unhandled event type: {type}</div>;
    }
  };

  return (
    <div 
      className="apple-card"
      style={{ 
        padding: '16px', 
        marginBottom: '12px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-md)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ marginTop: '2px', flexShrink: 0 }}>
          {getIcon()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', gap: '8px', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', tracking: '0.05em', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{agent_id || 'system'}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{timeStr}</span>
            </div>
            <button 
              onClick={() => setExpanded(!expanded)} 
              style={{
                marginLeft: 'auto',
                color: 'var(--text-muted)',
                padding: '2px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--text-secondary)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {renderContent()}
          </div>
          
          {expanded && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              backgroundColor: 'rgba(0,0,0,0.4)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--surface-border)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--accent-hover)',
              overflowX: 'auto',
              maxHeight: '240px'
            }}>
              <pre style={{ margin: 0 }}>{JSON.stringify(event, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// A simple custom Icon to avoid missing activity icon.
function ActivityIcon({ size = 16 }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="#3b82f6" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
