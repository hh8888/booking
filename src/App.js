

import React, { Suspense, lazy, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Auth from './Auth';
import Services from './Services';
import Bookings from './Bookings';
// import Payment from './Payment';
import './index.css'; // Import Tailwind CSS
import './App.css';
import ResetPassword from './ResetPassword'; 
import Footer from './components/common/Footer';
import LoadingSpinner from './components/common/LoadingSpinner';
import { LanguageProvider } from './contexts/LanguageContext';
import { CompactModeProvider } from './contexts/CompactModeContext';
import { SettingsProvider } from './contexts/SettingsContext';

// Use the new combined Dashboard component
const Dashboard = lazy(() => import('./Dashboard'));
const CustomerDashboard = lazy(() => import('./components/customer/CustomerDashboard'));

// Add at the top
const APP_VERSION = process.env.REACT_APP_VERSION || '0.1.0';

function App() {
  return (
    <LanguageProvider>
      <CompactModeProvider>
        <SettingsProvider>
          <Router>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={<Auth />} />
                <Route path="/admin" element={<Dashboard />} />
                <Route path="/staff" element={<Dashboard />} />
                <Route path="/booking" element={<CustomerDashboard />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/auth" element={<Auth />} />
              </Routes>
              <Footer />
            </Suspense>
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
          </Router>
        </SettingsProvider>
      </CompactModeProvider>
    </LanguageProvider>
  );
}

export default App;