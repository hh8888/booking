// Lightweight stand-in for react-router-dom in Jest (the real v7 package does
// not load under the Jest version bundled with react-scripts 5).
// Wired up through "jest.moduleNameMapper" in package.json.
import React from 'react';

// Stable objects, so hooks that depend on them do not re-run on every render
const location = { pathname: '/', search: '', hash: '', state: null };
const navigate = jest.fn();

const Passthrough = ({ children }) => <>{children}</>;

module.exports = {
  MemoryRouter: Passthrough,
  BrowserRouter: Passthrough,
  HashRouter: Passthrough,
  Routes: Passthrough,
  Route: ({ element }) => element,
  Navigate: () => null,
  Link: ({ children }) => <a href="/">{children}</a>,
  useParams: () => ({}),
  useNavigate: () => navigate,
  useLocation: () => location,
};
