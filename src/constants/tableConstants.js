// Database table names and related constants
import { BOOKING_STATUS } from './bookingConstants';

// Table Names
export const TABLES = {
  USERS: 'users',
  BOOKINGS: 'bookings',
  SERVICES: 'services',
  SETTINGS: 'settings',
  STAFF_AVAILABILITY: 'staff_availability',
  SERVICE_STAFF: 'service_staff',
  PAYMENTS: 'payments'
};

// Common Database Columns
export const COLUMNS = {
  ID: 'id',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  EMAIL: 'email',
  FULL_NAME: 'full_name',
  PHONE_NUMBER: 'phone_number',
  ROLE: 'role',
  START_TIME: 'start_time',
  END_TIME: 'end_time',
  STATUS: 'status',
  CUSTOMER_ID: 'customer_id',
  SERVICE_ID: 'service_id',
  PROVIDER_ID: 'provider_id',
  STAFF_ID: 'staff_id',
  LOCATION: 'location',
  NAME: 'name'
};

// Common Sort Orders
export const SORT_ORDERS = {
  CREATED_AT: 'created_at',
  START_TIME: 'start_time',
  NAME: 'name',
  FULL_NAME: 'full_name'
};

// Common Select Columns
export const SELECT_COLUMNS = {
  USER_BASIC: 'id, full_name',
  USER_WITH_ROLE: 'id, role, full_name',
  USER_PROFILE: 'id, email, full_name, phone_number, role, created_at'
};

// Database Query Filters
export const QUERY_FILTERS = {
  ROLE_STAFF_MANAGER_ADMIN: { role: { in: ['staff', 'manager', 'admin'] } },
  ROLE_STAFF_MANAGER: { role: { in: ['staff', 'manager'] } },
  ROLE_CUSTOMER: { role: 'customer' },
  ROLE_STAFF: { role: { in: ['staff', 'manager'] } },
  STATUS_NOT_CANCELLED: { status: { neq: BOOKING_STATUS.CANCELLED } }
};