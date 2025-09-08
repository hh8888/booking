// Booking-related constants

// Booking Status Constants
export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  BLOCKED: 'blocked'  // ← New status for blocked time slots
};

// Booking Status Options for Forms
export const BOOKING_STATUS_OPTIONS = [
  { value: BOOKING_STATUS.PENDING, label: 'Pending' },
  { value: BOOKING_STATUS.CONFIRMED, label: 'Confirmed' },
  { value: BOOKING_STATUS.CANCELLED, label: 'Cancelled' },
  { value: BOOKING_STATUS.COMPLETED, label: 'Completed' },
  { value: BOOKING_STATUS.BLOCKED, label: 'Blocked' }
];

// Booking Status Colors for UI
export const BOOKING_STATUS_COLORS = {
  [BOOKING_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800',
  [BOOKING_STATUS.CONFIRMED]: 'bg-green-100 text-green-800',
  [BOOKING_STATUS.CANCELLED]: 'bg-red-100 text-red-800',
  [BOOKING_STATUS.COMPLETED]: 'bg-blue-100 text-blue-800',
  [BOOKING_STATUS.BLOCKED]: 'bg-gray-100 text-gray-800'  // ← Gray styling for blocked slots
};

// Default Booking Values
export const DEFAULT_BOOKING_STATUS = BOOKING_STATUS.PENDING;

// Booking Filter Options
export const BOOKING_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: BOOKING_STATUS.PENDING, label: 'Pending' },
  { value: BOOKING_STATUS.CONFIRMED, label: 'Confirmed' },
  { value: BOOKING_STATUS.CANCELLED, label: 'Cancelled' },
  { value: BOOKING_STATUS.COMPLETED, label: 'Completed' },
  { value: BOOKING_STATUS.BLOCKED, label: 'Blocked' }
];

// Booking Table Columns
export const BOOKING_TABLE_COLUMNS = [
  { key: 'customer_name', label: 'Customer' },
  { key: 'service_name', label: 'Service' },
  { key: 'staff_name', label: 'Staff' },
  { key: 'start_time', label: 'Start Time' },
  { key: 'end_time', label: 'End Time' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions' }
];