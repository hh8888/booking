import { useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Server-side session tracker for database session management
 * Used for Connected Users Report
 */
export function useServerSessionTracker(currentUserId, userRole, userName) {
  // ... existing code ...
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