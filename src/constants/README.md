# Constants and Utilities Documentation

This directory contains centralized constants and utility functions to improve code organization, maintainability, and consistency across the booking system.

## 📁 Structure Overview

```
src/
├── constants/
│   ├── index.js                 # Main export file
│   ├── bookingConstants.js      # Booking-related constants
│   ├── userConstants.js         # User and role constants
│   ├── messageConstants.js      # Toast messages and notifications
│   ├── tableConstants.js        # Database table names and queries
│   ├── uiConstants.js          # UI styling and component constants
│   └── validationConstants.js   # Validation rules and messages
└── utils/
    ├── index.js                 # Main export file
    ├── bookingUtils.js          # Booking-related utility functions
    ├── userUtils.js             # User-related utility functions
    ├── validationUtils.js       # Validation utility functions
    └── DateTimeFormatter.js     # Existing date/time utilities
```

## 🎯 Benefits

### **1. Code Deduplication**
- Eliminated ~150+ hardcoded strings across components
- Single source of truth for status values, messages, and UI constants
- Reduced bundle size through shared constants

### **2. Improved Maintainability**
- Easy to update messages, statuses, or styling across the entire app
- Centralized validation rules and error messages
- Consistent naming conventions

### **3. Better Developer Experience**
- IntelliSense support for constants and utility functions
- Reduced typos and inconsistencies
- Clear documentation and usage examples

### **4. Enhanced Type Safety**
- Predefined constants prevent invalid values
- Utility functions with clear input/output contracts
- Better error handling and validation

## 📚 Constants Reference

### **Booking Constants** (`bookingConstants.js`)
```javascript
import { BOOKING_STATUS, BOOKING_STATUS_COLORS } from '../constants';

// Status values
BOOKING_STATUS.PENDING     // 'pending'
BOOKING_STATUS.CONFIRMED   // 'confirmed'
BOOKING_STATUS.CANCELLED   // 'cancelled'

// UI styling
BOOKING_STATUS_COLORS[BOOKING_STATUS.PENDING]  // 'bg-yellow-100 text-yellow-800'
```

### **User Constants** (`userConstants.js`)
```javascript
import { USER_ROLES, ROLE_GROUPS } from '../constants';

// Role values
USER_ROLES.ADMIN      // 'admin'
USER_ROLES.STAFF      // 'staff'
USER_ROLES.CUSTOMER   // 'customer'

// Role groups
ROLE_GROUPS.STAFF_AND_ADMIN  // ['staff', 'admin']
```

### **Message Constants** (`messageConstants.js`)
```javascript
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../constants';

// Success messages
SUCCESS_MESSAGES.BOOKING_CREATED   // 'Booking created successfully!'
SUCCESS_MESSAGES.USER_UPDATED      // 'User updated successfully'

// Error messages
ERROR_MESSAGES.INVALID_CUSTOMER     // 'Please select a valid customer'
ERROR_MESSAGES.FAILED_LOAD_BOOKINGS // 'Failed to load bookings'
```

### **Table Constants** (`tableConstants.js`)
```javascript
import { TABLES, COLUMNS, QUERY_FILTERS } from '../constants';

// Table names
TABLES.USERS      // 'users'
TABLES.BOOKINGS   // 'bookings'

// Common columns
COLUMNS.ID        // 'id'
COLUMNS.EMAIL     // 'email'

// Query filters
QUERY_FILTERS.ROLE_STAFF_MANAGER  // { role: { in: ['staff', 'admin'] } }
```

## 🛠️ Utilities Reference

### **Booking Utilities** (`bookingUtils.js`)
```javascript
import { getBookingStatusClass, isUpcomingBooking, filterBookingsByStatus } from '../utils';

// Get status styling
const statusClass = getBookingStatusClass(booking.status);

// Check booking state
const isUpcoming = isUpcomingBooking(booking);
const isPending = isPendingBooking(booking);

// Filter bookings
const pendingBookings = filterBookingsByStatus(bookings, 'pending');
```

### **User Utilities** (`userUtils.js`)
```javascript
import { isAdmin, isStaffOrAdmin, filterUsersByRole, getUserDisplayName } from '../utils';

// Check user roles
const canManageUsers = isStaffOrAdmin(user.role);
const isAdminUser = isAdmin(user.role);

// Filter users
const staffUsers = filterUsersByRole(users, ['staff', 'admin']);

// Get display name
const displayName = getUserDisplayName(user);
```

### **Validation Utilities** (`validationUtils.js`)
```javascript
import { validateEmail, validateBookingForm, validateUserForm } from '../utils';

// Validate individual fields
const emailResult = validateEmail(email);
if (!emailResult.isValid) {
  console.error(emailResult.message);
}

// Validate entire forms
const bookingValidation = validateBookingForm(bookingData);
if (!bookingValidation.isValid) {
  setErrors(bookingValidation.errors);
}
```

## 🔄 Migration Examples

### **Before: Hardcoded Values**
```javascript
// ❌ Before - scattered hardcoded values
const getStatusClass = (status) => {
  switch (status) {
    case 'confirmed': return 'bg-green-100 text-green-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

if (booking.status === 'pending') {
  // Handle pending booking
}

toast.success('Booking created successfully!');
```

### **After: Using Constants and Utils**
```javascript
// ✅ After - using centralized constants and utilities
import { BOOKING_STATUS, SUCCESS_MESSAGES } from '../constants';
import { getBookingStatusClass, isPendingBooking } from '../utils';

const statusClass = getBookingStatusClass(booking.status);

if (isPendingBooking(booking)) {
  // Handle pending booking
}

toast.success(SUCCESS_MESSAGES.BOOKING_CREATED);
```

## 📋 Usage Guidelines

### **1. Import from Main Files**
```javascript
// ✅ Preferred - import from main index files
import { BOOKING_STATUS, USER_ROLES, SUCCESS_MESSAGES } from '../constants';
import { getBookingStatusClass, isAdmin, validateEmail } from '../utils';

// ❌ Avoid - importing from individual files
import { BOOKING_STATUS } from '../constants/bookingConstants';
```

### **2. Use Constants Instead of Strings**
```javascript
// ✅ Good
if (user.role === USER_ROLES.ADMIN) { /* ... */ }
toast.success(SUCCESS_MESSAGES.USER_CREATED);

// ❌ Bad
if (user.role === 'admin') { /* ... */ }
toast.success('User created successfully');
```

### **3. Leverage Utility Functions**
```javascript
// ✅ Good - use utility functions
const adminUsers = filterUsersByRole(users, USER_ROLES.ADMIN);
const statusClass = getBookingStatusClass(booking.status);

// ❌ Bad - duplicate logic
const adminUsers = users.filter(user => user.role === 'admin');
const statusClass = booking.status === 'confirmed' ? 'bg-green-100' : 'bg-yellow-100';
```

## 🚀 Next Steps

### **Immediate Actions**
1. **Refactor existing components** to use new constants and utilities
2. **Update FormValidationService** to use validation constants
3. **Replace hardcoded strings** in toast messages
4. **Standardize table queries** using table constants

### **Future Enhancements**
1. **Add TypeScript definitions** for better type safety
2. **Create theme constants** for consistent styling
3. **Add API endpoint constants** for better organization
4. **Implement configuration constants** for environment-specific values

### **Testing Strategy**
1. **Unit tests for utilities** to ensure reliability
2. **Integration tests** for constant usage
3. **Migration tests** to verify refactored components

## 📖 Examples in Practice

See the refactored components in the codebase for real-world usage examples:
- `CustomerBookingsList.js` - Status styling and filtering
- `BookingsTab.js` - Form validation and user filtering
- `UserDropdown.js` - Role-based UI rendering
- `DashboardTab.js` - Booking status management

This organization significantly improves code quality, reduces maintenance overhead, and provides a solid foundation for future development.