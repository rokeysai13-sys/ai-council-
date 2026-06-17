import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Volume2 } from 'lucide-react';

export default function ChatHistory({ messages, isLoading, onSpeakMessage, ttsActive }) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div style={{ 
      flex: 1, 
      padding: '32px', 
      overflowY: 'auto', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '24px' 
    }}>
      {messages.map((msg, idx) => (
        <div 
          key={idx} 
          style={{ 
            display: 'flex', 
            gap: '16px', 
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', 
            alignItems: 'flex-start' 
          }}
        >
          <div style={{ 
            width: '36px', 
            height: '36px', 
            minWidth: '36px', 
            borderRadius: '50%', 
            background: msg.role === 'user' ? 'var(--accent-primary-dim)' : 'var(--bg-sidebar)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--accent-secondary)',
            border: 'var(--glass-border)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
          </div>
          <div style={{ 
            background: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-card)', 
            padding: '16px 20px', 
            borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', 
            border: 'var(--glass-border)', 
            maxWidth: '75%',
            color: msg.role === 'user' ? '#ffffff' : 'var(--text-primary)',
            boxShadow: 'var(--shadow-sm)',
            transition: 'background 0.3s ease, color 0.3s ease'
          }}>
            {msg.role === 'user' ? (
              <p style={{ margin: 0, color: 'inherit', fontSize: '14.5px' }}>{msg.content}</p>
            ) : (
              <div className="markdown-body">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            )}
            {msg.metadata && (
              <div style={{ 
                marginTop: '12px', 
                fontSize: '11px', 
                color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', 
                borderTop: msg.role === 'user' ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border-color)', 
                paddingTop: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>Mode: {msg.metadata.mode || 'standard'}</span>
                {msg.role !== 'user' && onSpeakMessage && (
                  <button 
                    onClick={() => onSpeakMessage(msg.content)} 
                    style={{ 
                      background: 'transparent', 
                      border: 'none', 
                      color: 'inherit', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      padding: 0,
                      cursor: 'pointer'
                    }}
                  >
                    <Volume2 size={12} /> {ttsActive ? 'Speaking...' : 'Speak'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {isLoading && (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '50%', 
            background: 'var(--bg-sidebar)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'var(--text-muted)', 
            border: 'var(--glass-border)' 
          }}>
            <Bot size={18} />
          </div>
          <div style={{ 
            background: 'var(--bg-card)', 
            padding: '16px 20px', 
            borderRadius: '18px 18px 18px 4px', 
            border: 'var(--glass-border)', 
            boxShadow: 'var(--shadow-sm)' 
          }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '14px' }}>
              <span className="status-dot active" style={{ width: '6px', height: '6px', background: 'var(--text-muted)', boxShadow: 'none' }}></span>
              <span className="status-dot active" style={{ width: '6px', height: '6px', background: 'var(--text-muted)', boxShadow: 'none', animationDelay: '0.2s' }}></span>
              <span className="status-dot active" style={{ width: '6px', height: '6px', background: 'var(--text-muted)', boxShadow: 'none', animationDelay: '0.4s' }}></span>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
