import { useState, useEffect } from 'react';
import { systemService } from '../services/api';

export default function useSystemHealth() {
  const [systemStatus, setSystemStatus] = useState('connecting');
  const [healthData, setHealthData] = useState(null);

  const fetchHealth = async () => {
    try {
      const res = await systemService.getHealth();
      setHealthData(res);
      if (res && res.api === 'ok') {
        setSystemStatus('online');
      } else {
        const ping = await systemService.getStatus();
        if (ping && ping.status === 'ok') {
          setSystemStatus('online');
        } else {
          setSystemStatus('offline');
        }
      }
    } catch (err) {
      console.error('Failed to fetch health status:', err);
      setSystemStatus('offline');
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return {
    systemStatus,
    healthData,
    fetchHealth
  };
}
