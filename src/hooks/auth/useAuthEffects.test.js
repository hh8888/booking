import React, { useState } from 'react';
import { render, screen, act } from '@testing-library/react';
import { useAuthEffects } from './useAuthEffects';

jest.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      // Never resolves, so the hook has to fall back on its timeout
      getSession: () => new Promise(() => {}),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

jest.mock('../../services/DatabaseService', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      getSettings: () => Promise.resolve({}),
    }),
  },
}));

const mockLocation = { pathname: '/', search: '', state: null };
jest.mock('react-router-dom', () => ({
  useLocation: () => mockLocation,
}));

const mockSetShowExpiredLinkError = jest.fn();

function TestComponent() {
  const [isLoading, setIsLoading] = useState(false);
  const state = {
    resendTimer: 0,
    setResendTimer: () => {},
    setCanResend: () => {},
    setShowExpiredLinkError: mockSetShowExpiredLinkError,
    setIsLoading,
    setError: () => {},
    setIsMobileAuthEnabled: () => {},
    isVerifying: false,
    setIsVerifying: () => {},
    setShowTimeoutPrompt: () => {},
    verificationTimeout: null,
    setVerificationTimeout: () => {},
  };
  // A new function on every render, as in the real Auth component
  const checkUserRoleAndRedirect = async () => {};
  useAuthEffects(state, checkUserRoleAndRedirect);
  return <div data-testid="loading">{isLoading ? 'loading' : 'done'}</div>;
}

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  mockLocation.search = '';
  mockLocation.state = null;
  window.location.hash = '';
});

afterEach(() => {
  jest.useRealTimers();
});

test('clears loading when session fetch times out', async () => {
  render(<TestComponent />);
  await flush(); // system settings load, then the session check starts
  expect(screen.getByTestId('loading').textContent).toBe('loading');

  await act(async () => {
    jest.advanceTimersByTime(16000);
  });
  await flush();

  // Loading must end and stay ended (no repeated session checks)
  expect(screen.getByTestId('loading').textContent).toBe('done');
});

test('flags an expired email link from the URL', async () => {
  mockLocation.search = '?error=access_denied&error_code=otp_expired';
  render(<TestComponent />);
  await flush();

  expect(mockSetShowExpiredLinkError).toHaveBeenCalledWith(true);
  expect(screen.getByTestId('loading').textContent).toBe('done');
});

test('flags an expired email link passed through router state', async () => {
  mockLocation.state = { error: 'access_denied', errorCode: 'otp_expired' };
  render(<TestComponent />);
  await flush();

  expect(mockSetShowExpiredLinkError).toHaveBeenCalledWith(true);
});
