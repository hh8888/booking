import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Server-side session tracker for dashboards that don't need to fetch connected users data
 * Only creates and maintains user sessions without the overhead of fetching all users
 */
export function useServerSessionTracker(currentUserId, userRole, userName) {
  const sessionIdRef = useRef(null);
  const intervalRef = useRef(null);

  // Generate unique session ID and create session
  useEffect(() => {
    if (currentUserId) {
      const sessionId = `${currentUserId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionIdRef.current = sessionId;
      
      // Create initial session record
      createUserSession(sessionId);
    }
  }, [currentUserId]);

  const createUserSession = async (sessionId) => {
    try {
      await supabase
        .from('user_sessions')
        .insert({
          session_id: sessionId,
          user_id: currentUserId,
          user_name: userName,
          user_role: userRole,
          last_activity: new Date().toISOString(),
          browser_info: navigator.userAgent,
          is_active: true
        });
    } catch (error) {
      console.error('Error creating user session:', error);
    }
  };

  const updateSessionActivity = async () => {
    if (sessionIdRef.current) {
      try {
        await supabase
          .from('user_sessions')
          .update({ 
            last_activity: new Date().toISOString(),
            is_active: true 
          })
          .eq('session_id', sessionIdRef.current);
      } catch (error) {
        console.error('Error updating session activity:', error);
      }
    }
  };

  // Set up periodic updates (without fetching)
  useEffect(() => {
    if (currentUserId) {
      // Update activity every 30 seconds (no fetching)
      intervalRef.current = setInterval(() => {
        updateSessionActivity();
      }, 60000);

      // Update activity on user interaction
      const handleActivity = () => updateSessionActivity();
      
      window.addEventListener('click', handleActivity);
      window.addEventListener('keydown', handleActivity);
      window.addEventListener('scroll', handleActivity);

      // Cleanup session on page unload
      const handleUnload = async () => {
        if (sessionIdRef.current) {
          await supabase
            .from('user_sessions')
            .update({ is_active: false })
            .eq('session_id', sessionIdRef.current);
        }
      };
      
      window.addEventListener('beforeunload', handleUnload);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        window.removeEventListener('click', handleActivity);
        window.removeEventListener('keydown', handleActivity);
        window.removeEventListener('scroll', handleActivity);
        window.removeEventListener('beforeunload', handleUnload);
        handleUnload();
      };
    }
  }, [currentUserId]);

  // Return minimal interface (no data fetching)
  return {
    sessionId: sessionIdRef.current
  };
}


/**
 * Client-side session tracker for multi-window/tab session management
 * Used by SessionIndicator component
 */
export function useSessionTracker() {
  const [activeSessions, setActiveSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const sessionIdRef = useRef(null);
  const intervalRef = useRef(null);

  // Generate unique session ID for this window/tab
  useEffect(() => {
    // Use sessionStorage for per-tab unique ID
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('session_id', sessionId);
    }
    
    sessionIdRef.current = sessionId;
    setCurrentSessionId(sessionId);
    
    // Register this session
    registerSession(sessionId);
  }, []);

  const registerSession = (sessionId) => {
    const sessions = getStoredSessions();
    const newSession = {
      id: sessionId,
      lastActivity: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      windowName: document.title || 'Main Window',
      isCurrentSession: true
    };
    
    sessions[sessionId] = newSession;
    localStorage.setItem('active_sessions', JSON.stringify(sessions));
    updateActiveSessions();
  };

  const getStoredSessions = () => {
    try {
      const stored = localStorage.getItem('active_sessions');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error parsing stored sessions:', error);
      return {};
    }
  };

  const updateSessionActivity = () => {
    if (sessionIdRef.current) {
      const sessions = getStoredSessions();
      if (sessions[sessionIdRef.current]) {
        sessions[sessionIdRef.current].lastActivity = Date.now();
        sessions[sessionIdRef.current].url = window.location.href;
        localStorage.setItem('active_sessions', JSON.stringify(sessions));
        updateActiveSessions();
      }
    }
  };

  const updateActiveSessions = () => {
    const sessions = getStoredSessions();
    const now = Date.now();
    const thirtySecondsAgo = now - 30000;
    
    // Filter out expired sessions
    const activeSessions = Object.values(sessions).filter(session => 
      session.lastActivity > thirtySecondsAgo
    );
    
    // Mark current session
    const sessionsWithCurrent = activeSessions.map(session => ({
      ...session,
      isCurrentSession: session.id === sessionIdRef.current,
      timeAgo: Math.floor((now - session.lastActivity) / 1000)
    }));
    
    setActiveSessions(sessionsWithCurrent);
    
    // Clean up expired sessions from storage
    const cleanedSessions = {};
    activeSessions.forEach(session => {
      cleanedSessions[session.id] = sessions[session.id];
    });
    localStorage.setItem('active_sessions', JSON.stringify(cleanedSessions));
  };

  const cleanupSession = () => {
    if (sessionIdRef.current) {
      const sessions = getStoredSessions();
      delete sessions[sessionIdRef.current];
      localStorage.setItem('active_sessions', JSON.stringify(sessions));
    }
  };

  // Set up periodic updates and activity tracking
  useEffect(() => {
    // Update activity every 5 seconds
    intervalRef.current = setInterval(() => {
      updateSessionActivity();
    }, 5000);

    // Initial update
    updateActiveSessions();

    // Track user activity
    const handleActivity = () => updateSessionActivity();
    
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('focus', updateActiveSessions);

    // Listen for storage changes from other tabs
    const handleStorageChange = (e) => {
      if (e.key === 'active_sessions') {
        updateActiveSessions();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Cleanup on page unload
    const handleUnload = () => {
      cleanupSession();
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('focus', updateActiveSessions);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('beforeunload', handleUnload);
      cleanupSession();
    };
  }, []);

  return {
    activeSessions,
    currentSessionId
  };
}