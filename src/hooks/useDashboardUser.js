import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { TABLES } from '../constants';
import { useAuthStateMonitor } from './useAuthStateMonitor';

/**
 * Custom hook to fetch and manage dashboard user information
 * Includes authentication state monitoring for security
 * @returns {Object} { userEmail, userRole, userName, currentUserId, loading, error, refetch }
 */
export function useDashboardUser() {
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userName, setUserName] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Use auth state monitoring for security
  useAuthStateMonitor(currentUserId);
  
  const fetchUserInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Auth user:', user);
      if (user) {
        setUserEmail(user.email);
        
        // Find the user record in the users table by email instead of auth ID
        const { data: userData, error: userError } = await supabase
          .from(TABLES.USERS)
          .select('id, role, full_name')
          .eq('email', user.email)
          .single();
          
        console.log('Database user data:', userData);
        console.log('Database user error:', userError);
          
        if (userError) {
          throw userError;
        }
          
        if (userData) {
          setCurrentUserId(userData.id); // Use the database user ID, not auth ID
          setUserRole(userData.role);
          setUserName(userData.full_name);
          console.log('Set currentUserId to:', userData.id);
        }
      }
    } catch (err) {
      console.error('Error fetching user info:', err);
      setError(err.message || 'Failed to fetch user information');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchUserInfo();
  }, []);
  
  return {
    userEmail,
    userRole,
    userName,
    currentUserId,
    loading,
    error,
    refetch: fetchUserInfo
  };
}