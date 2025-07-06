
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StaffDashboard from './StaffDashboard';

test('renders StaffDashboard component', () => {
  render(
    <MemoryRouter>
      <StaffDashboard />
    </MemoryRouter>
  );
  const linkElement = screen.getByText(/Booking Management System - Staff Portal/i);
  expect(linkElement).toBeInTheDocument();
});
