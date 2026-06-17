import React, { useState, useEffect } from 'react';
import { memoryService, eventsService } from '../../services/api';
import { Search, Clock, Database, BookOpen, User, RefreshCw, Server } from 'lucide-react';

export default function MemoryExplorer() {
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [memoryStats, setMemoryStats] = useState(null);

  // Fetch memory stats on load
  const fetchStats = async () => {
    try {
      const stats = await memoryService.getStats();
      setMemoryStats(stats);
    } catch (err) {
      console.error('Failed to load memory stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Fetch timeline events when switching to timeline tab
  const fetchTimeline = async () => {
    setLoadingTimeline(true);
    try {
      // Get all agent.memory_write events
      const evts = await eventsService.getEvents({ type: 'agent.memory_write', limit: 200 });
      // Sort by timestamp desc
      evts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setTimelineEvents(evts);
    } catch (err) {
      console.error('Failed to load memory timeline events:', err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'timeline') {
      fetchTimeline();
    }
  }, [activeTab]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const results = await memoryService.searchMemory(searchQuery, 15);
      setSearchResults(results || []);
    } catch (err) {
      console.error('Memory search error:', err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header and Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={24} color="var(--accent)" />
            Memory Explorer
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Inspect vectors, query long-term knowledge, and audit Blackboard memory writes in real-time.
          </p>
        </div>
        
        {memoryStats && (
          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '10px 16px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Memory Entries</span>
              <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {memoryStats.total_entries || 0}
              </span>
            </div>
            {memoryStats.sections && Object.keys(memoryStats.sections).length > 0 && (
              <div className="glass-panel" style={{ padding: '10px 16px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Categories</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {Object.keys(memoryStats.sections).length}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        borderBottom: '1px solid var(--surface-border)',
        paddingBottom: '2px'
      }}>
        <button
          onClick={() => setActiveTab('search')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'search' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'search' ? 'var(--text-primary)' : 'var(--text-muted)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Search size={16} />
          Search Memory
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'timeline' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'timeline' ? 'var(--text-primary)' : 'var(--text-muted)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Clock size={16} />
          Writes Timeline
        </button>
      </div>

      {/* Tab Panels */}
      <div style={{ flex: 1 }}>
        {activeTab === 'search' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Search Input Bar */}
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Query agent memory (e.g. database schema, project details, API endpoints)..."
                className="apple-input"
                style={{ flex: 1, padding: '12px 16px' }}
              />
              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="apple-btn"
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  padding: '0 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: searching ? 0.7 : 1
                }}
              >
                {searching ? <RefreshCw className="pulse-fast" size={16} /> : <Search size={16} />}
                Search
              </button>
            </form>

            {/* Results Grid */}
            {searching ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Performing hybrid search...
              </div>
            ) : searchResults.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {searchResults.map((res, idx) => (
                  <div key={idx} className="apple-card" style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--surface-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          background: 'var(--accent-dim)',
                          color: 'var(--accent)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {res.section || 'General'}
                        </span>
                        {res.score !== undefined && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            Score: {(res.score * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {res.timestamp ? new Date(res.timestamp).toLocaleString() : ''}
                      </span>
                    </div>
                    
                    <p style={{
                      fontSize: '13.5px',
                      color: 'var(--text-primary)',
                      margin: 0,
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {res.text || res.entry}
                    </p>
                  </div>
                ))}
              </div>
            ) : searchQuery ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--text-muted)'
              }}>
                No matches found. Try searching for different keywords.
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: 'var(--text-muted)',
                fontSize: '13px',
                fontStyle: 'italic'
              }}>
                Enter a query above to scan vector stores and semantic documents.
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Showing last {timelineEvents.length} memory write events
              </span>
              <button 
                onClick={fetchTimeline} 
                className="apple-btn" 
                style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                disabled={loadingTimeline}
              >
                <RefreshCw size={12} className={loadingTimeline ? 'pulse-fast' : ''} />
                Refresh
              </button>
            </div>

            {loadingTimeline ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Loading timeline logs...
              </div>
            ) : timelineEvents.length > 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                paddingLeft: '20px',
                borderLeft: '2px solid var(--surface-border)',
                marginLeft: '10px',
                gap: '24px'
              }}>
                {timelineEvents.map((evt, idx) => {
                  const timestamp = new Date(evt.timestamp).toLocaleTimeString();
                  const dateStamp = new Date(evt.timestamp).toLocaleDateString();
                  return (
                    <div key={idx} style={{ position: 'relative' }}>
                      {/* Timeline Node marker */}
                      <div style={{
                        position: 'absolute',
                        left: '-26px',
                        top: '4px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        boxShadow: '0 0 8px var(--accent)',
                        border: '2px solid var(--bg-primary)'
                      }} />
                      
                      <div className="apple-card" style={{
                        padding: '16px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--surface-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--accent-hover)'
                            }} />
                            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>
                              {evt.agent_id}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              updated Blackboard key:
                            </span>
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11.5px',
                              color: 'var(--accent)',
                              background: 'var(--accent-dim)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: '600'
                            }}>
                              {evt.payload?.key}
                            </span>
                          </div>
                          
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {dateStamp} {timestamp}
                          </span>
                        </div>

                        {evt.payload?.rationale && (
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            background: 'var(--bg-primary)',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            borderLeft: '2px solid var(--surface-border)',
                            fontStyle: 'italic'
                          }}>
                            Rationale: "{evt.payload.rationale}"
                          </div>
                        )}

                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11.5px',
                          color: 'var(--text-primary)',
                          background: 'var(--bg-primary)',
                          padding: '10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--surface-border)',
                          whiteSpace: 'pre-wrap',
                          maxHeight: '120px',
                          overflowY: 'auto'
                        }}>
                          {evt.payload?.preview}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--text-muted)'
              }}>
                No memory write events found in logs.
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
