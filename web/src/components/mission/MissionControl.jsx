import React, { useState, useEffect, useMemo } from 'react';
import LiveFeed from '../feed/LiveFeed';
import MissionCard from './MissionCard';
import ExecutionTimeline from './ExecutionTimeline';
import ProgressBar from '../shared/ProgressBar';
import { Play, Activity, Clock, Compass, Cpu, Coins, AlertTriangle } from 'lucide-react';
import { missionsService } from '../../services/api';

export default function MissionControl({ 
  events = [], 
  isConnected = false, 
  onStartMission = null, 
  onResumeMission = null,
  selectedMissionId = null, 
  setSelectedMissionId = null, 
  missions = [],
  onClearEvents = null
}) {
  const [goal, setGoal] = useState('');
  const [team, setTeam] = useState('research');
  const [maxSteps, setMaxSteps] = useState(12);
  const [autonomy, setAutonomy] = useState('semi');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbEvents, setDbEvents] = useState([]);

  // Default to the currently selected mission, or the first running/paused mission, or the most recent mission
  const activeMission = missions.find(m => m.id === selectedMissionId) ||
                        missions.find(m => m.status === 'running') ||
                        missions.find(m => m.status === 'paused') ||
                        missions[0];

  // Fetch complete events list for the active mission from database, with polling
  useEffect(() => {
    if (!activeMission?.id) {
      setDbEvents([]);
      return;
    }

    let isMounted = true;
    const loadEvents = async () => {
      try {
        const res = await missionsService.getMissionDetails(activeMission.id);
        if (isMounted && res && res.events) {
          setDbEvents(res.events);
        }
      } catch (err) {
        console.error('Failed to load mission events:', err);
      }
    };

    loadEvents();
    
    let interval;
    if (activeMission.status === 'running' || activeMission.status === 'paused') {
      interval = setInterval(loadEvents, 5000);
    }
    
    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [activeMission?.id, activeMission?.status]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!goal.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (onStartMission) {
        await onStartMission(goal, team, maxSteps, autonomy);
      }
      setGoal('');
    } catch (err) {
      console.error('Failed to initiate mission:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResume = async () => {
    if (isSubmitting || !activeMission) return;
    setIsSubmitting(true);
    try {
      if (onResumeMission) {
        await onResumeMission(activeMission.id);
      }
    } catch (err) {
      console.error('Failed to resume mission:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActiveMissionProgress = () => {
    if (!activeMission || !activeMission.progress) return 0;
    return activeMission.progress.current_step / (activeMission.max_steps || 12);
  };

  // Filter events by active mission ID for the stream
  const activeEvents = activeMission 
    ? events.filter(e => e.mission_id === activeMission.id)
    : events;

  // Merge database historical events with real-time stream events, deduplicated by ID
  const allMissionEvents = useMemo(() => {
    const merged = [...dbEvents];
    const seenIds = new Set(dbEvents.map(e => e.id));
    
    activeEvents.forEach(e => {
      if (!seenIds.has(e.id)) {
        merged.push(e);
        seenIds.add(e.id);
      }
    });
    
    return merged;
  }, [dbEvents, activeEvents]);

  // Aggregate stats: prompt/completion tokens and cost estimates
  const stats = useMemo(() => {
    let tokensIn = 0;
    let tokensOut = 0;
    let cost = 0;
    
    allMissionEvents.forEach(e => {
      if (e.type === 'agent.llm_usage') {
        const payload = e.payload || {};
        const ti = payload.tokens_in || 0;
        const to = payload.tokens_out || 0;
        tokensIn += ti;
        tokensOut += to;
        
        // Calculate cost based on model
        const model = (payload.model || '').toLowerCase();
        if (
          model && 
          !model.includes('llama') && 
          !model.includes('mistral') && 
          !model.includes('phi') && 
          !model.includes('gemma') && 
          !model.includes('qwen') && 
          !model.includes('local') && 
          (model.startsWith('gpt-') || model.startsWith('gemini-') || model.includes('claude'))
        ) {
          let rateIn = 0.50; // per 1M tokens fallback
          let rateOut = 1.50; // per 1M tokens fallback
          
          if (model.startsWith('gpt-4o-mini')) {
            rateIn = 0.15;
            rateOut = 0.60;
          } else if (model.startsWith('gpt-4o')) {
            rateIn = 5.00;
            rateOut = 15.00;
          } else if (model.startsWith('gemini-1.5-flash')) {
            rateIn = 0.35;
            rateOut = 1.05;
          } else if (model.startsWith('gemini-1.5-pro')) {
            rateIn = 3.50;
            rateOut = 10.50;
          }
          
          cost += (ti * rateIn + to * rateOut) / 1000000;
        }
      }
    });
    
    return { tokensIn, tokensOut, cost };
  }, [allMissionEvents]);

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-primary)'
    }}>
      {/* Left Column: Mission creation & details & history */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px',
        overflowY: 'auto',
        gap: '24px',
        borderRight: '1px solid var(--surface-border)'
      }}>
        
        {/* Header Title */}
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
            Operations Center
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {missions.filter(m => m.status === 'running').length} running squads · {events.length} active event streams
          </p>
        </div>

        {/* Start Mission Input Block */}
        <form onSubmit={handleSubmit} className="apple-card" style={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          backgroundColor: 'var(--bg-elevated)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              What should your agents build?
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Build a SaaS landing page with clean pricing table..."
                className="apple-input"
                disabled={isSubmitting}
                style={{ flex: 1 }}
              />
              <button 
                type="submit" 
                className="apple-btn"
                disabled={isSubmitting || !goal.trim()}
                style={{ display: 'flex', gap: '8px', padding: '10px 20px' }}
              >
                <Play size={14} fill="#fff" /> Start
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              {/* Team Preset Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '220px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Assigned Agent Team</label>
                <select 
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'var(--bg-hover)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="research">Research Team (3 agents)</option>
                  <option value="engineering">Engineering Squad (5 agents)</option>
                  <option value="devops">DevOps Crew (2 agents)</option>
                  <option value="standard">Standard (Single Agent)</option>
                </select>
              </div>

              {/* Max Steps Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span>Budget Limit</span>
                  <span>{maxSteps} steps</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="25" 
                  value={maxSteps}
                  onChange={(e) => setMaxSteps(parseInt(e.target.value))}
                  style={{
                    accentColor: 'var(--accent)',
                    cursor: 'pointer',
                    height: '4px',
                    width: '100%',
                    backgroundColor: 'var(--bg-hover)',
                    borderRadius: '2px'
                  }}
                />
              </div>
            </div>

            {/* Autonomy Level Selectors */}
            {team !== 'standard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Autonomy Setting</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[
                    { id: 'full', label: 'Full Autonomy', desc: 'No interruption' },
                    { id: 'semi', label: 'Semi-Auto', desc: 'Pause before vote' },
                    { id: 'manual', label: 'Manual Step', desc: 'Pause each round' }
                  ].map(opt => {
                    const isSelected = autonomy === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setAutonomy(opt.id)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: isSelected ? 'var(--accent-dim)' : 'var(--bg-hover)',
                          border: isSelected ? '1px solid var(--accent)' : '1px solid var(--surface-border)',
                          color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          outline: 'none'
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 600, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{opt.label}</div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Selected / Active Mission Status Board */}
        {activeMission ? (
          <div className="apple-card" style={{
            padding: '24px',
            backgroundColor: 'var(--bg-elevated)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                  MISSION #{activeMission.id || activeMission.mission_id}
                </span>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px', marginBottom: 0 }}>
                  {activeMission.goal}
                </h3>
              </div>
              <div style={{
                fontSize: '10px',
                padding: '4px 10px',
                borderRadius: '12px',
                backgroundColor: activeMission.status === 'completed' ? 'var(--success-dim)' : activeMission.status === 'failed' ? 'var(--error-dim)' : activeMission.status === 'paused' ? 'var(--warning-dim)' : 'var(--accent-dim)',
                color: activeMission.status === 'completed' ? 'var(--success)' : activeMission.status === 'failed' ? 'var(--error)' : activeMission.status === 'paused' ? 'var(--warning)' : 'var(--accent)',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}>
                {activeMission.status}
              </div>
            </div>

            {/* Progress metrics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span>Mission Progress</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  {Math.round(getActiveMissionProgress() * 100)}%
                </span>
              </div>
              <ProgressBar value={getActiveMissionProgress()} height="6px" />
            </div>

            {/* Checkpoint Approval Control */}
            {activeMission.status === 'paused' && (
              <div style={{
                padding: '16px',
                background: 'var(--warning-dim)',
                border: '1px solid var(--warning)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginTop: '4px',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <AlertTriangle size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--warning)', fontSize: '12.5px' }}>
                      Checkpoint Reached (Manual Action Required)
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '3px', lineHeight: '1.4' }}>
                      {activeMission.progress?.history?.[activeMission.progress.history.length - 1] || 'Execution paused for manual review before proceeding.'}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleResume}
                  disabled={isSubmitting}
                  className="apple-btn"
                  style={{
                    backgroundColor: 'var(--warning)',
                    color: '#0a0a0f',
                    fontWeight: '700',
                    padding: '8px 16px',
                    fontSize: '12px',
                    borderRadius: 'var(--radius-sm)',
                    alignSelf: 'flex-start',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Play size={12} fill="#0a0a0f" /> Resume Execution
                </button>
              </div>
            )}

            {/* Team details and cost grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '12px',
              marginTop: '8px'
            }}>
              <div style={{
                padding: '12px',
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Activity size={16} color="var(--accent)" />
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Steps Run</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {activeMission.progress?.current_step || 0} / {activeMission.max_steps || 12}
                  </div>
                </div>
              </div>

              <div style={{
                padding: '12px',
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Clock size={16} color="var(--accent)" />
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Team Mode</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                    {activeMission.team}
                  </div>
                </div>
              </div>

              <div style={{
                padding: '12px',
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Cpu size={16} color="var(--accent)" />
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Token Usage</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {stats.tokensIn + stats.tokensOut > 1000 
                      ? `${((stats.tokensIn + stats.tokensOut) / 1000).toFixed(1)}k` 
                      : (stats.tokensIn + stats.tokensOut)}
                  </div>
                </div>
              </div>

              <div style={{
                padding: '12px',
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Coins size={16} color="var(--success)" />
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Estimated Cost</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    ${stats.cost.toFixed(4)}
                  </div>
                </div>
              </div>
            </div>

            {/* Completed Subtasks checklist if available */}
            {activeMission.progress?.completed_tasks && activeMission.progress.completed_tasks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Completed Sub-Tasks
                </span>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  maxHeight: '140px',
                  overflowY: 'auto'
                }}>
                  {activeMission.progress.completed_tasks.map((task, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      backgroundColor: 'rgba(255,255,255,0.01)',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)'
                    }}>
                      <span style={{ color: 'var(--success)' }}>✓</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{task.agent}:</strong> {task.title || 'Executed subtask'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Execution Timeline Tree */}
            <div style={{ marginTop: '12px', borderTop: '1px solid var(--surface-border)', paddingTop: '16px' }}>
              <ExecutionTimeline 
                events={allMissionEvents}
                status={activeMission.status}
              />
            </div>
          </div>
        ) : (
          <div className="apple-card" style={{
            padding: '40px',
            backgroundColor: 'var(--bg-elevated)',
            textAlign: 'center',
            color: 'var(--text-muted)'
          }}>
            <Compass size={36} color="var(--text-muted)" style={{ marginBottom: '12px', display: 'inline' }} />
            <p style={{ margin: 0, fontSize: '14px' }}>No active missions selected.</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>Start a new mission above to watch the agents collaborate.</p>
          </div>
        )}

        {/* Recent Missions list (History) */}
        <div>
          <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
            Mission History
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '12px'
          }}>
            {missions.filter(m => m.id !== activeMission?.id && m.mission_id !== activeMission?.id).length === 0 ? (
              <div style={{
                gridColumn: '1 / -1',
                padding: '24px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                border: '1px dashed var(--surface-border)',
                borderRadius: 'var(--radius-lg)',
                fontSize: '12px'
              }}>
                No completed missions in history.
              </div>
            ) : (
              missions
                .filter(m => m.id !== activeMission?.id && m.mission_id !== activeMission?.id)
                .map(m => (
                  <MissionCard
                    key={m.id || m.mission_id}
                    mission={m}
                    isActive={selectedMissionId === m.id || selectedMissionId === m.mission_id}
                    onClick={() => setSelectedMissionId(m.id || m.mission_id)}
                  />
                ))
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Real-time Live Event Feed */}
      <div style={{
        width: '380px',
        minWidth: '380px',
        padding: '24px',
        height: '100%'
      }}>
        <LiveFeed 
          events={activeEvents} 
          isConnected={isConnected} 
          onClear={onClearEvents}
        />
      </div>
    </div>
  );
}
