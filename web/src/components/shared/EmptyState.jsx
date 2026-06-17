import React from 'react';
import * as Icons from 'lucide-react';

export default function EmptyState({ 
  icon: IconComponent, 
  title, 
  description, 
  actionText, 
  onAction 
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 32px',
      textAlign: 'center',
      background: 'var(--bg-elevated)',
      border: '1px dashed var(--surface-border)',
      borderRadius: 'var(--radius-lg)',
      color: 'var(--text-muted)',
      gap: '12px',
      width: '100%',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      {IconComponent && (
        <div style={{ 
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '4px'
        }}>
          {typeof IconComponent === 'string' ? (
            React.createElement(Icons[IconComponent] || Icons.HelpCircle, { size: 36, strokeWidth: 1.5 })
          ) : (
            <IconComponent size={36} strokeWidth={1.5} />
          )}
        </div>
      )}
      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
        {title}
      </h3>
      <p style={{ 
        fontSize: '12.5px', 
        color: 'var(--text-secondary)', 
        margin: 0, 
        maxWidth: '320px', 
        lineHeight: '1.5' 
      }}>
        {description}
      </p>
      {actionText && onAction && (
        <button 
          onClick={onAction}
          className="apple-btn"
          style={{ 
            marginTop: '8px', 
            padding: '8px 16px', 
            fontSize: '12px', 
            fontWeight: '600' 
          }}
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
