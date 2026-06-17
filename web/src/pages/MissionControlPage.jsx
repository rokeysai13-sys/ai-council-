import React from 'react';
import MissionControl from '../components/mission/MissionControl';

export default function MissionControlPage({
  events,
  isConnected,
  onStartMission,
  onResumeMission,
  selectedMissionId,
  setSelectedMissionId,
  missions,
  onClearEvents
}) {
  return (
    <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <MissionControl 
        events={events}
        isConnected={isConnected}
        onStartMission={onStartMission}
        onResumeMission={onResumeMission}
        selectedMissionId={selectedMissionId}
        setSelectedMissionId={setSelectedMissionId}
        missions={missions}
        onClearEvents={onClearEvents}
      />
    </div>
  );
}
