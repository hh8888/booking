import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { TABLES } from '../constants';

export function useUser() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          setUser(currentUser);
          setUserEmail(currentUser.email);

          const { data: userData, error: userError } = await supabase
            .from(TABLES.USERS)
            .select('role')
            .eq('id', currentUser.id)
            .single();

          if (userError) {
            throw userError;
          }

          setUserRole(userData?.role);
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();

    // Listen for authentication state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserInfo();
      } else {
        setUser(null);
        setUserRole(null);
        setUserEmail(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    userRole,
    userEmail,
    loading,
    error,
    isAdmin: userRole === 'admin',
    isCustomer: userRole === 'customer',
    isStaff: userRole === 'staff'
  };
}