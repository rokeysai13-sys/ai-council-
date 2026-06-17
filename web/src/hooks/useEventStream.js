import { useState, useEffect, useRef } from 'react';

const BACKOFF_STEPS = [1000, 2000, 4000, 8000, 16000];

export default function useEventStream(missionId = null) {
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  
  const wsRef = useRef(null);
  const backoffIdxRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  
  useEffect(() => {
    let active = true;
    
    function connect() {
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      const wsUrl = `ws://127.0.0.1:8000/ws/events`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        if (!active) return;
        setIsConnected(true);
        backoffIdxRef.current = 0; // reset backoff on success
        console.log('Event WS connected');
      };
      
      ws.onmessage = (event) => {
        if (!active) return;
        try {
          const evt = JSON.parse(event.data);
          
          // If a missionId filter is set, only keep events matching it
          if (missionId && evt.mission_id !== missionId) {
            return;
          }
          
          setEvents((prev) => {
            const next = [...prev, evt];
            if (next.length > 300) {
              return next.slice(next.length - 300);
            }
            return next;
          });
          setLastEvent(evt);
        } catch (err) {
          console.error('Failed to parse WS event:', err);
        }
      };
      
      ws.onclose = () => {
        if (!active) return;
        setIsConnected(false);
        wsRef.current = null;
        console.log('Event WS closed');
        
        // Trigger reconnect with exponential backoff
        const backoff = BACKOFF_STEPS[backoffIdxRef.current];
        if (backoffIdxRef.current < BACKOFF_STEPS.length - 1) {
          backoffIdxRef.current += 1;
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (active) connect();
        }, backoff);
      };
      
      ws.onerror = (err) => {
        console.error('Event WS error:', err);
        // let onclose handle reconnect
      };
    }
    
    connect();
    
    return () => {
      active = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [missionId]);
  
  const clearEvents = () => {
    setEvents([]);
    setLastEvent(null);
  };
  
  // Helper filters
  const byMission = (id) => events.filter(e => e.mission_id === id);
  const byAgent = (id) => events.filter(e => e.agent_id === id);
  const byType = (type) => events.filter(e => e.type === type);
  
  return {
    events,
    isConnected,
    lastEvent,
    clearEvents,
    byMission,
    byAgent,
    byType
  };
}
