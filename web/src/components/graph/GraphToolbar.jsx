import React from 'react';

const FILTER_TYPES = [
  { id: 'system', emoji: '🤖', label: 'System' },
  { id: 'project', emoji: '📁', label: 'Project' },
  { id: 'mission', emoji: '🎯', label: 'Mission' },
  { id: 'decision', emoji: '💡', label: 'Decision' },
  { id: 'memory', emoji: '🧠', label: 'Memory' }
];

export default function GraphToolbar({ 
  filters, 
  setFilters, 
  searchQuery, 
  setSearchQuery, 
  onReset 
}) {
  return (
    <div className="graph-controls-panel glass-panel" style={{
      padding: '12px',
      borderRadius: '8px',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      width: '180px',
      flexShrink: 0
    }}>
      <div>
        <h4 style={{ 
          fontSize: '12px', 
          fontWeight: '600', 
          color: 'var(--text-primary)', 
          marginBottom: '8px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '4px'
        }}>
          Filters
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {FILTER_TYPES.map((type) => (
            <label 
              key={type.id} 
              className="graph-filter-item" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                fontSize: '11px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <input 
                type="checkbox" 
                checked={filters[type.id] ?? false} 
                onChange={() => setFilters(prev => ({ ...prev, [type.id]: !prev[type.id] }))}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>{type.emoji}</span>
                <span style={{ textTransform: 'capitalize' }}>{type.label}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label style={{ 
          fontSize: '11px', 
          fontWeight: '500', 
          color: 'var(--text-muted)',
          display: 'block',
          marginBottom: '4px'
        }}>
          Search
        </label>
        <input 
          type="text" 
          placeholder="Search nodes..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="apple-input"
          style={{ 
            width: '100%',
            padding: '6px 10px', 
            fontSize: '11px',
            background: 'var(--bg-sidebar)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            color: 'var(--text-primary)'
          }}
        />
      </div>

      <button 
        onClick={onReset} 
        className="apple-btn-secondary" 
        style={{ 
          width: '100%', 
          padding: '6px', 
          fontSize: '11px',
          marginTop: '4px',
          cursor: 'pointer'
        }}
      >
        Reset Graph Nodes
      </button>
    </div>
  );
}
