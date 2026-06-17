import React, { useState, useEffect } from 'react';
import { Sparkles, Zap, RefreshCw, Cpu } from 'lucide-react';
import { skillsService } from '../services/api';
import EmptyState from '../components/shared/EmptyState';

export default function SkillsPage() {
  const [skills, setSkills] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [capability, setCapability] = useState('');

  const loadSkills = async () => {
    try {
      const res = await skillsService.getSkills();
      setSkills(res.skills || []);
    } catch (err) {
      console.error('Failed to load skills:', err);
    }
  };

  useEffect(() => {
    loadSkills();
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!capability.trim()) return;
    setIsGenerating(true);
    try {
      const res = await skillsService.generateSkill(capability);
      setCapability('');
      await loadSkills();
      alert(`Skill generated and written to ${res.skill_path || 'skills_hub'}. Run reload below to compile it.`);
    } catch (err) {
      alert('Generation error: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReload = async () => {
    setIsReloading(true);
    try {
      await skillsService.reloadSkills();
      alert('Skills hot-loaded into active agent swarm.');
      await loadSkills();
    } catch (err) {
      alert('Hot-reload error: ' + err.message);
    } finally {
      setIsReloading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ flex: 1, padding: '32px', overflowY: 'auto', background: 'var(--bg-color)', display: 'flex', flexDirection: 'column', gap: '32px', height: '100%' }}>
      <div>
        <h1 style={{ fontSize: '28px', letterSpacing: '-0.025em', marginBottom: '8px' }}>Skills Studio</h1>
        <p>Command the self-coding agent to build, test, and hot-load new Python skills.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
        {/* Generator */}
        <div className="apple-card">
          <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Sparkles size={18} color="var(--accent-primary)" />
            Self-Code Generator
          </h3>
          <p style={{ fontSize: '13px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
            Describe a function or integration. The coder agent will generate the Python code, run tests, and save the module locally.
          </p>
          <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <textarea 
              rows="4"
              value={capability}
              onChange={(e) => setCapability(e.target.value)}
              className="apple-input"
              placeholder="e.g. Write a skill to scrape a weather API for Hyderabad and calculate average humidity..."
              style={{ resize: 'none' }}
              disabled={isGenerating}
            />
            <button type="submit" className="apple-btn" disabled={isGenerating}>
              {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : 'Synthesize Skill'}
            </button>
          </form>
        </div>

        {/* Loader/Reload */}
        <div className="apple-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="var(--accent-warning)" />
              Swarm Skill Hub
            </h3>
            {skills.length > 0 && (
              <button 
                onClick={handleReload} 
                disabled={isReloading} 
                className="apple-btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                {isReloading ? 'Reloading...' : 'Hot Reload'}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
            {skills.length > 0 ? (
              skills.map((sk, idx) => (
                <div key={idx} style={{ 
                  padding: '12px', 
                  background: 'var(--bg-sidebar)', 
                  borderRadius: 'var(--radius-sm)', 
                  border: 'var(--glass-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: '600' }}>{sk.name}</h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Size: {(sk.size/1024).toFixed(2)} KB</span>
                  </div>
                  <span style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--bg-card)', border: 'var(--glass-border)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                    Active
                  </span>
                </div>
              ))
            ) : (
              <EmptyState
                icon={Cpu}
                title="No Custom Skills Found"
                description="Describe a capability to have the self-coding agent synthesize a custom Python skill."
                actionText="Trigger Hot Reload"
                onAction={handleReload}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
