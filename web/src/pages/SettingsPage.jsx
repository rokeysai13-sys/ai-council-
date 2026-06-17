import React, { useState } from 'react';
import { Key, Activity } from 'lucide-react';

export default function SettingsPage({ healthData, refreshHealth }) {
  const [apiKeyVal, setApiKeyVal] = useState(localStorage.getItem('kirannn_api_key') || '');
  
  const saveKey = () => {
    localStorage.setItem('kirannn_api_key', apiKeyVal);
    alert('Settings Saved');
  };

  return (
    <div className="animate-fade-in" style={{ flex: 1, padding: '32px', overflowY: 'auto', background: 'var(--bg-color)', display: 'flex', flexDirection: 'column', gap: '32px', height: '100%' }}>
      <div>
        <h1 style={{ fontSize: '28px', letterSpacing: '-0.025em', marginBottom: '8px' }}>System Settings</h1>
        <p>Monitor local service health, Ollama status, and security keys.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'start' }}>
        {/* API Credentials */}
        <div className="apple-card">
          <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Key size={18} color="var(--accent-primary)" />
            Security & Authentication
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>X-API-KEY</label>
              <input 
                type="password" 
                value={apiKeyVal} 
                onChange={(e) => setApiKeyVal(e.target.value)} 
                className="apple-input" 
                placeholder="Set backend authorization code..."
              />
            </div>
            <button onClick={saveKey} className="apple-btn">Save Configurations</button>
          </div>
        </div>

        {/* Diagnostics Info */}
        <div className="apple-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="var(--accent-secondary)" />
              Diagnostics Dashboard
            </h3>
            <button onClick={refreshHealth} className="apple-btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>
              Refresh
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>FastAPI Port:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>8000</span>
            </div>
            {healthData ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Ollama Backend:</span>
                  <span style={{ fontWeight: '600', color: healthData.ollama === 'ok' ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                    {healthData.ollama === 'ok' ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Vector Collections:</span>
                  <span style={{ fontWeight: '600' }}>{healthData.memory ? 'Chroma Vector DB Linked' : 'Failed'}</span>
                </div>
                {healthData.models && healthData.models.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Available Ollama Models:</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {healthData.models.map((m, idx) => (
                        <span key={idx} style={{ 
                          fontSize: '11px', 
                          padding: '2px 8px', 
                          background: 'var(--bg-sidebar)', 
                          border: 'var(--glass-border)', 
                          borderRadius: '6px',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Connection to diagnostics failed.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
