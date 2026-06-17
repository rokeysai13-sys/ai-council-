import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          flex: 1,
          padding: '48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-color)',
          color: 'var(--text-primary)',
          textAlign: 'center',
          height: '100%',
          gap: '16px'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--error-dim)',
            color: 'var(--accent-danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '8px'
          }}>
            <AlertTriangle size={32} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Something went wrong</h2>
          <p style={{ 
            fontSize: '14px', 
            color: 'var(--text-secondary)', 
            maxWidth: '400px', 
            margin: 0,
            lineHeight: '1.5'
          }}>
            {this.state.error?.message || 'An unexpected rendering error occurred inside this workspace.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="apple-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              marginTop: '8px'
            }}
          >
            <RefreshCw size={14} /> Retry Rendering
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
