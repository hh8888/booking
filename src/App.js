

import React, { Suspense, lazy, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
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

// Use the new combined Dashboard component
const Dashboard = lazy(() => import('./Dashboard'));
const CustomerDashboard = lazy(() => import('./components/customer/CustomerDashboard'));

// Add at the top
const APP_VERSION = process.env.REACT_APP_VERSION || '1.0.0';

function App() {
  useEffect(() => {
    const storedVersion = localStorage.getItem('app_version');
    const currentVersion = APP_VERSION;
    
    // Only clear cache if there's a significant version change
    // Not on every build (timestamp-based versions)
    if (storedVersion && storedVersion !== currentVersion) {
      // Check if it's a meaningful version change (not just timestamp)
      const versionDiff = Math.abs(parseInt(currentVersion) - parseInt(storedVersion));
      
      // Only clear if version difference is more than 1 hour (3600 seconds)
      if (versionDiff > 3600) {
        console.log('Significant version change detected, clearing cache...');
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('app_version', currentVersion);
        
        // Unregister service worker before reload
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for(let registration of registrations) {
              registration.unregister();
            }
            window.location.reload();
          });
        } else {
          window.location.reload();
        }
      } else {
        // Just update version without clearing cache
        localStorage.setItem('app_version', currentVersion);
      }
    } else if (!storedVersion) {
      localStorage.setItem('app_version', currentVersion);
    }
  }, []);

  return (
    <LanguageProvider>
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
    </LanguageProvider>
  );
}

export default App;