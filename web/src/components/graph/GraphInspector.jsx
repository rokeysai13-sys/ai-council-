import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function GraphInspector({ selectedNode, setSelectedNode, nodes, links }) {
  if (!selectedNode) return null;

  const getNodeEmoji = (type) => {
    if (type === 'system') return '🤖';
    if (type === 'project') return '📁';
    if (type === 'mission') return '🎯';
    if (type === 'decision') return '💡';
    if (type === 'memory') return '🧠';
    return '•';
  };

  return (
    <div className="graph-drawer" style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: '320px',
      height: '100%',
      background: 'var(--bg-card)',
      borderLeft: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10,
      boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.25)',
      animation: 'slideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div className="graph-drawer-header" style={{
        padding: '16px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'between',
        width: '100%'
      }}>
        <h3 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, flex: 1 }}>
          <span>{getNodeEmoji(selectedNode.type)}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedNode.label}
          </span>
        </h3>
        <button 
          onClick={() => setSelectedNode(null)} 
          style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '18px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          &times;
        </button>
      </div>

      <div className="graph-drawer-content" style={{
        padding: '16px',
        overflowY: 'auto',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {selectedNode.type === 'system' && (
          <div>
            <p style={{ fontSize: '13px', lineHeight: 1.5, marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {selectedNode.details}
            </p>
            <div className="apple-card" style={{ padding: '12px', background: 'var(--bg-sidebar)', borderRadius: '6px' }}>
              <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', marginTop: 0 }}>
                Connected Interfaces:
              </h4>
              <ul style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '16px', margin: 0 }}>
                {links
                  .filter(l => l.source === selectedNode.id || l.target === selectedNode.id)
                  .map((l, i) => {
                    const other = l.source === selectedNode.id ? l.target : l.source;
                    const label = nodes.find(n => n.id === other)?.label || other;
                    return <li key={i} style={{ marginBottom: '4px' }}>{label} ({l.type})</li>;
                  })}
              </ul>
            </div>
          </div>
        )}

        {selectedNode.type === 'project' && (() => {
          const p = selectedNode.details || {};
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</label>
                <div style={{ fontSize: '13px', fontWeight: '600', textTransform: 'capitalize', color: p.status === 'active' ? 'var(--accent-success)' : 'var(--text-secondary)' }}>
                  {p.status || 'unknown'}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Completion Progress</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <div style={{ flex: 1, height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${p.progress || 0}%`, height: '100%', background: 'var(--accent-primary)' }} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '600' }}>{p.progress || 0}%</span>
                </div>
              </div>

              {p.repos && p.repos.length > 0 && (
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Repository Path</label>
                  <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', background: 'var(--bg-sidebar)', padding: '6px 8px', borderRadius: '4px', wordBreak: 'break-all', marginTop: '4px' }}>
                    {p.repos.join(', ')}
                  </div>
                </div>
              )}

              {p.todos && p.todos.length > 0 && (
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Code-level TODOs ({p.todos.length})</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto', marginTop: '4px' }}>
                    {p.todos.map((t, idx) => (
                      <div key={idx} style={{ fontSize: '11.5px', background: 'var(--bg-sidebar)', padding: '6px 8px', borderRadius: '4px' }}>
                        <div style={{ fontWeight: '600', color: t.type === 'FIXME' ? 'var(--accent-danger)' : 'var(--accent-warning)' }}>
                          {t.type} (Line {t.line})
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>{t.file}</div>
                        <div style={{ marginTop: '2px' }}>{t.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {p.issues && p.issues.length > 0 && (
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Repository Issues ({p.issues.length})</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto', marginTop: '4px' }}>
                    {p.issues.map((issue, idx) => (
                      <div key={idx} style={{ fontSize: '11.5px', borderLeft: '3px solid var(--accent-danger)', background: 'var(--bg-sidebar)', padding: '6px 8px', borderRadius: '0 4px 4px 0' }}>
                        <div style={{ fontWeight: '600' }}>{issue.title || issue.text}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{issue.source} - {issue.file || 'Global'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {p.architecture && (
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Architecture Overview</label>
                  <div className="markdown-body" style={{ fontSize: '12px', marginTop: '4px', background: 'var(--bg-sidebar)', padding: '10px', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                    <ReactMarkdown>{p.architecture}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {selectedNode.type === 'mission' && (() => {
          const m = selectedNode.details || {};
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mission Goal</label>
                <p style={{ fontSize: '13px', fontWeight: '500', marginTop: '2px', color: 'var(--text-primary)' }}>{m.goal}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</label>
                  <div style={{ fontSize: '13px', fontWeight: '600', textTransform: 'capitalize', color: m.status === 'completed' ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                    {m.status}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Execution Mode</label>
                  <div style={{ fontSize: '13px', fontWeight: '600', textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                    {m.mode}
                  </div>
                </div>
              </div>

              {m.plan && m.plan.sub_tasks && m.plan.sub_tasks.length > 0 && (
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Checklist Subtasks</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                    {m.plan.sub_tasks.map((st, idx) => {
                      const isDone = m.progress?.completed_tasks?.some(ct => ct.id === st.id);
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', background: 'var(--bg-sidebar)', padding: '6px 10px', borderRadius: '4px' }}>
                          <span>{isDone ? '✅' : '⏳'}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{st.title}</div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Agent: {st.agent}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {m.progress && m.progress.history && m.progress.history.length > 0 && (
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Execution Logs</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto', marginTop: '4px', fontSize: '11.5px', fontFamily: 'var(--font-mono)', background: 'var(--bg-sidebar)', padding: '8px', borderRadius: '4px' }}>
                    {m.progress.history.map((h, i) => (
                      <div key={i} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                        {h}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {selectedNode.type === 'decision' && (() => {
          const d = selectedNode.details || {};
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Decision Type</label>
                <div style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--accent-secondary)' }}>
                  {d.decision_type}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Details</label>
                <p style={{ fontSize: '13px', marginTop: '2px', color: 'var(--text-primary)' }}>{d.details}</p>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rationale / Reasoning</label>
                <div style={{ fontSize: '12.5px', background: 'var(--bg-sidebar)', padding: '10px', borderRadius: '4px', marginTop: '4px', borderLeft: '3px solid var(--accent-secondary)', color: 'var(--text-secondary)' }}>
                  {d.rationale}
                </div>
              </div>

              {d.timestamp && (
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Logged Timestamp</label>
                  <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', marginTop: '2px', color: 'var(--text-secondary)' }}>
                    {new Date(d.timestamp).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {selectedNode.type === 'memory' && (() => {
          const h = selectedNode.details || {};
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Episodic memory text</label>
                <p style={{ fontSize: '13px', fontStyle: 'italic', background: 'var(--bg-sidebar)', padding: '12px', borderRadius: '4px', borderLeft: '3px solid var(--accent-success)', marginTop: '4px', color: 'var(--text-primary)' }}>
                  &ldquo;{h.prompt || h.response}&rdquo;
                </p>
              </div>

              {h.created_at && (
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Session Created</label>
                  <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {new Date(h.created_at).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
