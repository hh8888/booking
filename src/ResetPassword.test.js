
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ResetPassword from './ResetPassword';
import { supabase } from './supabaseClient';

// Mock the supabase client
jest.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
      updateUser: jest.fn(),
      setSession: jest.fn(),
    },
  },
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderWithRouter = (initialEntries) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth" element={<div>Auth Page</div>} />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('ResetPassword Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Reset window.location.hash
    window.location.hash = '';
  });

  test('renders with invalid recovery link if no token is present', async () => {
    renderWithRouter(['/reset-password']);
    await waitFor(() => {
      expect(screen.getByText('Invalid recovery link. Please request a new password reset link.')).toBeInTheDocument();
    });
  });

  test('renders with invalid recovery link for wrong token type', async () => {
    window.location.hash = '#access_token=some-token&refresh_token=some-refresh-token&type=signup';
    renderWithRouter(['/reset-password']);
    await waitFor(() => {
      expect(screen.getByText('Invalid recovery link. Please request a new password reset link.')).toBeInTheDocument();
    });
  });

  test('shows verification error from URL', async () => {
    window.location.hash = '#error=access_denied&error_description=Token+has+expired+or+is+invalid';
    renderWithRouter(['/reset-password']);
    await waitFor(() => {
      expect(screen.getByText('Error: Token has expired or is invalid')).toBeInTheDocument();
    });
  });

  test('handles PASSWORD_RECOVERY event and shows password form', async () => {
    window.location.hash = '#access_token=valid-token&refresh_token=valid-refresh&type=recovery';
    
    // Simulate onAuthStateChange firing with PASSWORD_RECOVERY
    supabase.auth.onAuthStateChange.mockImplementation((callback) => {
      callback('PASSWORD_RECOVERY', { user: { id: '123' } });
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    renderWithRouter(['/reset-password']);

    await waitFor(() => {
      expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      expect(screen.getByText('You can now set your new password.')).toBeInTheDocument();
    });
  });
});
