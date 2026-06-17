import React, { useState } from 'react';
import { Camera, Volume2, Send } from 'lucide-react';

export default function ChatInput({ 
  onSend, 
  onCapture, 
  onSpeakLast, 
  isLoading, 
  mode 
}) {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={{ 
      padding: '24px 32px', 
      borderTop: '1px solid var(--border-color)', 
      background: 'var(--bg-card)', 
      transition: 'background 0.3s ease' 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        
        {/* Quick Senses Toolbar */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {onCapture && (
            <button 
              onClick={onCapture}
              disabled={isLoading}
              style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                background: 'var(--bg-sidebar)', 
                color: 'var(--text-secondary)',
                border: 'var(--glass-border)',
                cursor: isLoading ? 'default' : 'pointer'
              }}
              title="Scan Current Screen"
            >
              <Camera size={18} />
            </button>
          )}
          {onSpeakLast && (
            <button 
              onClick={onSpeakLast}
              disabled={isLoading}
              style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                background: 'var(--bg-sidebar)', 
                color: 'var(--text-secondary)',
                border: 'var(--glass-border)',
                cursor: isLoading ? 'default' : 'pointer'
              }}
              title="Read Last Response Aloud"
            >
              <Volume2 size={18} />
            </button>
          )}
        </div>

        <form 
          onSubmit={handleSubmit} 
          style={{ 
            flex: 1, 
            display: 'flex', 
            gap: '12px', 
            background: 'var(--bg-sidebar)', 
            borderRadius: '24px', 
            padding: '6px 6px 6px 20px', 
            border: 'var(--glass-border)', 
            alignItems: 'center' 
          }}
        >
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${mode === 'master' ? 'Kirannn Master Agent' : 'the ' + mode + ' pipeline'}...`} 
            style={{ 
              flex: 1, 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-primary)', 
              outline: 'none', 
              fontFamily: 'var(--font-sans)', 
              fontSize: '14px' 
            }}
            disabled={isLoading}
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            style={{ 
              background: input.trim() && !isLoading ? 'var(--accent-primary)' : 'transparent', 
              color: input.trim() && !isLoading ? '#ffffff' : 'var(--text-muted)', 
              padding: '10px', 
              borderRadius: '50%', 
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              border: 'none',
              cursor: input.trim() && !isLoading ? 'pointer' : 'default'
            }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
