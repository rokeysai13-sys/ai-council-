import { useState, useEffect } from 'react';
import { missionsService } from '../services/api';

export default function useMissions() {
  const [selectedMissionId, setSelectedMissionId] = useState(null);
  const [missions, setMissions] = useState([]);

  const fetchMissionsList = async () => {
    try {
      const res = await missionsService.getMissions();
      if (res && res.missions) {
        setMissions(res.missions);
      }
    } catch (err) {
      console.error('Failed to load missions:', err);
    }
  };

  useEffect(() => {
    fetchMissionsList();
    const interval = setInterval(fetchMissionsList, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStartMission = async (goal, team, maxSteps, autonomy) => {
    try {
      const res = await missionsService.createMission(goal, team, maxSteps, autonomy);
      if (res && res.id) {
        setSelectedMissionId(res.id);
        fetchMissionsList();
      }
      return res;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleResumeMission = async (id) => {
    try {
      const res = await missionsService.resumeMission(id);
      fetchMissionsList();
      return res;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  return {
    missions,
    selectedMissionId,
    setSelectedMissionId,
    handleStartMission,
    handleResumeMission,
    fetchMissionsList
  };
}
