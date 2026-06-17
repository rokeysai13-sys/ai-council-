import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Check, X, ShieldAlert, Award, ChevronDown, ChevronUp } from 'lucide-react';

export default function CouncilVote({ decision, liveVotes = null, isLive = false }) {
  const [expanded, setExpanded] = useState(false);

  // Normalize vote event structure
  const getVotesList = () => {
    if (isLive && liveVotes) {
      return Object.entries(liveVotes).map(([agentName, voteData]) => ({
        agent: agentName,
        vote: voteData.vote,
        reason: voteData.feedback || voteData.reason,
        confidence: voteData.confidence || 1.0
      }));
    }
    
    if (decision && decision.events) {
      return decision.events
        .filter(e => e.type === 'council.vote_cast')
        .map(e => ({
          agent: e.agent_id,
          vote: e.payload?.vote || 'reject',
          reason: e.payload?.reason || 'No comment.',
          confidence: e.payload?.confidence || 1.0
        }));
    }
    
    return [];
  };

  const votes = getVotesList();
  const approvalsCount = votes.filter(v => v.vote === 'approve').length;
  const rejectionsCount = votes.filter(v => v.vote === 'reject').length;
  const totalVotes = votes.length;
  
  // Try to determine consensus/passed state
  let passed = false;
  let consensusPct = 0;
  
  if (isLive && liveVotes) {
    passed = approvalsCount > rejectionsCount;
    consensusPct = totalVotes > 0 ? Math.round((approvalsCount / totalVotes) * 100) : 0;
  } else if (decision) {
    // Check if there is a council.result event
    const resultEvt = decision.events?.find(e => e.type === 'council.result');
    if (resultEvt) {
      passed = resultEvt.payload?.passed;
      consensusPct = Math.round(resultEvt.payload?.consensus_pct || 0);
    } else {
      passed = approvalsCount > rejectionsCount;
      consensusPct = totalVotes > 0 ? Math.round((approvalsCount / totalVotes) * 100) : 0;
    }
  }

  const title = isLive 
    ? 'Active Council Vote Session' 
    : (decision?.details || `Decision for Mission #${decision?.mission_id || 'Unknown'}`);
    
  const rationaleText = decision?.rationale || (isLive ? 'Agents are reviewing blackboard and casting ballots.' : '');

  return (
    <div className="apple-card" style={{
      borderRadius: 'var(--radius-lg)',
      background: 'var(--bg-elevated)',
      border: isLive ? '1px solid var(--accent)' : '1px solid var(--surface-border)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      boxShadow: isLive ? '0 0 16px var(--accent-glow)' : 'var(--shadow-md)',
      position: 'relative'
    }}>
      {isLive && (
        <span style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'var(--accent)',
          color: '#fff',
          fontSize: '9px',
          fontWeight: 'bold',
          padding: '2px 8px',
          borderRadius: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          animation: 'pulse-slow 2s infinite'
        }}>
          Live Vote
        </span>
      )}

      {/* Title block */}
      <div>
        <h4 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isLive ? <ShieldAlert size={16} color="var(--accent)" /> : <Award size={16} color="var(--success)" />}
          {title}
        </h4>
        {rationaleText && (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            {rationaleText}
          </p>
        )}
      </div>

      {/* Grid of ballots */}
      {votes.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '12px'
        }}>
          {votes.map((v, idx) => {
            const isYes = v.vote === 'approve';
            return (
              <div key={idx} style={{
                background: 'var(--bg-primary)',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${isYes ? 'var(--success-dim)' : 'var(--error-dim)'}`,
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'center',
                boxShadow: isYes ? '0 2px 8px var(--success-dim)' : '0 2px 8px var(--error-dim)'
              }}>
                <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                  {v.agent}
                </span>
                
                {isYes ? (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--success-dim)',
                    color: 'var(--success)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Check size={18} />
                  </div>
                ) : (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--error-dim)',
                    color: 'var(--error)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <X size={18} />
                  </div>
                )}
                
                <span style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  color: isYes ? 'var(--success)' : 'var(--error)',
                  textTransform: 'uppercase'
                }}>
                  {isYes ? 'Approve' : 'Reject'}
                </span>

                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Conf: {Math.round(v.confidence * 100)}%
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-muted)',
          fontSize: '12px',
          fontStyle: 'italic'
        }}>
          No votes cast yet.
        </div>
      )}

      {/* Summary block */}
      {votes.length > 0 && (
        <div style={{
          background: passed ? 'var(--success-dim)' : 'var(--error-dim)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: `1px solid ${passed ? 'var(--success)' : 'var(--error)'}20`
        }}>
          <div>
            <div style={{
              fontSize: '13px',
              fontWeight: '700',
              color: passed ? 'var(--success)' : 'var(--error)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {passed ? 'Consensus Reached: APPROVED' : 'Consensus Rejected'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {approvalsCount} approve vs {rejectionsCount} reject ({consensusPct}% Consensus)
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {passed ? (
              <ThumbsUp size={20} color="var(--success)" />
            ) : (
              <ThumbsDown size={20} color="var(--error)" />
            )}
          </div>
        </div>
      )}

      {/* Expandable reasons / feedback */}
      {votes.some(v => v.reason) && (
        <div>
          <button 
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-accent)',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: 0
            }}
          >
            {expanded ? 'Hide explanations' : 'Show explanations'}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          {expanded && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid var(--surface-border)'
            }}>
              {votes.map((v, idx) => (
                <div key={idx} style={{ fontSize: '12px' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{v.agent}: </strong>
                  <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    "{v.reason}"
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
