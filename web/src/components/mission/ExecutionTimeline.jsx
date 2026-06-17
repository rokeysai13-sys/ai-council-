import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Clock, Cpu, HelpCircle, FileText, AlertTriangle, MessageSquare, Zap } from 'lucide-react';

export default function ExecutionTimeline({ events = [], status = 'idle' }) {
  const [collapsedStages, setCollapsedStages] = useState({});

  const toggleStage = (title) => {
    setCollapsedStages(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  // Build the tree hierarchy from events
  const parseEventsIntoStages = () => {
    const stages = [];
    let currentStage = null;

    events.forEach((evt, idx) => {
      const time = new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      if (evt.type === 'mission.created') {
        currentStage = {
          title: 'Mission Initialized',
          status: 'completed',
          time,
          children: []
        };
        stages.push(currentStage);
      } else if (evt.type === 'mission.step') {
        // Close previous running stage
        if (currentStage && currentStage.status === 'running') {
          currentStage.status = 'completed';
        }
        currentStage = {
          title: evt.payload?.step || `Step ${idx}`,
          status: 'running',
          time,
          children: []
        };
        stages.push(currentStage);
      } else if (evt.type === 'mission.completed' || evt.type === 'mission.failed') {
        if (currentStage && currentStage.status === 'running') {
          currentStage.status = evt.type === 'mission.completed' ? 'completed' : 'failed';
        }
        stages.push({
          title: evt.type === 'mission.completed' ? 'Mission Finished Successfully' : 'Mission Terminated / Failed',
          status: evt.type === 'mission.completed' ? 'success' : 'failed',
          time,
          children: [
            {
              type: 'result',
              content: evt.payload?.result_preview || evt.payload?.error || 'Execution finished.',
              time
            }
          ]
        });
      } else {
        // Event belongs to the current active stage
        if (!currentStage) {
          currentStage = {
            title: 'Initial Collaborations',
            status: 'running',
            time,
            children: []
          };
          stages.push(currentStage);
        }

        if (evt.type === 'agent.thinking') {
          currentStage.children.push({
            type: 'thought',
            agent: evt.agent_id,
            content: evt.payload?.thought,
            time
          });
        } else if (evt.type === 'agent.tool_call') {
          currentStage.children.push({
            type: 'tool',
            agent: evt.agent_id,
            tool: evt.payload?.tool,
            args: evt.payload?.args || evt.payload?.args_preview,
            status: 'running',
            time
          });
        } else if (evt.type === 'agent.tool_result') {
          // Find matching tool call in current stage to update status
          const lastTool = [...currentStage.children]
            .reverse()
            .find(c => c.type === 'tool' && c.agent === evt.agent_id && c.tool === evt.payload?.tool && c.status === 'running');
          if (lastTool) {
            lastTool.status = evt.payload?.success !== false ? 'completed' : 'failed';
            lastTool.result = evt.payload?.preview || evt.payload?.result_preview;
          } else {
            // Append as a result if no matching call
            currentStage.children.push({
              type: 'tool_result',
              agent: evt.agent_id,
              tool: evt.payload?.tool,
              result: evt.payload?.preview || evt.payload?.result_preview,
              time
            });
          }
        } else if (evt.type === 'agent.memory_write') {
          currentStage.children.push({
            type: 'write',
            agent: evt.agent_id,
            key: evt.payload?.key,
            value: evt.payload?.preview,
            time
          });
        } else if (evt.type === 'agent.message') {
          currentStage.children.push({
            type: 'message',
            agent: evt.agent_id,
            to: evt.payload?.to,
            message: evt.payload?.content,
            time
          });
        } else if (evt.type === 'council.vote_cast') {
          currentStage.children.push({
            type: 'vote',
            agent: evt.agent_id,
            vote: evt.payload?.vote,
            reason: evt.payload?.reason,
            time
          });
        } else if (evt.type === 'council.result') {
          currentStage.children.push({
            type: 'consensus',
            passed: evt.payload?.passed,
            consensus: evt.payload?.consensus_pct,
            time
          });
        }
      }
    });

    // Make sure running mission shows running final stage
    if (stages.length > 0 && status === 'running' && stages[stages.length - 1].status === 'completed') {
      stages[stages.length - 1].status = 'running';
    }

    return stages;
  };

  const stages = parseEventsIntoStages();

  const getStageIcon = (status) => {
    switch (status) {
      case 'success':
      case 'completed':
        return <CheckCircle2 size={16} color="var(--success)" />;
      case 'failed':
        return <XCircle size={16} color="var(--error)" />;
      case 'running':
        return <Clock size={16} className="pulse-fast" color="var(--accent)" />;
      default:
        return <Clock size={16} color="var(--text-muted)" />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Execution Timeline Tree
      </span>
      
      {stages.length === 0 ? (
        <div style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--surface-border)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '12px' }}>
          Timeline is waiting for mission events to stream...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {stages.map((stage, sIdx) => {
            const isCollapsed = !!collapsedStages[stage.title];
            return (
              <div key={sIdx} style={{
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255, 255, 255, 0.01)',
                overflow: 'hidden'
              }}>
                {/* Stage Header */}
                <div 
                  onClick={() => toggleStage(stage.title)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: 'var(--bg-primary)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderBottom: !isCollapsed ? '1px solid var(--surface-border)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                    {getStageIcon(stage.status)}
                    <span style={{ color: 'var(--text-primary)' }}>{stage.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                      {stage.time}
                    </span>
                    {isCollapsed ? <ChevronRight size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
                  </div>
                </div>

                {/* Stage Children Items */}
                {!isCollapsed && (
                  <div style={{
                    padding: '10px 12px 10px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    position: 'relative',
                  }}>
                    {/* Left alignment line for nested items */}
                    <div style={{
                      position: 'absolute',
                      left: '14px',
                      top: '0',
                      bottom: '0',
                      width: '1px',
                      backgroundColor: 'var(--surface-border)'
                    }} />

                    {stage.children.length > 0 ? (
                      stage.children.map((child, cIdx) => (
                        <div key={cIdx} style={{ display: 'flex', gap: '8px', position: 'relative' }}>
                          {/* Circle dot on the timeline connector */}
                          <div style={{
                            position: 'absolute',
                            left: '-13.5px',
                            top: '6px',
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--surface-border)'
                          }} />

                          {/* Render item by type */}
                          {child.type === 'thought' && (
                            <div style={{ flex: 1 }}>
                              <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>{child.agent}: </span>
                              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>thought: "{child.content}"</span>
                            </div>
                          )}

                          {child.type === 'tool' && (
                            <div style={{ flex: 1 }}>
                              <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>{child.agent}: </span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--accent-dim)', color: 'var(--accent)', padding: '1px 6px', borderRadius: '3px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                                <Zap size={10} />
                                {child.tool}
                              </span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginLeft: '6px', fontFamily: 'var(--font-mono)' }}>
                                args: {typeof child.args === 'string' ? child.args : JSON.stringify(child.args)}
                              </span>
                              {child.status === 'running' ? (
                                <span style={{ fontSize: '10px', color: 'var(--accent)', marginLeft: '6px', animation: 'blink-slow 1s infinite' }}>running...</span>
                              ) : child.status === 'failed' ? (
                                <span style={{ fontSize: '10px', color: 'var(--error)', marginLeft: '6px' }}>failed</span>
                              ) : (
                                <span style={{ fontSize: '10px', color: 'var(--success)', marginLeft: '6px' }}>success</span>
                              )}
                              {child.result && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: '4px 8px', borderRadius: '3px', marginTop: '4px', fontFamily: 'var(--font-mono)', border: '1px solid var(--surface-border)', overflowX: 'auto' }}>
                                  {child.result}
                                </div>
                              )}
                            </div>
                          )}

                          {child.type === 'write' && (
                            <div style={{ flex: 1 }}>
                              <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>{child.agent}: </span>
                              <span style={{ color: 'var(--text-muted)' }}>wrote key </span>
                              <code style={{ background: 'var(--accent-dim)', color: 'var(--accent)', padding: '1px 4px', borderRadius: '3px', fontSize: '11px' }}>{child.key}</code>
                              <span style={{ color: 'var(--text-muted)' }}> with: </span>
                              <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{child.value}</span>
                            </div>
                          )}

                          {child.type === 'message' && (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                              <MessageSquare size={12} color="var(--text-muted)" style={{ marginTop: '3px' }} />
                              <div>
                                <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>{child.agent} ➔ {child.to}: </span>
                                <span style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>"{child.message}"</span>
                              </div>
                            </div>
                          )}

                          {child.type === 'vote' && (
                            <div style={{ flex: 1 }}>
                              <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>{child.agent}: </span>
                              <span style={{
                                color: child.vote === 'approve' ? 'var(--success)' : 'var(--error)',
                                fontWeight: '700',
                                textTransform: 'uppercase'
                              }}>
                                voted {child.vote}
                              </span>
                              <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginLeft: '6px' }}>
                                "{child.reason}"
                              </span>
                            </div>
                          )}

                          {child.type === 'consensus' && (
                            <div style={{ flex: 1, background: child.passed ? 'var(--success-dim)' : 'var(--error-dim)', padding: '6px 10px', borderRadius: '4px', border: `1px solid ${child.passed ? 'var(--success)' : 'var(--error)'}20` }}>
                              <span style={{ fontWeight: '700', color: child.passed ? 'var(--success)' : 'var(--error)', textTransform: 'uppercase' }}>
                                Consensus: {child.passed ? 'APPROVED' : 'REJECTED'}
                              </span>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '11px', marginLeft: '8px' }}>
                                ({child.consensus}% consensus)
                              </span>
                            </div>
                          )}

                          {child.type === 'result' && (
                            <div style={{ flex: 1, padding: '8px', background: 'var(--bg-primary)', border: '1px solid var(--surface-border)', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                              {child.content}
                            </div>
                          )}
                          
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', alignSelf: 'center', marginLeft: 'auto' }}>
                            {child.time}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '11px' }}>
                        No micro-actions logged in this step yet.
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
