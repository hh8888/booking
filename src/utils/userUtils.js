// User-related utility functions

import { USER_ROLES, ROLE_GROUPS } from '../constants/userConstants';

/**
 * Check if user has admin role
 * @param {string} role - User role
 * @returns {boolean} True if user is admin
 */
export const isAdmin = (role) => {
  return role === USER_ROLES.ADMIN;
};

/**
 * Check if user has staff role
 * @param {string} role - User role
 * @returns {boolean} True if user is staff
 */
export const isStaff = (role) => {
  return role === USER_ROLES.STAFF;
};

/**
 * Check if user has customer role
 * @param {string} role - User role
 * @returns {boolean} True if user is customer
 */
export const isCustomer = (role) => {
  return role === USER_ROLES.CUSTOMER;
};

/**
 * Check if user has staff or admin role
 * @param {string} role - User role
 * @returns {boolean} True if user is staff or admin
 */
export const isStaffOrAdmin = (role) => {
  return ROLE_GROUPS.STAFF_AND_ADMIN.includes(role);
};

/**
 * Filter users by role
 * @param {Array} users - Array of user objects
 * @param {string|Array} roleFilter - Role(s) to filter by
 * @returns {Array} Filtered users
 */
export const filterUsersByRole = (users, roleFilter) => {
  if (!roleFilter || roleFilter === 'all') {
    return users;
  }

  if (roleFilter === 'staff_admin') {
    return users.filter(user => isStaffOrAdmin(user.role));
  }

  if (Array.isArray(roleFilter)) {
    return users.filter(user => roleFilter.includes(user.role));
  }

  return users.filter(user => user.role === roleFilter);
};

/**
 * Get user display name
 * @param {Object} user - User object
 * @returns {string} Display name
 */
export const getUserDisplayName = (user) => {
  if (user.full_name) {
    return user.full_name;
  }
  if (user.email) {
    return user.email;
  }
  if (user.phone) {
    return user.phone;
  }
  return 'Unknown User';
};

/**
 * Format user data for creation
 * @param {Object} userData - Raw user data
 * @param {Object} authUser - Auth user object (optional)
 * @returns {Object} Formatted user data
 */
export const formatUserForCreation = (userData, authUser = null) => {
  const formattedData = {
    ...userData,
    role: userData.role || USER_ROLES.CUSTOMER
  };

  if (authUser) {
    formattedData.id = authUser.id;
    formattedData.email = authUser.email || userData.email;
    formattedData.phone_number = authUser.phone || userData.phone_number;
    
    // Use metadata if available
    if (authUser.user_metadata) {
      formattedData.full_name = authUser.user_metadata.full_name || userData.full_name || authUser.email || authUser.phone;
      formattedData.post_code = authUser.user_metadata.post_code || userData.post_code;
      formattedData.birthday = authUser.user_metadata.birthday || userData.birthday;
      formattedData.gender = authUser.user_metadata.gender || userData.gender;
    }
  }

  return formattedData;
};

/**
 * Check if user email is confirmed
 * @param {Object} user - User object
 * @returns {boolean} True if email is confirmed
 */
export const isEmailConfirmed = (user) => {
  return user && user.confirmed_at !== null;
};

/**
 * Get redirect path based on user role
 * @param {string} role - User role
 * @returns {string} Redirect path
 */
export const getRedirectPathByRole = (role) => {
  switch (role) {
    case USER_ROLES.CUSTOMER:
      return '/customer-dashboard';
    case USER_ROLES.STAFF:
      return '/staff-dashboard';
    case USER_ROLES.ADMIN:
      return '/admin-dashboard';
    default:
      return '/auth';
  }
};

/**
 * Validate user role
 * @param {string} role - Role to validate
 * @returns {boolean} True if role is valid
 */
export const isValidRole = (role) => {
  return Object.values(USER_ROLES).includes(role);
};

/**
 * Get users by role group
 * @param {Array} users - Array of user objects
 * @param {string} groupName - Role group name (e.g., 'STAFF_AND_ADMIN')
 * @returns {Array} Filtered users
 */
export const getUsersByRoleGroup = (users, groupName) => {
  const roleGroup = ROLE_GROUPS[groupName];
  if (!roleGroup) {
    return [];
  }
  return users.filter(user => roleGroup.includes(user.role));
};