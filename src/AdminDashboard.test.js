import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminDashboard from './AdminDashboard';

let mockUser;

jest.mock('./supabaseClient', () => ({ supabase: { auth: {} } }));
jest.mock('./contexts/LanguageContext', () => require('./testUtils/mockLanguage'));
jest.mock('./hooks/useBusinessInfo', () => ({
  useBusinessInfo: () => ({ businessName: 'Booking Management System' }),
}));
jest.mock('./hooks/useDashboardUser', () => ({
  __esModule: true,
  default: () => mockUser,
}));
jest.mock('./hooks/useUsersData', () => ({
  useUsersData: () => ({ users: [], setUsers: () => {}, loading: false, networkError: null, retryFetch: () => {}, error: null }),
}));
jest.mock('./hooks/useConnectedUsersTracker', () => ({ useConnectedUsersTracker: () => {} }));

jest.mock('./components/dashboard/DashboardTab', () => () => <div>DashboardTab Mock</div>);
jest.mock('./components/service/UsersTab', () => () => <div>UsersTab Mock</div>);
jest.mock('./components/service/ServicesTab', () => () => <div>ServicesTab Mock</div>);
jest.mock('./components/booking/BookingsTab', () => () => <div>BookingsTab Mock</div>);
jest.mock('./components/reports/ReportsTab', () => () => <div>ReportsTab Mock</div>);
jest.mock('./components/SettingsTab', () => () => <div>SettingsTab Mock</div>);
jest.mock('./components/common/LocationSelector', () => () => <div>LocationSelector Mock</div>);
jest.mock('./components/common/UserDropdown', () => () => <div>UserDropdown Mock</div>);
jest.mock('./components/common/SessionIndicator', () => () => <div>SessionIndicator Mock</div>);

beforeEach(() => {
  mockUser = {
    userEmail: 'admin@example.com',
    userRole: 'admin',
    userName: 'Admin',
    currentUserId: 'admin1',
    lastLocation: null,
    loading: false,
    error: null,
  };
});

test('renders AdminDashboard with the business name and dashboard tab', () => {
  render(<AdminDashboard />);
  expect(screen.getByText(/Booking Management System/i)).toBeInTheDocument();
  expect(screen.getByText('DashboardTab Mock')).toBeInTheDocument();
});

test('switches to the bookings tab', () => {
  render(<AdminDashboard />);
  fireEvent.click(screen.getByText('nav.bookings'));
  expect(screen.getByText('BookingsTab Mock')).toBeInTheDocument();
});

test('shows an error screen when the user cannot be loaded', () => {
  mockUser = { ...mockUser, error: 'Session expired' };
  render(<AdminDashboard />);
  expect(screen.getByText('User Authentication Error')).toBeInTheDocument();
  expect(screen.getByText('Session expired')).toBeInTheDocument();
});
