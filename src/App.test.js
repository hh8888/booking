import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// The router stand-in used in tests renders every route at once, so each page
// is replaced by a marker and the test checks the app shell mounts them.
jest.mock('./supabaseClient', () => ({ supabase: { auth: {} } }));
jest.mock('./contexts/LanguageContext', () => require('./testUtils/mockLanguage'));
jest.mock('./contexts/CompactModeContext', () => ({ CompactModeProvider: ({ children }) => children }));
jest.mock('./contexts/SettingsContext', () => ({ SettingsProvider: ({ children }) => children }));
jest.mock('./Auth', () => () => <div>Auth Page Mock</div>);
jest.mock('./Dashboard', () => () => <div>Dashboard Mock</div>);
jest.mock('./components/customer/CustomerDashboard', () => () => <div>CustomerDashboard Mock</div>);
jest.mock('./ResetPassword', () => () => <div>ResetPassword Mock</div>);
jest.mock('./Services', () => () => <div>Services Mock</div>);
jest.mock('./Bookings', () => () => <div>Bookings Mock</div>);
jest.mock('./components/auth/AuthRedirectHandler', () => () => null);
jest.mock('./components/common/Footer', () => () => <div>Footer Mock</div>);

test('mounts the app shell with its pages and footer', async () => {
  render(<App />);
  // Dashboard pages are lazy-loaded, so wait for them
  expect((await screen.findAllByText('Dashboard Mock')).length).toBeGreaterThan(0);
  expect(screen.getAllByText('Auth Page Mock').length).toBeGreaterThan(0);
  expect(screen.getByText('ResetPassword Mock')).toBeInTheDocument();
  expect(screen.getByText('Footer Mock')).toBeInTheDocument();
});
