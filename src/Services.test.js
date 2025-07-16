
import React from 'react';
import { render, screen } from '@testing-library/react';
import Services from './Services';

test('renders Services component', () => {
  render(<Services />);
  const linkElement = screen.getByText(/Services/i);
  expect(linkElement).toBeInTheDocument();
});
