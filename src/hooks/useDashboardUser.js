import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { TABLES } from '../constants';
import { useAuthStateMonitor } from './useAuthStateMonitor';

const useDashboardUser = () => {
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userName, setUserName] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [lastLocation, setLastLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Add ref to track if user is already signed in
  const isUserSignedInRef = useRef(false);

  // Monitor auth state changes
  useAuthStateMonitor(currentUserId);
  
  // Memoize fetchUserInfo to prevent unnecessary re-renders
  const fetchUserInfo = useCallback(async (skipLoadingState = false) => {
    try {
      console.log('=== useDashboardUser fetchUserInfo START ===');
      if (!skipLoadingState) {
        setLoading(true);
      }
      setError(null);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('Auth user:', user);
      console.log('Auth error:', authError);
      
      if (authError) {
        throw authError;
      }
      
      if (user) {
        setUserEmail(user.email);
        console.log('Set userEmail to:', user.email);
        
        const { data: userData, error: userError } = await supabase
          .from(TABLES.USERS)
          .select('id, role, full_name, last_location')
          .eq('id', user.id)
          .single();
          
        console.log('Database user data:', userData);
        console.log('Database user error:', userError);
          
        if (userError) {
          console.error('Database error:', userError);
          throw userError;
        }
          
        if (userData) {
          setCurrentUserId(userData.id);
          setUserRole(userData.role);
          setUserName(userData.full_name);
          setLastLocation(userData.last_location);
          console.log('Set currentUserId to:', userData.id);
          console.log('Set userRole to:', userData.role);
          isUserSignedInRef.current = true;
        } else {
          console.warn('No user data found in database');
        }
      } else {
        console.log('No authenticated user found');
        // Clear all user data if no user is authenticated
        setUserEmail('');
        setUserRole('');
        setUserName('');
        setCurrentUserId(null);
        setLastLocation(null);
        isUserSignedInRef.current = false;
      }
      console.log('=== useDashboardUser fetchUserInfo END ===');
    } catch (err) {
      console.error('Error fetching user info:', err);
      setError(err.message || 'Failed to fetch user information');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('=== useDashboardUser useEffect triggered ===');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('useDashboardUser - Auth state change:', event);
      console.log('useDashboardUser - Session:', session?.user ? 'User present' : 'No user');
      
      if (event === 'SIGNED_IN') {
        // Check if this is a real sign-in or just tab focus validation
        if (!isUserSignedInRef.current) {
          // This is a real sign-in, show loading
          console.log('useDashboardUser - Real sign-in detected, fetching user info');
          await fetchUserInfo();
        } else {
          // This is just tab focus validation, skip loading state
          console.log('useDashboardUser - Tab focus validation, skipping loading state');
          await fetchUserInfo(true); // Skip loading state
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('useDashboardUser - Clearing user data due to sign out');
        setUserEmail('');
        setUserRole('');
        setUserName('');
        setCurrentUserId(null);
        setLastLocation(null);
        setLoading(false);
        setError(null);
        isUserSignedInRef.current = false;
      } else if (event === 'TOKEN_REFRESHED') {
        // Token refresh should not trigger loading state or re-fetch user data
        // The user data hasn't changed, only the token was refreshed
        console.log('useDashboardUser - Token refreshed, no action needed');
        return;
      }
    });
    
    // Also fetch user info immediately on mount
    fetchUserInfo();
    
    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchUserInfo]);
  
  return {
    userEmail,
    userRole,
    userName,
    currentUserId,
    lastLocation,
    loading,
    error,
    refetch: fetchUserInfo
  };
};

export default useDashboardUser;
