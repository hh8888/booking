// User-related constants

// User Role Constants
export const USER_ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  CUSTOMER: 'customer'
};

// User Role Options for Forms
export const USER_ROLE_OPTIONS = [
  { value: USER_ROLES.CUSTOMER, label: 'Customer' },
  { value: USER_ROLES.STAFF, label: 'Staff' },
  { value: USER_ROLES.ADMIN, label: 'Administrator' }
];

// Role Filter Options
export const ROLE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  { value: USER_ROLES.ADMIN, label: 'Admin' },
  { value: USER_ROLES.STAFF, label: 'Staff' },
  { value: USER_ROLES.CUSTOMER, label: 'Customer' },
  { value: 'staff_admin', label: 'Staff & Admin' }
];

// Default User Role
export const DEFAULT_USER_ROLE = USER_ROLES.CUSTOMER;

// Role Groups for Filtering
export const ROLE_GROUPS = {
  STAFF_AND_ADMIN: [USER_ROLES.STAFF, USER_ROLES.ADMIN],
  CUSTOMER_AND_STAFF: [USER_ROLES.CUSTOMER, USER_ROLES.STAFF],
  ALL_ROLES: [USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.CUSTOMER]
};

// User Table Columns
export const USER_TABLE_COLUMNS = [
  { key: 'full_name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone_number', label: 'Phone' },
  { key: 'role', label: 'Role' },
  { key: 'created_at', label: 'Created' },
  { key: 'actions', label: 'Actions' }
];

// User Form Fields
export const USER_FORM_FIELDS = {
  STAFF_MODE: [
    { 
      key: 'role', 
      label: 'Role', 
      type: 'select', 
      options: [{ value: USER_ROLES.CUSTOMER, label: 'Customer' }], 
      required: true, 
      defaultValue: USER_ROLES.CUSTOMER, 
      disabled: true 
    }
  ],
  ADMIN_MODE: [
    { 
      key: 'role', 
      label: 'Role', 
      type: 'select', 
      options: USER_ROLE_OPTIONS, 
      required: true, 
      defaultValue: USER_ROLES.CUSTOMER 
    }
  ]
};