import React, { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import CommandPalette from './components/layout/CommandPalette';
import ErrorBoundary from './components/shared/ErrorBoundary';
import MissionControlPage from './pages/MissionControlPage';
import ChatPage from './pages/ChatPage';
import MemoryPage from './pages/MemoryPage';
import GraphPage from './pages/GraphPage';
import AgentTeamsPage from './pages/AgentTeamsPage';
import SkillsPage from './pages/SkillsPage';
import SettingsPage from './pages/SettingsPage';
import AgentInspectorPage from './pages/AgentInspectorPage';
import useMissions from './hooks/useMissions';
import useSystemHealth from './hooks/useSystemHealth';
import useEventStream from './hooks/useEventStream';
import { skillsService } from './services/api';
import './index.css';

function App() {
  const [currentView, setView] = useState('mission');
  const [theme, setTheme] = useState(localStorage.getItem('kirannn_theme') || 'dark');
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  const { missions, selectedMissionId, setSelectedMissionId, handleStartMission, handleResumeMission } = useMissions();
  const { systemStatus, healthData, fetchHealth } = useSystemHealth();
  const { events, isConnected, clearEvents } = useEventStream(null);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('kirannn_theme', nextTheme);
  };

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const activeMission = missions.find(m => m.status === 'running') || 
                        missions.find(m => m.id === selectedMissionId || m.mission_id === selectedMissionId) ||
                        missions[0];

  const viewTitles = {
    mission: 'Mission Operations Center',
    chat: 'Agentic Chat Workspace',
    memory: 'Memory Core',
    graph: 'Visual Knowledge Graph',
    teams: 'Agent Swarm & Preset Teams',
    skills: 'Skills Studio',
    settings: 'Settings'
  };

  const currentAgentId = currentView.startsWith('agent:') ? currentView.split(':')[1] : null;

  return (
    <div className="app-container">
      <Sidebar 
        currentView={currentView} 
        setView={setView} 
        activeMission={activeMission}
        ollamaStatus={healthData?.ollama}
        eventCount={events.length}
      />
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <TopBar 
          theme={theme} 
          toggleTheme={toggleTheme} 
          isConnected={isConnected} 
          title={currentAgentId ? `Agent Profile: ${currentAgentId}` : (viewTitles[currentView] || 'Settings')}
        />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ErrorBoundary>
            {currentView === 'mission' && (
              <MissionControlPage 
                events={events}
                isConnected={isConnected}
                onStartMission={handleStartMission}
                onResumeMission={handleResumeMission}
                selectedMissionId={selectedMissionId}
                setSelectedMissionId={setSelectedMissionId}
                missions={missions}
                onClearEvents={clearEvents}
              />
            )}
            {currentView === 'chat' && <ChatPage />}
            {currentView === 'memory' && <MemoryPage />}
            {currentView === 'graph' && <GraphPage />}
            {currentView === 'teams' && <AgentTeamsPage />}
            {currentView === 'skills' && <SkillsPage />}
            {currentView === 'settings' && <SettingsPage healthData={healthData} refreshHealth={fetchHealth} />}
            {(currentView === 'agent' || currentAgentId) && <AgentInspectorPage agentId={currentAgentId} />}
          </ErrorBoundary>
        </div>
      </main>

      <CommandPalette 
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        setView={setView}
        onReloadSkills={async () => {
          try {
            await skillsService.reloadSkills();
            alert('Agent skills hot-reloaded successfully.');
          } catch (e) {
            alert('Failed to reload skills: ' + e.message);
          }
        }}
        onCaptureScreen={async () => {
          setView('chat');
          alert('Initiating screen capture. Output will stream in the Chat Workspace.');
        }}
        onMorningBrief={async () => {
          alert('Generating morning brief...');
        }}
      />
    </div>
  );
}

export default App;
