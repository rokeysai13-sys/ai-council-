import React from 'react';
import { 
  Bot, Terminal, BookOpen, Globe, Zap, Settings, 
  Cpu, Activity, Command, Compass, HelpCircle, CheckCircle2 
} from 'lucide-react';
import ProgressBar from '../shared/ProgressBar';
import StatusDot from '../shared/StatusDot';

export default function Sidebar({ currentView, setView, activeMission = null, ollamaStatus = null, eventCount = 0 }) {
  const navItems = [
    { id: 'mission', label: 'Mission Control', icon: Compass },
    { id: 'chat', label: 'Chat Workspace', icon: Terminal },
    { id: 'teams', label: 'Agent Teams', icon: Bot },
    { id: 'memory', label: 'Memory Core', icon: BookOpen },
    { id: 'skills', label: 'Skills Studio', icon: Zap },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside style={{
      width: '260px',
      minWidth: '260px',
      height: '100%',
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--surface-border)',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none'
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '24px 20px',
        borderBottom: '1px solid var(--surface-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            background: 'var(--accent-gradient)',
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '15px',
            fontWeight: 'bold',
            boxShadow: 'var(--accent-glow)'
          }}>K</span>
          <span style={{ 
            fontSize: '18px', 
            fontWeight: 700, 
            letterSpacing: '-0.02em', 
            color: 'var(--text-primary)' 
          }}>
            Kirannn OS <span style={{ fontWeight: 300, fontSize: '11px', color: 'var(--accent)' }}>v0.9</span>
          </span>
        </div>
        <div style={{ 
          fontSize: '10px', 
          color: 'var(--text-muted)', 
          textTransform: 'uppercase', 
          letterSpacing: '0.05em', 
          fontWeight: 600,
          marginTop: '2px'
        }}>
          Agent Operating System
        </div>
      </div>

      {/* Nav Menu */}
      <nav style={{
        padding: '20px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        flex: 1,
        overflowY: 'auto'
      }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent-dim)' : 'transparent',
                fontWeight: isActive ? '600' : '500',
                fontSize: '13.5px',
                width: '100%',
                textAlign: 'left',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.target.style.background = 'var(--bg-hover)';
                  e.target.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.target.style.background = 'transparent';
                  e.target.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
        
        {/* Active Mission Block */}
        {activeMission && (
          <div style={{
            marginTop: '20px',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--surface-border)'
          }}>
            <div style={{ 
              fontSize: '10px', 
              textTransform: 'uppercase', 
              color: 'var(--text-muted)', 
              fontWeight: 600,
              marginBottom: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Active Mission</span>
              <StatusDot state={activeMission.status} size="6px" />
            </div>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: 600, 
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginBottom: '8px'
            }}>
              {activeMission.goal}
            </div>
            
            <ProgressBar 
              value={activeMission.progress?.current_step / activeMission.max_steps || 0} 
              height="3px"
            />
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: '10px', 
              color: 'var(--text-muted)',
              marginTop: '6px',
              fontFamily: 'var(--font-mono)'
            }}>
              <span>Step {activeMission.progress?.current_step || 0}/{activeMission.max_steps}</span>
              <span>{Math.round((activeMission.progress?.current_step / activeMission.max_steps) * 100 || 0)}%</span>
            </div>
          </div>
        )}
      </nav>

      {/* Footer / System Status */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--surface-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        fontSize: '11px',
        color: 'var(--text-muted)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cpu size={12} color="var(--text-muted)" />
            <span>Ollama Node:</span>
          </div>
          <span style={{ 
            color: ollamaStatus === 'ok' ? 'var(--success)' : 'var(--error)', 
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {ollamaStatus === 'ok' ? 'Online' : 'Offline'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justify: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={12} color="var(--text-muted)" />
            <span>Events Today:</span>
          </div>
          <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            {eventCount.toLocaleString()}
          </span>
        </div>

        {/* Command Palette Trigger Hint */}
        <div style={{
          marginTop: '6px',
          padding: '6px 10px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--bg-hover)',
          border: '1px solid var(--surface-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: 'var(--text-secondary)',
          cursor: 'pointer'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Command size={10} />
            <span style={{ fontSize: '10px' }}>Quick Palette</span>
          </div>
          <span style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: '9px',
            backgroundColor: 'var(--bg-elevated)',
            padding: '1px 4px',
            borderRadius: '3px',
            border: '1px solid var(--surface-border)'
          }}>
            Ctrl+K
          </span>
        </div>
      </div>
    </aside>
  );
}
