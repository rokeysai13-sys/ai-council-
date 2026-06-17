import React, { useState, useEffect } from 'react';
import { projectsService, missionsService, decisionsService, chatService } from '../services/api';
import GraphCanvas from '../components/graph/GraphCanvas';
import GraphToolbar from '../components/graph/GraphToolbar';
import GraphLegend from '../components/graph/GraphLegend';
import GraphInspector from '../components/graph/GraphInspector';

export default function GraphPage() {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    system: true,
    project: true,
    mission: true,
    decision: true,
    memory: true
  });

  const width = 800;
  const height = 600;

  const loadGraphData = async () => {
    setLoading(true);
    try {
      const [projData, missData, decData, histData] = await Promise.all([
        projectsService.getProjects(),
        missionsService.getMissions(),
        decisionsService.getDecisions(),
        chatService.getHistory()
      ]);

      const projects = projData.projects || [];
      const missions = missData.missions || [];
      const decisions = Array.isArray(decData) ? decData : [];
      const history = Array.isArray(histData) ? histData : [];

      const graphNodes = [
        { id: 'system:jarvis', label: 'Jarvis Core', type: 'system', details: 'Central orchestration engine coordinating task planning, critique, research, self-coding, and automation.' },
        { id: 'system:browser', label: 'Browser Agent', type: 'system', details: 'Provides headless browser control to navigate, scrape, and verify web interfaces.' },
        { id: 'system:mission', label: 'Mission Engine', type: 'system', details: 'Manages stateful long-running execution loops with self-corrective capabilities and team-based agent coordination.' },
        { id: 'system:memory', label: 'Memory System', type: 'system', details: 'Coordinates local SQLite conversation logging and database persistence.' },
        { id: 'system:voice', label: 'Voice System', type: 'system', details: 'Provides text-to-speech rendering and speech transcription.' }
      ];

      const graphLinks = [
        { source: 'system:browser', target: 'system:jarvis', type: 'system' },
        { source: 'system:mission', target: 'system:jarvis', type: 'system' },
        { source: 'system:memory', target: 'system:jarvis', type: 'system' },
        { source: 'system:voice', target: 'system:jarvis', type: 'system' }
      ];

      projects.forEach(p => {
        graphNodes.push({ id: `project:${p.name}`, label: p.name, type: 'project', details: p });
        graphLinks.push({ source: `project:${p.name}`, target: 'system:memory', type: 'project' });
      });

      missions.forEach(m => {
        graphNodes.push({ id: `mission:${m.mission_id}`, label: `Mission ${m.mission_id}`, type: 'mission', details: m });
        graphLinks.push({ source: `mission:${m.mission_id}`, target: 'system:mission', type: 'mission' });
        projects.forEach(p => {
          if (m.goal.toLowerCase().includes(p.name.toLowerCase())) {
            graphLinks.push({ source: `mission:${m.mission_id}`, target: `project:${p.name}`, type: 'mission-project' });
          }
        });
      });

      decisions.forEach((d, i) => {
        const id = `decision:${d.mission_id || 'global'}_${i}`;
        graphNodes.push({ id, label: d.decision_type.toUpperCase(), type: 'decision', details: d });
        if (d.mission_id && missions.some(m => m.mission_id === d.mission_id)) {
          graphLinks.push({ source: id, target: `mission:${d.mission_id}`, type: 'decision' });
        } else {
          graphLinks.push({ source: id, target: 'system:mission', type: 'decision' });
        }
      });

      history.slice(0, 8).forEach((h, i) => {
        const id = `memory:${h.id || i}`;
        graphNodes.push({ id, label: `Memory #${h.id || i}`, type: 'memory', details: h });
        graphLinks.push({ source: id, target: 'system:memory', type: 'memory' });
      });

      const positionedNodes = graphNodes.map(n => {
        let x = width / 2 + (Math.random() - 0.5) * 300;
        let y = height / 2 + (Math.random() - 0.5) * 300;
        if (n.id === 'system:jarvis') {
          x = width / 2; y = height / 2;
        } else if (n.type === 'system') {
          const idx = ['system:browser', 'system:mission', 'system:memory', 'system:voice'].indexOf(n.id);
          const angle = (idx * Math.PI) / 2;
          x = width / 2 + Math.cos(angle) * 120;
          y = height / 2 + Math.sin(angle) * 120;
        }
        return { ...n, x, y, vx: 0, vy: 0, dragged: false };
      });

      setNodes(positionedNodes);
      setLinks(graphLinks);
    } catch (e) {
      console.error('Error loading graph details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraphData();
  }, []);

  return (
    <div className="graph-container animate-fade-in" style={{ display: 'flex', gap: '16px', flex: 1, height: '100%', position: 'relative', overflow: 'hidden', padding: '16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '180px', flexShrink: 0 }}>
        <GraphToolbar 
          filters={filters} 
          setFilters={setFilters} 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          onReset={loadGraphData} 
        />
        <GraphLegend />
      </div>

      <GraphCanvas 
        nodes={nodes}
        setNodes={setNodes}
        links={links}
        loading={loading}
        filters={filters}
        searchQuery={searchQuery}
        selectedNode={selectedNode}
        setSelectedNode={setSelectedNode}
        width={width}
        height={height}
      />

      <GraphInspector 
        selectedNode={selectedNode}
        setSelectedNode={setSelectedNode}
        nodes={nodes}
        links={links}
      />
    </div>
  );
}
