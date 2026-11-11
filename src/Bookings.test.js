
import React from 'react';
import { render, screen } from '@testing-library/react';
import Bookings from './Bookings';

test('renders Bookings component', () => {
  render(<Bookings />);
  const linkElement = screen.getByText(/Bookings/i);
  expect(linkElement).toBeInTheDocument();
});
