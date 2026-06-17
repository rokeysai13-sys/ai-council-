import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, Compass, Terminal, Bot, BookOpen, Zap, Settings, Camera, HelpCircle, FileText } from 'lucide-react';

export default function CommandPalette({ isOpen, onClose, setView, onReloadSkills, onCaptureScreen, onMorningBrief }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const commandItems = [
    { label: 'Go to Mission Control', category: 'Navigation', icon: Compass, action: () => setView('mission') },
    { label: 'Go to Chat Workspace', category: 'Navigation', icon: Terminal, action: () => setView('chat') },
    { label: 'Go to Agent Teams', category: 'Navigation', icon: Bot, action: () => setView('teams') },
    { label: 'Go to Memory Core', category: 'Navigation', icon: BookOpen, action: () => setView('memory') },
    { label: 'Go to Skills Studio', category: 'Navigation', icon: Zap, action: () => setView('skills') },
    { label: 'Go to Settings', category: 'Navigation', icon: Settings, action: () => setView('settings') },
    
    { label: 'Reload Agent Skills', category: 'System', icon: Zap, action: () => onReloadSkills?.() },
    { label: 'Capture Screen & OCR', category: 'System', icon: Camera, action: () => onCaptureScreen?.() },
    { label: 'Generate Morning Brief', category: 'System', icon: FileText, action: () => onMorningBrief?.() }
  ];

  // Filter commands by query
  const filtered = commandItems.filter(item => 
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Let modal fade-in settle before focusing input
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()} // stop click bubbling
        style={{
          width: '560px',
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Search input header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          borderBottom: '1px solid var(--surface-border)'
        }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or navigate..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '15px',
              fontFamily: 'var(--font-sans)'
            }}
          />
          <div style={{
            fontSize: '9px',
            fontFamily: 'var(--font-mono)',
            backgroundColor: 'var(--bg-hover)',
            padding: '2px 6px',
            borderRadius: '4px',
            color: 'var(--text-muted)',
            border: '1px solid var(--surface-border)'
          }}>
            ESC
          </div>
        </div>

        {/* Command list */}
        <div style={{
          maxHeight: '360px',
          overflowY: 'auto',
          padding: '8px'
        }}>
          {filtered.length === 0 ? (
            <div style={{
              padding: '24px',
              color: 'var(--text-muted)',
              textAlign: 'center',
              fontSize: '13px'
            }}>
              No commands found matching "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.label}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isSelected ? 'var(--accent-dim)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s ease'
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Icon size={14} color={isSelected ? 'var(--accent)' : 'var(--text-secondary)'} />
                    <span style={{ 
                      fontSize: '13px', 
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: isSelected ? '600' : '500'
                    }}>
                      {item.label}
                    </span>
                  </div>
                  <span style={{ 
                    fontSize: '10px', 
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
