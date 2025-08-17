import { useState, useEffect } from 'react';
import UserService from '../services/UserService';
import { USER_ROLES } from '../constants';
import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';
import { showUserUpdateToast, showUserCreatedToast, showUserDeletedToast } from '../utils/realtimeToastUtils';
import React from 'react';

export function useUsersData(options = {}) {
  const { roleFilter = null, autoFetch = true } = options;
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [networkError, setNetworkError] = useState(null);
  
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      setNetworkError(null);
      
      const userService = UserService.getInstance();
      const allUsers = await userService.fetchUsers();
      
      // Apply role filtering if specified
      const filteredUsers = roleFilter 
        ? allUsers.filter(user => user.role && roleFilter.includes(user.role))
        : allUsers;
        
      setUsers(filteredUsers);
    } catch (e) {
      console.error('Exception fetching users:', e);
      const errorMessage = "Network connection issue. Unable to fetch user data. Please check your connection and try again.";
      setNetworkError(errorMessage);
      setError(e.message || errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Retry function for network errors
  const retryFetch = () => {
    fetchUsers();
  };
  
  useEffect(() => {
    if (autoFetch) {
      fetchUsers();
    }
  }, [autoFetch, roleFilter?.join(',')]);

  // Add real-time subscription for user updates
  useEffect(() => {
    console.log('📡 Setting up real-time subscription for users table');
    
    const usersChannel = supabase
      .channel('users-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'users'
        },
        async (payload) => {
          console.log('📡 Real-time user change detected:', payload);
          
          try {
            // Refresh users data when any user changes
            await fetchUsers();
            
            // Enhanced toast notifications using utility functions
            if (payload.eventType === 'INSERT') {
              showUserCreatedToast(payload.new);
            } else if (payload.eventType === 'UPDATE') {
              showUserUpdateToast(payload.old || {}, payload.new, {
                title: 'User Profile Updated',
                icon: 'ℹ️',
                toastType: 'info'
              });
            } else if (payload.eventType === 'DELETE') {
              showUserDeletedToast(payload.old);
            }
          } catch (error) {
            console.error('Error refreshing users after real-time update:', error);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🧹 Cleaning up users real-time subscription');
      supabase.removeChannel(usersChannel);
    };
  }, []);
  
  return {
    users,
    setUsers,
    loading,
    error,
    networkError,
    refetch: fetchUsers,
    retryFetch
  };
}