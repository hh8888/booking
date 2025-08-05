import { useState, useEffect, useMemo } from 'react';
import UserService from '../services/UserService';
import { USER_ROLES } from '../constants';

/**
 * Custom hook to fetch and manage users data with filtering options
 * @param {Object} options - Configuration options
 * @param {Array<string>} options.roleFilter - Array of roles to filter by (e.g., [USER_ROLES.CUSTOMER, USER_ROLES.STAFF])
 * @param {boolean} options.autoFetch - Whether to automatically fetch on mount (default: true)
 * @returns {Object} { users, loading, error, networkError, refetch, retryFetch }
 */
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
        ? allUsers.filter(user => roleFilter.includes(user.role))
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
  
  // Stabilize the roleFilter dependency
  const stableRoleFilter = useMemo(() => {
    return roleFilter ? roleFilter.join(',') : null;
  }, [roleFilter]);
  
  useEffect(() => {
    if (autoFetch) {
      fetchUsers();
    }
  }, [autoFetch, stableRoleFilter]);
  
  return {
    users,
    setUsers, // Allow external updates
    loading,
    error,
    networkError,
    refetch: fetchUsers,
    retryFetch
  };
}