
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';

test('renders AdminDashboard component', () => {
  render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>
  );
  const linkElement = screen.getByText(/Booking Management System/i);
  expect(linkElement).toBeInTheDocument();
});
