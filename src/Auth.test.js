import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Auth from './Auth';
import { supabase } from './supabaseClient';
import { toast } from 'react-toastify';
import { ERROR_MESSAGES } from './constants';

// AuthForm is replaced by a bare form that exposes the same props Auth passes
// down, so these tests exercise Auth and its hooks rather than the form's layout.
jest.mock('./components/auth/AuthForm', () => (props) => (
  <div>
    <span>AuthForm Mock</span>
    <span data-testid="mode">{props.isSignUp ? 'signup' : 'signin'}</span>
    <span data-testid="mobile-auth">{String(props.isMobileAuthEnabled)}</span>
    <span data-testid="confirmation">{props.confirmationMessage}</span>
    <span data-testid="forgot-password">{String(props.showForgotPassword)}</span>
    <input data-testid="email-input" value={props.email} onChange={(e) => props.setEmail(e.target.value)} />
    <input data-testid="password-input" value={props.password} onChange={(e) => props.setPassword(e.target.value)} />
    <input data-testid="name-input" value={props.name} onChange={(e) => props.setName(e.target.value)} />
    <input data-testid="mobile-input" value={props.mobile} onChange={(e) => props.setMobile(e.target.value)} />
    <input data-testid="otp-input" value={props.otp} onChange={(e) => props.setOtp(e.target.value)} />
    <button data-testid="toggle-signup-button" onClick={() => props.setIsSignUp(!props.isSignUp)}>toggle</button>
    <button data-testid="signin-button" onClick={props.onSignIn}>sign in</button>
    <button data-testid="signup-button" onClick={props.onSignUp}>sign up</button>
    <button data-testid="reset-password-button" onClick={props.onResetPassword}>reset</button>
    <button data-testid="verify-otp-button" onClick={props.onOtpVerification}>verify</button>
    <button data-testid="resend-otp-button" onClick={props.onResendOtp}>resend</button>
  </div>
));
jest.mock('./AdminDashboard', () => () => <div>AdminDashboard Mock</div>);
jest.mock('./StaffDashboard', () => () => <div>StaffDashboard Mock</div>);
jest.mock('./components/customer/CustomerDashboard', () => () => <div>CustomerDashboard Mock</div>);
jest.mock('./contexts/LanguageContext', () => require('./testUtils/mockLanguage'));
jest.mock('./contexts/CompactModeContext', () => ({
  useCompactMode: () => ({ isCompactMode: false, toggleCompactMode: () => {} }),
}));

let mockSystemSettings = {};
jest.mock('./services/DatabaseService', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      getSettings: () => Promise.resolve(mockSystemSettings),
    }),
  },
}));

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() },
}));

jest.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      verifyOtp: jest.fn(),
      resend: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const mockNavigate = jest.fn();
const mockLocation = { pathname: '/', search: '', state: null };
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

// Stand-in for the "users" table: answers the queries the auth flow makes
let usersInsert;
let usersUpdate;
const mockUsersTable = ({ role = 'customer', roleError = null, insertError = null } = {}) => {
  usersInsert = jest.fn().mockResolvedValue({ error: insertError });
  usersUpdate = jest.fn(() => ({ eq: () => Promise.resolve({ error: null }) }));
  supabase.from.mockImplementation(() => ({
    select: (columns) => ({
      eq: () => ({
        single: () => {
          if (columns === 'role') {
            return Promise.resolve(roleError ? { data: null, error: roleError } : { data: { role }, error: null });
          }
          if (columns === 'last_location') {
            return Promise.resolve({ data: { last_location: null }, error: null });
          }
          return Promise.resolve({ data: { email_verified: true }, error: null });
        },
      }),
    }),
    insert: usersInsert,
    update: usersUpdate,
  }));
};

const confirmedUser = (id, email) => ({ id, email, confirmed_at: '2026-01-01T00:00:00Z' });

const renderAuth = async () => {
  render(<Auth />);
  // Wait for the settings load and the session check to finish
  await screen.findByText('AuthForm Mock');
};

const type = (testId, value) => fireEvent.change(screen.getByTestId(testId), { target: { value } });
const click = (testId) => fireEvent.click(screen.getByTestId(testId));

describe('Auth Component', () => {
  beforeEach(() => {
    // react-scripts resets mock implementations before each test, so set them here
    mockSystemSettings = {};
    mockLocation.search = '';
    mockLocation.state = null;
    window.location.hash = '';
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    mockUsersTable();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  // --- Initial load ---

  test('shows the sign-in form when there is no session', async () => {
    await renderAuth();
    expect(screen.getByTestId('mode')).toHaveTextContent('signin');
    expect(supabase.auth.getSession).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('redirects straight away when a session already exists', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: confirmedUser('staff1', 'staff@example.com') } },
    });
    mockUsersTable({ role: 'staff' });

    render(<Auth />);

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/staff'));
    expect(await screen.findByText('StaffDashboard Mock')).toBeInTheDocument();
  });

  test('passes the mobile auth system setting to the form', async () => {
    mockSystemSettings = { enableMobileAuth: 'true' };
    await renderAuth();
    await waitFor(() => expect(screen.getByTestId('mobile-auth')).toHaveTextContent('true'));
  });

  test('mobile auth is off when the setting is missing', async () => {
    await renderAuth();
    expect(screen.getByTestId('mobile-auth')).toHaveTextContent('false');
  });

  test('shows the expired link screen and returns to login from it', async () => {
    mockLocation.search = '?error=access_denied&error_code=otp_expired';
    render(<Auth />);

    // t() returns the key in tests
    fireEvent.click(await screen.findByText('auth.goToLogin'));

    expect(await screen.findByText('AuthForm Mock')).toBeInTheDocument();
    expect(screen.getByTestId('mode')).toHaveTextContent('signin');
  });

  // --- Email sign in ---

  test.each([
    ['admin', '/admin', 'AdminDashboard Mock'],
    ['manager', '/admin', null],
    ['staff', '/staff', 'StaffDashboard Mock'],
    ['customer', '/booking', 'CustomerDashboard Mock'],
  ])('signs in a %s and redirects to %s', async (role, route, dashboardText) => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: confirmedUser('user1', 'user@example.com') },
      error: null,
    });
    mockUsersTable({ role });
    await renderAuth();

    type('email-input', 'user@example.com');
    type('password-input', 'password123');
    click('signin-button');

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(route));
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(usersUpdate).toHaveBeenCalledWith({ last_sign_in: expect.any(String) });
    if (dashboardText) {
      expect(await screen.findByText(dashboardText)).toBeInTheDocument();
    }
  });

  test('refuses sign in for an unconfirmed email', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'u1', email: 'new@example.com', confirmed_at: null } },
      error: null,
    });
    await renderAuth();

    type('email-input', 'new@example.com');
    type('password-input', 'password123');
    click('signin-button');

    expect(await screen.findByText('Please check your email to validate your account before signing in.')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('shows the error when sign in fails', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: null, error: new Error('Invalid login credentials') });
    await renderAuth();

    type('email-input', 'wrong@example.com');
    type('password-input', 'wrongpassword');
    click('signin-button');

    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('shows an error when the signed-in user has no record in the users table', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: confirmedUser('ghost', 'ghost@example.com') },
      error: null,
    });
    mockUsersTable({ roleError: { code: 'PGRST116', message: 'no rows' } });
    await renderAuth();

    type('email-input', 'ghost@example.com');
    type('password-input', 'password123');
    click('signin-button');

    expect(await screen.findByText('Account setup incomplete. User record not found in database. Please contact support.')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('shows an error for an unknown role', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: confirmedUser('odd', 'odd@example.com') },
      error: null,
    });
    mockUsersTable({ role: 'something-else' });
    await renderAuth();

    type('email-input', 'odd@example.com');
    type('password-input', 'password123');
    click('signin-button');

    expect(await screen.findByText(ERROR_MESSAGES.UNKNOWN_ROLE)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // --- Email sign up ---

  test('signs up a new customer and returns to the sign-in form', async () => {
    supabase.auth.signUp.mockResolvedValue({ data: { user: { id: '123', email: 'test@example.com' } }, error: null });
    await renderAuth();

    click('toggle-signup-button');
    expect(screen.getByTestId('mode')).toHaveTextContent('signup');
    type('email-input', 'test@example.com');
    type('password-input', 'password123');
    type('name-input', 'Test User');
    type('mobile-input', '+61400000000');
    click('signup-button');

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Registration successful!'));
    expect(supabase.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: 'test@example.com',
      password: 'password123',
    }));
    expect(usersInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        id: '123',
        email: 'test@example.com',
        full_name: 'Test User',
        phone_number: '+61400000000',
        role: 'customer',
        email_verified: false,
      }),
    ]);
    expect(screen.getByTestId('confirmation')).toHaveTextContent('Please check your email for the confirmation link.');
    expect(screen.getByTestId('mode')).toHaveTextContent('signin');
    expect(screen.getByTestId('email-input')).toHaveValue(''); // form cleared
  });

  test('shows a friendly message when the email is already registered', async () => {
    supabase.auth.signUp.mockResolvedValue({ data: null, error: new Error('User already registered') });
    await renderAuth();

    click('toggle-signup-button');
    type('email-input', 'existing@example.com');
    type('password-input', 'password123');
    type('name-input', 'Existing User');
    type('mobile-input', '+61400000000');
    click('signup-button');

    expect(await screen.findByText(ERROR_MESSAGES.DUPLICATE_EMAIL)).toBeInTheDocument();
    expect(usersInsert).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  test('shows the error when saving the new user record fails', async () => {
    supabase.auth.signUp.mockResolvedValue({ data: { user: { id: '123' } }, error: null });
    mockUsersTable({ insertError: new Error('permission denied for table users') });
    await renderAuth();

    click('toggle-signup-button');
    type('email-input', 'test@example.com');
    type('password-input', 'password123');
    type('name-input', 'Test User');
    type('mobile-input', '+61400000000');
    click('signup-button');

    expect(await screen.findByText('permission denied for table users')).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  // --- Form validation ---

  test.each([
    ['', '', 'Please enter your email and password'],
    ['user@example.com', '', 'Please enter your email and password'],
    ['user@example.com', '123', 'Password must be at least 6 characters'],
  ])('blocks sign in with email "%s" and password "%s"', async (email, password, message) => {
    await renderAuth();
    type('email-input', email);
    type('password-input', password);
    click('signin-button');

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  test.each([
    [{}, 'Please enter your email and password'],
    [{ email: 'test@example.com', password: 'password123' }, 'Please enter your name'],
    [{ email: 'test@example.com', password: 'password123', name: 'Test User' }, 'Please enter your mobile number'],
    [{ email: 'invalid-email', password: 'password123', name: 'Test User', mobile: '+61400000000' }, 'Please enter a valid email address'],
    [{ email: 'test@example.com', password: '123', name: 'Test User', mobile: '+61400000000' }, 'Password must be at least 6 characters'],
  ])('blocks sign up with %j', async (fields, message) => {
    await renderAuth();
    click('toggle-signup-button');
    if (fields.email) type('email-input', fields.email);
    if (fields.password) type('password-input', fields.password);
    if (fields.name) type('name-input', fields.name);
    if (fields.mobile) type('mobile-input', fields.mobile);
    click('signup-button');

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
    expect(usersInsert).not.toHaveBeenCalled();
  });

  test('clears a validation error once the form is valid', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: confirmedUser('user1', 'user@example.com') },
      error: null,
    });
    await renderAuth();

    type('email-input', 'user@example.com');
    type('password-input', '123');
    click('signin-button');
    expect(await screen.findByText('Password must be at least 6 characters')).toBeInTheDocument();

    type('password-input', 'password123');
    click('signin-button');

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/booking'));
    expect(screen.queryByText('Password must be at least 6 characters')).not.toBeInTheDocument();
  });

  // --- Reset password ---

  test('sends a password reset email', async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    await renderAuth();

    type('email-input', 'test@example.com');
    click('reset-password-button');

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Password reset email sent!'));
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
      redirectTo: expect.stringContaining('/#/reset-password'),
    });
    expect(screen.getByTestId('confirmation')).toHaveTextContent('Password reset email sent. Please check your inbox.');
  });

  test('asks for an email before resetting the password', async () => {
    await renderAuth();
    click('reset-password-button');

    expect(await screen.findByText('Please enter your email address to reset your password.')).toBeInTheDocument();
    expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  test('rejects an invalid email when resetting the password', async () => {
    await renderAuth();
    type('email-input', 'invalid-email');
    click('reset-password-button');

    expect(await screen.findByText('Please enter a valid email address.')).toBeInTheDocument();
    expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  test('shows the error when the reset email cannot be sent', async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ data: null, error: new Error('Email rate limit exceeded') });
    await renderAuth();

    type('email-input', 'test@example.com');
    click('reset-password-button');

    expect(await screen.findByText('Email rate limit exceeded')).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  // --- Phone OTP ---

  test('requires a 6-digit OTP before verifying', async () => {
    await renderAuth();
    type('otp-input', '123');
    click('verify-otp-button');

    expect(await screen.findByText('Please enter a valid 6-digit OTP')).toBeInTheDocument();
    expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
  });

  test('verifies the OTP and redirects', async () => {
    supabase.auth.verifyOtp.mockResolvedValue({ data: { user: { id: 'phone1', phone: '+61400000000' } }, error: null });
    await renderAuth();

    type('mobile-input', '+61400000000');
    type('otp-input', '123456');
    click('verify-otp-button');

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/booking'));
    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      phone: '+61400000000',
      token: '123456',
      type: 'sms',
    });
  });

  test('shows the error when the OTP is wrong', async () => {
    supabase.auth.verifyOtp.mockResolvedValue({ data: null, error: { message: 'Token has expired or is invalid' } });
    await renderAuth();

    type('mobile-input', '+61400000000');
    type('otp-input', '000000');
    click('verify-otp-button');

    expect(await screen.findByText('Token has expired or is invalid')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('does not resend the OTP while the resend timer is running', async () => {
    await renderAuth();
    click('resend-otp-button');

    expect(supabase.auth.resend).not.toHaveBeenCalled();
  });
});
