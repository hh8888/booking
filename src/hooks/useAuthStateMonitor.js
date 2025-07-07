import { useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { TABLES } from '../constants';

/**
 * Custom hook to monitor authentication state changes and automatically sign out
 * when a different user is detected
 * @param {string|null} initialUserId - The initial user ID to compare against
 * @returns {void}
 */
export function useAuthStateMonitor(initialUserId) {
  const initialUserIdRef = useRef(initialUserId);
  
  // Update ref when initialUserId changes
  useEffect(() => {
    initialUserIdRef.current = initialUserId;
  }, [initialUserId]);
  
  useEffect(() => {
    // Set up auth state change listener to detect user changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        // User signed out, redirect to login
        window.location.reload();
        return;
      }
      
      if (event === 'SIGNED_IN' && session?.user && initialUserIdRef.current) {
        // Check if the signed-in user is different from the initial user
        const { data: userData } = await supabase
          .from(TABLES.USERS)
          .select('id')
          .eq('email', session.user.email)
          .single();
          
        if (userData && userData.id !== initialUserIdRef.current) {
          // Different user detected, sign out automatically
          console.log('Different user detected, signing out...');
          await supabase.auth.signOut();
        }
      }
    });
    
    // Cleanup subscription on component unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []);
}