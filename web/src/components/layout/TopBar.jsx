import React, { useState } from 'react';
import { Key, Moon, Sun, Wifi, WifiOff } from 'lucide-react';
import StatusDot from '../shared/StatusDot';

export default function TopBar({ theme, toggleTheme, isConnected = false, ollamaStatus = null, title = 'Dashboard' }) {
  const [apiKey, setApiKey] = useState(localStorage.getItem('kirannn_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);

  const saveApiKey = () => {
    localStorage.setItem('kirannn_api_key', apiKey);
    setShowKeyInput(false);
    alert('API Key updated successfully.');
  };

  return (
    <header style={{
      height: '60px',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid var(--surface-border)',
      background: 'var(--bg-secondary)',
      zIndex: 5,
      transition: 'background 0.3s ease, border-bottom 0.3s ease'
    }}>
      {/* Title / Subtext */}
      <div>
        <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
          {title}
        </h2>
      </div>

      {/* Right Toolbar Options */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        
        {/* Connection status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <StatusDot state={isConnected ? 'completed' : 'failed'} size="6px" />
          <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>
            {isConnected ? 'Server Online' : 'Connecting...'}
          </span>
        </div>

        {/* API Key settings dropdown button */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowKeyInput(!showKeyInput)}
            style={{ 
              color: 'var(--text-secondary)', 
              padding: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px'
            }}
            onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
            title="API Key Configuration"
          >
            <Key size={16} />
          </button>
          
          {showKeyInput && (
            <div className="glass-panel" style={{
              position: 'absolute',
              right: 0,
              top: '32px',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              width: '240px',
              zIndex: 100,
              boxShadow: 'var(--shadow-lg)',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--surface-border)'
            }}>
              <h4 style={{ fontSize: '12px', marginBottom: '8px', color: 'var(--text-primary)' }}>X-API-KEY Configuration</h4>
              <input 
                type="password"
                placeholder="Enter password..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="apple-input"
                style={{ fontSize: '12px', padding: '6px 10px', marginBottom: '10px' }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => { localStorage.removeItem('kirannn_api_key'); setApiKey(''); setShowKeyInput(false); }}
                  style={{ fontSize: '11px', color: 'var(--error)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  Clear
                </button>
                <button 
                  onClick={saveApiKey}
                  className="apple-btn"
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button 
          onClick={toggleTheme} 
          style={{ 
            color: 'var(--text-secondary)', 
            padding: '6px',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px'
          }}
          onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'}
          onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>
    </header>
  );
}
