import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ResetPassword from './ResetPassword';
import { supabase } from './supabaseClient';

jest.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(),
      updateUser: jest.fn(),
      setSession: jest.fn(),
    },
  },
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

describe('ResetPassword Component', () => {
  beforeEach(() => {
    // react-scripts resets mock implementations before each test, so set them here
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    supabase.auth.setSession.mockResolvedValue({ data: { session: null }, error: null });
    supabase.auth.updateUser.mockResolvedValue({ error: null });
    window.location.hash = '';
  });

  test('renders with invalid recovery link if no token is present', async () => {
    render(<ResetPassword />);
    expect(await screen.findByText('Invalid recovery link. Please request a new password reset link.')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('New Password')).not.toBeInTheDocument();
  });

  test('renders with invalid recovery link for wrong token type', async () => {
    window.location.hash = '#access_token=some-token&refresh_token=some-refresh-token&type=signup';
    render(<ResetPassword />);
    expect(await screen.findByText('Invalid recovery link. Please request a new password reset link.')).toBeInTheDocument();
    expect(supabase.auth.setSession).not.toHaveBeenCalled();
  });

  test('shows verification error from URL', async () => {
    window.location.hash = '#error=access_denied&error_description=Token+has+expired+or+is+invalid';
    render(<ResetPassword />);
    expect(await screen.findByText('Error: Token has expired or is invalid')).toBeInTheDocument();
  });

  test('shows a friendly message for an expired link', async () => {
    window.location.hash = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid';
    render(<ResetPassword />);
    expect(await screen.findByText('The password reset link has expired or is invalid. Please request a new one.')).toBeInTheDocument();
  });

  test('handles PASSWORD_RECOVERY event and shows password form', async () => {
    // Supabase fires the event asynchronously, after the component has mounted
    supabase.auth.onAuthStateChange.mockImplementation((callback) => {
      Promise.resolve().then(() => callback('PASSWORD_RECOVERY', { user: { id: '123' } }));
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    render(<ResetPassword />);

    expect(await screen.findByPlaceholderText('New Password')).toBeInTheDocument();
    expect(screen.getByText('You can now set your new password.')).toBeInTheDocument();
  });

  test('establishes a session from a recovery link and shows password form', async () => {
    window.location.hash = '#access_token=valid-token&refresh_token=valid-refresh&type=recovery';
    supabase.auth.setSession.mockResolvedValue({ data: { session: { user: { id: '123' } } }, error: null });

    render(<ResetPassword />);

    expect(await screen.findByPlaceholderText('New Password')).toBeInTheDocument();
    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: 'valid-token',
      refresh_token: 'valid-refresh',
    });
  });

  test('shows an error when the recovery session cannot be established', async () => {
    window.location.hash = '#access_token=bad-token&refresh_token=bad-refresh&type=recovery';
    supabase.auth.setSession.mockResolvedValue({ data: null, error: { message: 'Invalid token' } });

    render(<ResetPassword />);

    expect(await screen.findByText('Failed to process recovery link: Invalid token. Please try again.')).toBeInTheDocument();
  });

  test('updates the password and confirms', async () => {
    window.location.hash = '#access_token=valid-token&refresh_token=valid-refresh&type=recovery';
    supabase.auth.setSession.mockResolvedValue({ data: { session: { user: { id: '123' } } }, error: null });

    render(<ResetPassword />);
    fireEvent.change(await screen.findByPlaceholderText('New Password'), { target: { value: 'newpassword1' } });
    fireEvent.click(screen.getByText('Set New Password'));

    expect(await screen.findByText('Password updated successfully! Redirecting to login...')).toBeInTheDocument();
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'newpassword1' });
  });

  test('shows an error when the password update fails', async () => {
    window.location.hash = '#access_token=valid-token&refresh_token=valid-refresh&type=recovery';
    supabase.auth.setSession.mockResolvedValue({ data: { session: { user: { id: '123' } } }, error: null });
    supabase.auth.updateUser.mockResolvedValue({ error: { message: 'Password too weak' } });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<ResetPassword />);
    fireEvent.change(await screen.findByPlaceholderText('New Password'), { target: { value: 'weak' } });
    fireEvent.click(screen.getByText('Set New Password'));

    expect(await screen.findByText('Failed to update password: Password too weak')).toBeInTheDocument();
  });

  test('offers a way back to login from an invalid link', async () => {
    render(<ResetPassword />);
    fireEvent.click(await screen.findByText('Go to Login'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/auth'));
  });
});
