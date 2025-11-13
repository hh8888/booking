import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { TABLES } from '../constants';

const useDashboardUser = () => {
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userName, setUserName] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [lastLocation, setLastLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const isUserSignedInRef = useRef(false);

  const fetchUserInfo = useCallback(async (skipLoadingState = false) => {
    try {
      if (!skipLoadingState) {
        setLoading(true);
      }
      setError(null);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        throw authError;
      }
      
      if (user) {
        setUserEmail(user.email);
        
        const { data: userData, error: userError } = await supabase
          .from(TABLES.USERS)
          .select('id, role, full_name, last_location')
          .eq('id', user.id)
          .single();
          
        if (userError) {
          console.error('Database error:', userError);
          throw userError;
        }
          
        if (userData) {
          setCurrentUserId(userData.id);
          setUserRole(userData.role);
          setUserName(userData.full_name);
          setLastLocation(userData.last_location);
          isUserSignedInRef.current = true;
        } else {
          console.warn('No user data found in database');
        }
      } else {
        setUserEmail('');
        setUserRole('');
        setUserName('');
        setCurrentUserId(null);
        setLastLocation(null);
        isUserSignedInRef.current = false;
      }
    } catch (err) {
      console.error('Error fetching user info:', err);
      setError(err.message || 'Failed to fetch user information');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          if (event === 'SIGNED_IN' && !isUserSignedInRef.current) {
            await fetchUserInfo();
            isUserSignedInRef.current = true;
          } else if (event === 'INITIAL_SESSION') {
            await fetchUserInfo();
            isUserSignedInRef.current = true;
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUserEmail('');
        setUserRole('');
        setUserName('');
        setCurrentUserId(null);
        setLastLocation(null);
        setLoading(false);
        setError(null);
        isUserSignedInRef.current = false;
      }
    });
    
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
