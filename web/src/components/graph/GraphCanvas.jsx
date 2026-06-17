import React, { useState, useEffect, useRef } from 'react';

export default function GraphCanvas({
  nodes,
  setNodes,
  links,
  loading,
  filters,
  searchQuery,
  selectedNode,
  setSelectedNode,
  width = 800,
  height = 600
}) {
  const [, setTick] = useState(0);
  const svgRef = useRef(null);
  const draggedNodeRef = useRef(null);
  const simulationRef = useRef(null);

  // Physics simulation loop
  useEffect(() => {
    if (nodes.length === 0) return;

    const runPhysicsSimulation = () => {
      // Repulsion force between nodes
      for (let i = 0; i < nodes.length; i++) {
        let n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          let n2 = nodes[j];
          let dx = n2.x - n1.x;
          let dy = n2.y - n1.y;
          if (dx === 0) dx = 0.1;
          let dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1) dist = 1;

          let force = 300 / (dist * dist);
          if (dist < 70) force += (70 - dist) * 0.15;
          let fx = (dx / dist) * force;
          let fy = (dy / dist) * force;

          if (!n1.dragged) { n1.vx -= fx; n1.vy -= fy; }
          if (!n2.dragged) { n2.vx += fx; n2.vy += fy; }
        }
      }

      // Spring connection force between linked nodes
      links.forEach(link => {
        let sourceNode = nodes.find(n => n.id === link.source);
        let targetNode = nodes.find(n => n.id === link.target);
        if (sourceNode && targetNode) {
          if (!filters[sourceNode.type] || !filters[targetNode.type]) return;

          let dx = targetNode.x - sourceNode.x;
          let dy = targetNode.y - sourceNode.y;
          if (dx === 0) dx = 0.1;
          let dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1) dist = 1;

          let restLength = 110;
          let k = 0.035;
          let force = k * (dist - restLength);
          let fx = (dx / dist) * force;
          let fy = (dy / dist) * force;

          if (!sourceNode.dragged) { sourceNode.vx += fx; sourceNode.vy += fy; }
          if (!targetNode.dragged) { targetNode.vx -= fx; targetNode.vy -= fy; }
        }
      });

      // Gravity and boundaries
      nodes.forEach(node => {
        if (node.dragged) return;

        let dx = width / 2 - node.x;
        let dy = height / 2 - node.y;
        node.vx += dx * 0.006;
        node.vy += dy * 0.006;

        node.vx *= 0.82;
        node.vy *= 0.82;

        node.x += node.vx;
        node.y += node.vy;

        node.x = Math.max(30, Math.min(width - 30, node.x));
        node.y = Math.max(30, Math.min(height - 30, node.y));
      });

      setTick(t => t + 1);
      simulationRef.current = requestAnimationFrame(runPhysicsSimulation);
    };

    simulationRef.current = requestAnimationFrame(runPhysicsSimulation);
    return () => cancelAnimationFrame(simulationRef.current);
  }, [nodes, links, filters, width, height]);

  // Drag and drop handlers
  const handleMouseDown = (e, node) => {
    e.preventDefault();
    node.dragged = true;
    draggedNodeRef.current = node;
  };

  const handleMouseMove = (e) => {
    if (!draggedNodeRef.current) return;
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;

    draggedNodeRef.current.x = x;
    draggedNodeRef.current.y = y;
    draggedNodeRef.current.vx = 0;
    draggedNodeRef.current.vy = 0;
    setTick(t => t + 1);
  };

  const handleMouseUp = () => {
    if (draggedNodeRef.current) {
      draggedNodeRef.current.dragged = false;
      draggedNodeRef.current = null;
    }
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Filter nodes & links
  const filteredNodes = nodes.filter(n => {
    if (!filters[n.type]) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchLabel = n.label.toLowerCase().includes(q);
      const matchDetails = typeof n.details === 'string' 
        ? n.details.toLowerCase().includes(q) 
        : JSON.stringify(n.details).toLowerCase().includes(q);
      return matchLabel || matchDetails;
    }
    return true;
  });

  const filteredLinks = links.filter(l => {
    const srcNode = nodes.find(n => n.id === l.source);
    const tgtNode = nodes.find(n => n.id === l.target);
    if (!srcNode || !tgtNode) return false;
    return filters[srcNode.type] && filters[tgtNode.type];
  });

  const getNodeRadius = (type) => {
    if (type === 'system') return 24;
    if (type === 'project') return 20;
    if (type === 'mission') return 18;
    return 14;
  };

  const getNodeEmoji = (type) => {
    if (type === 'system') return '🤖';
    if (type === 'project') return '📁';
    if (type === 'mission') return '🎯';
    if (type === 'decision') return '💡';
    if (type === 'memory') return '🧠';
    return '•';
  };

  return (
    <div 
      className="graph-canvas-wrapper" 
      onMouseMove={handleMouseMove} 
      style={{ flex: 1, height: '100%', position: 'relative' }}
    >
      {loading ? (
        <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          Loading Visual Graph details...
        </div>
      ) : (
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="graph-svg" style={{ width: '100%', height: '100%', display: 'block' }}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--border-color)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {filteredLinks.map((link, idx) => {
            const srcNode = nodes.find(n => n.id === link.source);
            const tgtNode = nodes.find(n => n.id === link.target);
            if (!srcNode || !tgtNode) return null;
            const isFlowing = link.type === 'system' || link.type === 'mission-project';
            return (
              <line 
                key={idx}
                x1={srcNode.x}
                y1={srcNode.y}
                x2={tgtNode.x}
                y2={tgtNode.y}
                className={`graph-link ${isFlowing ? 'flowing' : ''}`}
              />
            );
          })}

          {filteredNodes.map(node => {
            const radius = getNodeRadius(node.type);
            const isSelected = selectedNode && selectedNode.id === node.id;
            
            return (
              <g key={node.id}>
                <circle 
                  cx={node.x}
                  cy={node.y}
                  r={isSelected ? radius + 4 : radius}
                  className={`graph-node node-${node.type}`}
                  style={{ stroke: isSelected ? 'var(--text-primary)' : 'none', strokeWidth: 2 }}
                  onMouseDown={(e) => handleMouseDown(e, node)}
                  onClick={() => setSelectedNode(node)}
                />
                <text 
                  x={node.x}
                  y={node.y + 4}
                  textAnchor="middle"
                  style={{ fontSize: '13px', pointerEvents: 'none', userSelect: 'none' }}
                >
                  {getNodeEmoji(node.type)}
                </text>
                <text 
                  x={node.x}
                  y={node.y + radius + 14}
                  className="node-text"
                  style={{ fontSize: '10px', fill: 'var(--text-secondary)', fontWeight: isSelected ? '600' : 'normal' }}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
