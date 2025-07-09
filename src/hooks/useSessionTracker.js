import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Custom hook to track and monitor multiple browser sessions for the same user
 * Uses sessionStorage to identify unique browser windows/tabs
 * @returns {Object} { activeSessions, currentSessionId, updateSessionActivity }
 */
export function useSessionTracker() {
  const [activeSessions, setActiveSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const intervalRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());

  // Generate or retrieve session ID for current window/tab
  useEffect(() => {
    let sessionId = sessionStorage.getItem('browser_session_id');
    
    if (!sessionId) {
      // Generate unique session ID for this browser window/tab
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('browser_session_id', sessionId);
    }
    
    setCurrentSessionId(sessionId);
    
    // Store session info in localStorage with current timestamp
    const sessionInfo = {
      id: sessionId,
      lastActivity: Date.now(),
      userAgent: navigator.userAgent,
      windowName: window.name || 'Main Window',
      url: window.location.href
    };
    
    updateSessionInStorage(sessionId, sessionInfo);
  }, []);

  // Function to update session activity
  const updateSessionActivity = () => {
    if (currentSessionId) {
      const sessionInfo = {
        id: currentSessionId,
        lastActivity: Date.now(),
        userAgent: navigator.userAgent,
        windowName: window.name || 'Main Window',
        url: window.location.href
      };
      
      updateSessionInStorage(currentSessionId, sessionInfo);
      lastUpdateRef.current = Date.now();
    }
  };

  // Update session in localStorage
  const updateSessionInStorage = (sessionId, sessionInfo) => {
    try {
      const existingSessions = JSON.parse(localStorage.getItem('active_browser_sessions') || '{}');
      existingSessions[sessionId] = sessionInfo;
      localStorage.setItem('active_browser_sessions', JSON.stringify(existingSessions));
    } catch (error) {
      console.error('Error updating session storage:', error);
    }
  };

  // Clean up expired sessions and update active sessions list
  const cleanupAndUpdateSessions = () => {
    try {
      const existingSessions = JSON.parse(localStorage.getItem('active_browser_sessions') || '{}');
      const now = Date.now();
      const sessionTimeout = 30000; // 30 seconds timeout
      const activeSessions = [];
      
      Object.keys(existingSessions).forEach(sessionId => {
        const session = existingSessions[sessionId];
        if (now - session.lastActivity < sessionTimeout) {
          activeSessions.push({
            ...session,
            isCurrentSession: sessionId === currentSessionId,
            timeAgo: Math.floor((now - session.lastActivity) / 1000)
          });
        } else {
          // Remove expired session
          delete existingSessions[sessionId];
        }
      });
      
      // Update localStorage with cleaned sessions
      localStorage.setItem('active_browser_sessions', JSON.stringify(existingSessions));
      setActiveSessions(activeSessions);
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
    }
  };

  // Set up periodic session updates and cleanup
  useEffect(() => {
    if (currentSessionId) {
      // Update session activity every 10 seconds
      intervalRef.current = setInterval(() => {
        updateSessionActivity();
        cleanupAndUpdateSessions();
      }, 10000);
      
      // Initial cleanup
      cleanupAndUpdateSessions();
      
      // Listen for storage changes from other tabs
      const handleStorageChange = (e) => {
        if (e.key === 'active_browser_sessions') {
          cleanupAndUpdateSessions();
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      // Update activity on user interaction
      const handleUserActivity = () => {
        const now = Date.now();
        // Throttle updates to avoid excessive localStorage writes
        if (now - lastUpdateRef.current > 5000) {
          updateSessionActivity();
        }
      };
      
      window.addEventListener('click', handleUserActivity);
      window.addEventListener('keydown', handleUserActivity);
      window.addEventListener('scroll', handleUserActivity);
      
      // Cleanup on window unload
      const handleUnload = () => {
        try {
          const existingSessions = JSON.parse(localStorage.getItem('active_browser_sessions') || '{}');
          delete existingSessions[currentSessionId];
          localStorage.setItem('active_browser_sessions', JSON.stringify(existingSessions));
        } catch (error) {
          console.error('Error cleaning up session on unload:', error);
        }
      };
      
      window.addEventListener('beforeunload', handleUnload);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('click', handleUserActivity);
        window.removeEventListener('keydown', handleUserActivity);
        window.removeEventListener('scroll', handleUserActivity);
        window.removeEventListener('beforeunload', handleUnload);
      };
    }
  }, [currentSessionId]);

  return {
    activeSessions,
    currentSessionId,
    updateSessionActivity
  };
}