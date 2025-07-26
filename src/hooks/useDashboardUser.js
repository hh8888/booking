import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { TABLES } from '../constants';
import { useAuthStateMonitor } from './useAuthStateMonitor';

const useDashboardUser = () => {
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userName, setUserName] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Monitor auth state changes
  useAuthStateMonitor(currentUserId);
  
  // Add token refresh function
  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.log('Session refresh failed:', error);
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/auth';
      }
      return data;
    } catch (err) {
      console.error('Session refresh error:', err);
      return null;
    }
  };
  
  const fetchUserInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Auth user:', user);
      if (user) {
        setUserEmail(user.email);
        
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
          setCurrentUserId(userData.id);
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
    const fetchUser = async () => {
      try {
        setLoading(true);
        
        // Refresh session first
        await refreshSession();
        
        const { data: { user } } = await Promise.race([
          supabase.auth.getUser(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 10000)
          )
        ]);
        
        if (user) {
          setUserEmail(user.email);
          
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
            setCurrentUserId(userData.id);
            setUserRole(userData.role);
            setUserName(userData.full_name);
            console.log('Set currentUserId to:', userData.id);
          }
        }
      } catch (error) {
        console.error('User fetch error:', error);
        localStorage.clear();
        sessionStorage.clear();
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
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
};

export default useDashboardUser;
