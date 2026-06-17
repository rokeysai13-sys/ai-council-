import React from 'react';

export default function ProgressBar({ value = 0, height = '4px', color = 'var(--accent-gradient)' }) {
  const percent = Math.min(100, Math.max(0, typeof value === 'number' && value <= 1 ? value * 100 : value));
  
  return (
    <div style={{
      width: '100%',
      height: height,
      backgroundColor: 'var(--bg-hover)',
      borderRadius: '10px',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div style={{
        width: `${percent}%`,
        height: '100%',
        background: color.includes('var(') || color.includes('linear-') ? color : `var(--agent-${color.toLowerCase()}, ${color})`,
        borderRadius: '10px',
        transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }} />
    </div>
  );
}
