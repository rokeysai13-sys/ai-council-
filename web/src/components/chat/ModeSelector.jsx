import React from 'react';
import { Sparkles, Search, User, Cpu, Activity } from 'lucide-react';

export default function ModeSelector({ mode, setMode }) {
  const modes = [
    { id: 'master', label: 'Master Swarm', icon: Sparkles },
    { id: 'research', label: 'Deep Research', icon: Search },
    { id: 'debate', label: 'Debate Core', icon: User },
    { id: 'code', label: 'Coder Agent', icon: Cpu },
    { id: 'pipeline', label: 'Task Pipeline', icon: Activity }
  ];

  return (
    <div style={{ 
      display: 'inline-flex', 
      alignSelf: 'center',
      background: 'var(--bg-sidebar)', 
      padding: '4px', 
      borderRadius: '30px', 
      gap: '4px',
      marginBottom: '24px',
      boxShadow: 'var(--shadow-sm)',
      border: 'var(--glass-border)'
    }}>
      {modes.map((btn) => {
        const Icon = btn.icon;
        const isSelected = mode === btn.id;
        return (
          <button 
            key={btn.id}
            onClick={() => setMode(btn.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              background: isSelected ? 'var(--bg-card)' : 'transparent',
              color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
              boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Icon size={13} />
            {btn.label}
          </button>
        );
      })}
    </div>
  );
}
