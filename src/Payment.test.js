
import React from 'react';
import { render, screen } from '@testing-library/react';
import Payment from './Payment';

test('renders Payment component', () => {
  render(<Payment />);
  const linkElement = screen.getByText(/Payment/i);
  expect(linkElement).toBeInTheDocument();
});
