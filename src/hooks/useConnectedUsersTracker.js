import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { TABLES } from '../constants';

/**
 * Enhanced session tracker that stores user sessions server-side
 * for connected users reporting
 */
export function useConnectedUsersTracker(currentUserId, userRole, userName) {
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [disconnectedUsers, setDisconnectedUsers] = useState([]);
  const sessionIdRef = useRef(null);
  const intervalRef = useRef(null);

  // Generate unique session ID
  useEffect(() => {
    console.log('=== useConnectedUsersTracker useEffect triggered ===');
    console.log('currentUserId:', currentUserId);
    console.log('userRole:', userRole);
    console.log('userName:', userName);
    
    if (currentUserId) {
      const sessionId = `${currentUserId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionIdRef.current = sessionId;
      console.log('Generated sessionId:', sessionId);
      
      // Create initial session record
      createUserSession(sessionId);
    }
  }, [currentUserId]);

  const createUserSession = async (sessionId) => {
    console.log('=== createUserSession called ===');
    console.log('sessionId:', sessionId);
    console.log('currentUserId:', currentUserId);
    console.log('userName:', userName);
    console.log('userRole:', userRole);
    
    try {
      const result = await supabase
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
      
      console.log('Session creation result:', result);
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

  const fetchConnectedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('user_id, user_name, user_role, last_activity, browser_info, created_at')
        .eq('is_active', true)
        .order('last_activity', { ascending: false });
  
      if (error) throw error;
      
      // Group by user_id to avoid duplicate users with multiple sessions
      const uniqueUsers = data.reduce((acc, session) => {
        if (!acc[session.user_id] || new Date(session.last_activity) > new Date(acc[session.user_id].last_activity)) {
          acc[session.user_id] = session;
        }
        return acc;
      }, {});
  
      setConnectedUsers(Object.values(uniqueUsers));
    } catch (error) {
      console.error('Error fetching connected users:', error);
    }
  };

  const fetchDisconnectedUsers = async () => {
    try {
      // First, get all connected session IDs
      const { data: connectedSessions, error: connectedError } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('is_active', true);
      
      if (connectedError) throw connectedError;
      
      const connectedSessionIds = connectedSessions.map(session => session.id);
      
      // Then fetch disconnected sessions, excluding connected ones
      let query = supabase
        .from('user_sessions')
        .select('id, session_id, user_id, user_name, user_role, last_activity, browser_info, created_at')
        .eq('is_active', false);
      
      // Exclude connected session IDs if any exist
      if (connectedSessionIds.length > 0) {
        query = query.not('id', 'in', `(${connectedSessionIds.join(',')})`);
      }
      
      const { data, error } = await query.order('last_activity', { ascending: false });
  
      if (error) throw error;
      
      setDisconnectedUsers(data || []);
    } catch (error) {
      console.error('Error fetching disconnected users:', error);
    }
  };

  const deleteSession = async (sessionId) => {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('session_id', sessionId);

      if (error) throw error;
      
      // Refresh disconnected users list
      await fetchDisconnectedUsers();
      return { success: true };
    } catch (error) {
      console.error('Error deleting session:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteMultipleSessions = async (sessionIds) => {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .in('session_id', sessionIds);

      if (error) throw error;
      
      // Refresh disconnected users list
      await fetchDisconnectedUsers();
      return { success: true };
    } catch (error) {
      console.error('Error deleting multiple sessions:', error);
      return { success: false, error: error.message };
    }
  };

  const clearAllDisconnectedSessions = async () => {
    try {
      console.log('=== Clear All Debug Info ===');
      console.log('Disconnected users data:', disconnectedUsers);
      
      // Use the existing disconnected users list to get session IDs
      const sessionIds = disconnectedUsers.map(user => {
        console.log('Processing user:', user);
        console.log('User session_id:', user.session_id);
        console.log('User id:', user.id);
        return user.session_id;
      });
      
      console.log('Session IDs to delete:', sessionIds);
      console.log('Session IDs count:', sessionIds.length);
      
      if (sessionIds.length === 0) {
        console.log('No sessions to clear');
        return { success: true, message: 'No disconnected sessions to clear' };
      }
      
      // Check for null/undefined session IDs
      const validSessionIds = sessionIds.filter(id => id != null);
      console.log('Valid session IDs:', validSessionIds);
      console.log('Invalid session IDs found:', sessionIds.length - validSessionIds.length);
      
      if (validSessionIds.length === 0) {
        console.log('No valid session IDs found');
        return { success: false, error: 'No valid session IDs found' };
      }
      
      // FIRST: Check if these session_ids actually exist in the database
      console.log('=== Checking if session_ids exist in database ===');
      const { data: existingSessions, error: checkError } = await supabase
        .from('user_sessions')
        .select('session_id, id, is_active')
        .in('session_id', validSessionIds);
      
      console.log('Existing sessions found:', existingSessions);
      console.log('Check error:', checkError);
      
      if (existingSessions) {
        console.log('Found', existingSessions.length, 'out of', validSessionIds.length, 'sessions in database');
        const foundSessionIds = existingSessions.map(s => s.session_id);
        const missingSessionIds = validSessionIds.filter(id => !foundSessionIds.includes(id));
        console.log('Missing session IDs:', missingSessionIds);
      }
      
      // Delete sessions using session_id to match other deletion functions
      console.log('=== Executing delete query ===');
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .in('session_id', validSessionIds);
  
      console.log('Delete result - error:', error);
  
      if (error) throw error;
      
      // Refresh disconnected users list to confirm deletion
      await fetchDisconnectedUsers();
      
      console.log('Successfully cleared disconnected sessions');
      return { success: true };
    } catch (error) {
      console.error('Error clearing disconnected sessions:', error);
      console.error('Error details:', error.message, error.details, error.hint);
      return { success: false, error: error.message };
    }
  };

  // Set up periodic updates
  useEffect(() => {
    if (currentUserId) {
      // Update activity every 30 seconds
      intervalRef.current = setInterval(() => {
        updateSessionActivity();
        fetchConnectedUsers();
        fetchDisconnectedUsers();
      }, 60000);

      // Initial fetch
      fetchConnectedUsers();
      fetchDisconnectedUsers();

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

  return {
    connectedUsers,
    disconnectedUsers,
    totalConnectedUsers: connectedUsers.length,
    totalDisconnectedUsers: disconnectedUsers.length,
    fetchConnectedUsers,
    fetchDisconnectedUsers,
    deleteSession,
    deleteMultipleSessions,
    clearAllDisconnectedSessions
  };
}