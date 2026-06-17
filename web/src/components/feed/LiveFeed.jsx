import React, { useState, useEffect, useRef } from 'react';
import FeedItem from './FeedItem';
import { Filter, Trash2, ArrowDownCircle, Wifi, WifiOff } from 'lucide-react';

export default function LiveFeed({ events = [], isConnected = false, onClear = null }) {
  const [filter, setFilter] = useState('all');
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const containerRef = useRef(null);
  
  // Extract unique active agents from events list for filter dropdown
  const agents = ['all', ...new Set(events.map(e => e.agent_id).filter(Boolean))];
  
  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.agent_id === filter);

  useEffect(() => {
    if (containerRef.current && !userScrolledUp) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [filteredEvents, userScrolledUp]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    
    // If user is more than 60px from the bottom, consider it scrolled up
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 60;
    setUserScrolledUp(!isAtBottom);
  };

  const handleScrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      setUserScrolledUp(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--surface-border)',
      borderRadius: 'var(--radius-lg)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--surface-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.01)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Live Activity Feed</h3>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '10px',
            backgroundColor: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: isConnected ? 'var(--success)' : 'var(--error)',
            fontFamily: 'var(--font-mono)'
          }}>
            {isConnected ? (
              <>
                <Wifi size={10} /> Live
              </>
            ) : (
              <>
                <WifiOff size={10} /> Offline
              </>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
            <Filter size={12} color="var(--text-muted)" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                fontSize: '11px',
                backgroundColor: 'var(--bg-hover)',
                color: 'var(--text-primary)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '3px 8px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {agents.map(a => (
                <option key={a} value={a}>
                  {a === 'all' ? 'All Agents' : a}
                </option>
              ))}
            </select>
          </div>

          {onClear && (
            <button 
              onClick={onClear}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--error)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
              title="Clear Feed Logs"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Feed Area */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
          scrollBehavior: 'smooth'
        }}
      >
        {filteredEvents.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
            textAlign: 'center',
            padding: '0 24px'
          }}>
            <p style={{ margin: 0, fontSize: '13px' }}>Waiting for agent events...</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
              Start a mission to see real-time collaboration steps.
            </p>
          </div>
        ) : (
          filteredEvents.map((evt, idx) => (
            <FeedItem key={evt.id || idx} event={evt} />
          ))
        )}
      </div>

      {/* Scrolled Up Indicator */}
      {userScrolledUp && (
        <button
          onClick={handleScrollToBottom}
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: '20px',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: 'var(--shadow-md)',
            cursor: 'pointer',
            zIndex: 5
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--accent-hover)'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--accent)'}
        >
          <ArrowDownCircle size={12} /> New events below
        </button>
      )}
    </div>
  );
}
