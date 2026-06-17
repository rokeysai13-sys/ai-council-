import React from 'react';
import { Terminal, Trash2, Volume2, RefreshCw } from 'lucide-react';

export default function ChatToolbar({ mode, onClearChat, onSpeakLast, ttsActive }) {
  const titles = {
    master: 'Master Swarm Operations',
    research: 'Deep Research Agent',
    debate: 'Consensus Debate Core',
    code: 'Autonomous Coder Agent',
    pipeline: 'Sequential Task Pipeline'
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 24px',
      borderBottom: '1px solid var(--border-color)',
      background: 'var(--bg-card)',
      transition: 'background 0.3s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Terminal size={16} color="var(--accent-primary)" />
        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
          {titles[mode] || 'Agent Workspace'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {onSpeakLast && (
          <button 
            onClick={onSpeakLast}
            className="apple-btn-secondary"
            style={{ 
              padding: '4px 10px', 
              fontSize: '11px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px' 
            }}
            title="Read last response aloud"
          >
            <Volume2 size={13} />
            {ttsActive ? 'Speaking...' : 'Speak'}
          </button>
        )}

        {onClearChat && (
          <button 
            onClick={onClearChat}
            className="apple-btn-secondary"
            style={{ 
              padding: '4px 10px', 
              fontSize: '11px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              color: 'var(--accent-danger)',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}
            title="Reset conversation history"
          >
            <Trash2 size={13} />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
