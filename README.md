# Booking System

## Project Overview
A comprehensive booking management system built with React and Supabase, designed to handle service bookings, staff management, and customer interactions efficiently. The system supports multiple user roles (Admin, Staff, Customer) with dedicated dashboards and features.

## Tech Stack
- **Frontend**: React 18
- **Styling**: Tailwind CSS
- **Backend/Database**: Supabase (PostgreSQL)
- **Routing**: React Router DOM
- **Calendar**: FullCalendar
- **Charts**: Chart.js
- **Payments**: Stripe
- **Validation**: Yup
- **Notifications**: React Toastify

## Project Structure

### Root Files
- **DatabaseService**: Core database operations
- **ServiceStaffService**: Service and staff management
- **BookingService**: Booking operations
- **FormValidationService**: Form validation rules
- **StaffAvailabilityService**: Staff schedule management
- **UserService**: User management
- **ErrorHandlingService**: Error handling and reporting

### Data Flow
1. User interactions trigger component state changes
2. Components call service layer methods
3. Services interact with the database
4. Results flow back through services to components
5. Component state updates trigger re-renders

## Features
- User Management (Admin/Staff/Customer)
- Service Management
- Staff Availability
- Booking Management
- Form Validation
- Error Handling
- Search and Filtering

## Tech Stack
- React
- Tailwind CSS
- Supabase (Database)
- Yup (Validation)

## TODO List

### High Priority
- [ ] Implement real-time updates for bookings
- [ ] Add email notifications for booking confirmations
- [ ] Enhance error handling and user feedback
- [ ] Implement service categories

### Medium Priority
- [ ] Add staff performance analytics
- [ ] Implement recurring bookings
- [ ] Add customer reviews and ratings
- [ ] Enhance search functionality

### Low Priority
- [ ] Add multi-language support
- [ ] Implement dark mode
- [ ] Add export functionality for reports
- [ ] Enhance UI/UX animations

## Contributing
Please read our contributing guidelines before submitting pull requests.

## License
MIT License

### Component Structure
```
App
├── AdminDashboard
│   ├── ServicesTab
│   │   ├── ServiceForm
│   │   └── Table
│   ├── UsersTab
│   │   ├── GenericForm
│   │   ├── FilterBox
│   │   └── StaffAvailabilityForm
│   ├── BookingsTab
│   │   ├── EditBookingPopup
│   │   └── Table
│   ├── DashboardTab
│   ├── ReportsTab
│   └── SettingsTab
│       ├── BookingSettings
│       ├── DateTimeSettings
│       ├── ServiceSettings
│       ├── SystemSettings
│       └── UserSettings
├── CustomerDashboard
│   └── BookingForm
├── Auth
│   ├── AuthForm
│   ├── SignInForm
│   └── SignUpForm
└── Common
    ├── EditPopup
    ├── FilterBox
    ├── Footer
    ├── GenericForm
    ├── ToastMessage
    ├── Table
    │   ├── PaginationControls
    │   ├── TableBody
    │   ├── TableHeader
    │   └── TableRow
    ├── withErrorHandling
    └── withTableOperations
```

### Service Layer
- **DatabaseService**: Core database operations
- **ServiceStaffService**: Service and staff management
- **BookingService**: Booking operations
- **FormValidationService**: Form validation rules
- **StaffAvailabilityService**: Staff schedule management
- **UserService**: User management
- **ErrorHandlingService**: Error handling and reporting

### Data Flow
1. User interactions trigger component state changes
2. Components call service layer methods
3. Services interact with the database
4. Results flow back through services to components
5. Component state updates trigger re-renders

## Features
- User Management (Admin/Staff/Customer)
- Service Management
- Staff Availability
- Booking Management
- Form Validation
- Error Handling
- Search and Filtering

## Tech Stack
- React
- Tailwind CSS
- Supabase (Database)
- Yup (Validation)

## TODO List

### High Priority
- [ ] Implement real-time updates for bookings
- [ ] Add email notifications for booking confirmations
- [ ] Enhance error handling and user feedback
- [ ] Implement service categories

### Medium Priority
- [ ] Add staff performance analytics
- [ ] Implement recurring bookings
- [ ] Add customer reviews and ratings
- [ ] Enhance search functionality

### Low Priority
- [ ] Add multi-language support
- [ ] Implement dark mode
- [ ] Add export functionality for reports
- [ ] Enhance UI/UX animations

## Contributing
Please read our contributing guidelines before submitting pull requests.

## License
MIT License
