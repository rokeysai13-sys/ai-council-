import React, { useState, useEffect } from 'react';
import { memoryService, eventsService, ragService } from '../services/api';
import { Search, Clock, Database, Globe, PlusCircle, RefreshCw, Activity, Sparkles } from 'lucide-react';

export default function MemoryPage() {
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [stats, setStats] = useState(null);
  
  const [ingestPath, setIngestPath] = useState('');
  const [ingestUrl, setIngestUrl] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [newEntry, setNewEntry] = useState('');
  const [newSection, setNewSection] = useState('Recent Context');

  const fetchStats = async () => {
    try {
      const statsData = await memoryService.getStats();
      setStats(statsData);
    } catch (e) { console.error(e); }
  };

  const fetchTimeline = async () => {
    setLoadingTimeline(true);
    try {
      const evts = await eventsService.getEvents({ type: 'agent.memory_write', limit: 100 });
      evts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setTimelineEvents(evts);
    } catch (e) { console.error(e); }
    setLoadingTimeline(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'timeline') fetchTimeline();
  }, [activeTab]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await memoryService.searchMemory(searchQuery, 8);
      setSearchResults(results || []);
    } catch (err) { console.error(err); }
    setSearching(false);
  };

  const handleIngest = async (type, val, serviceFn, clearFn) => {
    if (!val.trim()) return;
    setIsIngesting(true);
    try {
      await serviceFn(val);
      clearFn('');
      fetchStats();
      alert(`${type} ingested successfully.`);
    } catch (err) { alert(`Ingestion failed: ${err.response?.data?.detail || err.message}`); }
    setIsIngesting(false);
  };

  const handleAddCustom = async (e) => {
    e.preventDefault();
    if (!newEntry.trim()) return;
    try {
      await memoryService.addMemory(newEntry, newSection);
      setNewEntry('');
      fetchStats();
      alert('Fact logged successfully.');
    } catch (err) { alert(err.message); }
  };

  const handleConsolidate = async () => {
    try {
      await memoryService.triggerEpisodicSummarize();
      alert('Episodic consolidation complete.');
      fetchStats();
    } catch (err) { alert(err.message); }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={24} color="var(--accent-secondary)" /> Swarm Memory Workspace
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Manage episodic consolidation, hybrid RAG embeddings, and blackboard memory logs.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="glass-panel" style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Embedding:</span> Nomnic Text
          </div>
          {stats && (
            <div className="glass-panel" style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Memories:</span> {stats.count || stats.total_entries || 0}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="apple-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <Activity size={16} color="var(--accent-success)" /> Vector Database status: <strong style={{ color: 'var(--accent-success)' }}>Active</strong>
          </div>
          <button onClick={handleConsolidate} className="apple-btn-secondary" style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={12} /> Consolidate
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)' }}>
        {['search', 'ingest', 'timeline'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: 'transparent', border: 'none', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
            borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)'
          }}>
            {tab === 'search' && <Search size={14} style={{ marginRight: '6px' }} />}
            {tab === 'ingest' && <Globe size={14} style={{ marginRight: '6px' }} />}
            {tab === 'timeline' && <Clock size={14} style={{ marginRight: '6px' }} />}
            <span style={{ textTransform: 'capitalize' }}>{tab === 'ingest' ? 'RAG Ingestion' : tab}</span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }}>
        {activeTab === 'search' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Query agent semantic memory..." className="apple-input" style={{ flex: 1, padding: '10px 14px' }} />
              <button type="submit" className="apple-btn" disabled={searching}>{searching ? 'Searching...' : 'Search'}</button>
            </form>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {searchResults.length > 0 ? searchResults.map((res, idx) => (
                <div key={idx} className="apple-card" style={{ padding: '12px', background: 'var(--bg-sidebar)', border: 'var(--glass-border)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{res.section || 'Memory Log'}</span>
                    {res.distance !== undefined && <span>Distance: {res.distance.toFixed(4)}</span>}
                  </div>
                  <p style={{ fontSize: '13px', margin: 0, color: 'var(--text-primary)' }}>{res.text || res.entry}</p>
                </div>
              )) : <div style={{ color: 'var(--text-muted)', padding: '20px', textAlign: 'center', fontSize: '13px' }}>No query results. Enter search terms above.</div>}
            </div>
          </div>
        )}

        {activeTab === 'ingest' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div className="apple-card">
                <h4 style={{ fontSize: '12px', margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>File Path (PDF, TXT, MD)</h4>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input type="text" placeholder="C:\docs\file.pdf" value={ingestPath} onChange={e => setIngestPath(e.target.value)} className="apple-input" />
                  <button onClick={() => handleIngest('File', ingestPath, ragService.ingestPath, setIngestPath)} className="apple-btn-secondary" disabled={isIngesting}>Ingest</button>
                </div>
              </div>
              <div className="apple-card">
                <h4 style={{ fontSize: '12px', margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>Web URL Indexer</h4>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input type="text" placeholder="https://example.com/docs" value={ingestUrl} onChange={e => setIngestUrl(e.target.value)} className="apple-input" />
                  <button onClick={() => handleIngest('URL', ingestUrl, ragService.ingestUrl, setIngestUrl)} className="apple-btn-secondary" disabled={isIngesting}>Scrape</button>
                </div>
              </div>
            </div>
            <div className="apple-card">
              <h4 style={{ fontSize: '13px', margin: '0 0 12px 0' }}><PlusCircle size={14} style={{ marginRight: '6px' }} />Log Custom Context</h4>
              <form onSubmit={handleAddCustom} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="text" value={newSection} onChange={e => setNewSection(e.target.value)} className="apple-input" placeholder="Category Section" />
                <textarea rows="3" value={newEntry} onChange={e => setNewEntry(e.target.value)} className="apple-input" placeholder="Fact details..." style={{ resize: 'none' }} />
                <button type="submit" className="apple-btn" style={{ alignSelf: 'flex-start' }}>Add Entry</button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button onClick={fetchTimeline} className="apple-btn-secondary" style={{ alignSelf: 'flex-end', fontSize: '11px', padding: '4px 8px' }} disabled={loadingTimeline}>Refresh</button>
            {loadingTimeline ? <div style={{ color: 'var(--text-muted)' }}>Loading timeline...</div> : timelineEvents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '2px solid var(--border-color)', paddingLeft: '16px' }}>
                {timelineEvents.map((evt, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-22px', top: '6px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)' }} />
                    <div className="apple-card" style={{ padding: '10px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        <strong>{evt.agent_id}</strong> &bull; {evt.payload?.key} &bull; {new Date(evt.timestamp).toLocaleTimeString()}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', background: 'var(--bg-sidebar)', padding: '6px', borderRadius: '4px' }}>{evt.payload?.preview}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No writes recorded.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
