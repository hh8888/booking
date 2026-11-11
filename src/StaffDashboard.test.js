import React from 'react';
import { render, screen } from '@testing-library/react';
import StaffDashboard from './StaffDashboard';

jest.mock('./supabaseClient', () => ({ supabase: { auth: {} } }));
jest.mock('./contexts/LanguageContext', () => require('./testUtils/mockLanguage'));
jest.mock('./hooks/useBusinessInfo', () => ({
  useBusinessInfo: () => ({ businessName: 'Booking Management System' }),
}));
jest.mock('./hooks/useDashboardUser', () => ({
  __esModule: true,
  default: () => ({ userEmail: 'staff@example.com', userRole: 'staff', userName: 'Staff', currentUserId: 'staff1' }),
}));
jest.mock('./hooks/useUsersData', () => ({
  useUsersData: () => ({ users: [], setUsers: () => {}, loading: false, networkError: null, retryFetch: () => {} }),
}));
jest.mock('./hooks/useConnectedUsersTracker', () => ({ useConnectedUsersTracker: () => {} }));

jest.mock('./components/dashboard/DashboardTab', () => () => <div>DashboardTab Mock</div>);
jest.mock('./components/service/UsersTab', () => () => <div>UsersTab Mock</div>);
jest.mock('./components/booking/BookingsTab', () => () => <div>BookingsTab Mock</div>);
jest.mock('./components/reports/ReportsTab', () => () => <div>ReportsTab Mock</div>);
jest.mock('./components/service/StaffDateAvailabilityForm', () => () => <div>AvailabilityForm Mock</div>);
jest.mock('./components/common/LocationSelector', () => () => <div>LocationSelector Mock</div>);
jest.mock('./components/common/UserDropdown', () => () => <div>UserDropdown Mock</div>);
jest.mock('./components/common/SessionIndicator', () => () => <div>SessionIndicator Mock</div>);

test('renders StaffDashboard with the staff portal heading and dashboard tab', () => {
  render(<StaffDashboard />);
  // t() returns the key in tests, so "Staff Portal" appears as nav.staffPortal
  expect(screen.getByText('Booking Management System - nav.staffPortal')).toBeInTheDocument();
  expect(screen.getByText('DashboardTab Mock')).toBeInTheDocument();
});
