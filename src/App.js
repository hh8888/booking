

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

// import AdminDashboard from './AdminDashboard';
// import StaffDashboard from './StaffDashboard'; // Add this import
// import CustomerDashboard from './components/customer/CustomerDashboard';

const AdminDashboard = lazy(() => import('./AdminDashboard'));
const StaffDashboard = lazy(() => import('./StaffDashboard'));
const CustomerDashboard = lazy(() => import('./components/customer/CustomerDashboard'));

// Add at the top
const APP_VERSION = process.env.REACT_APP_VERSION || '1.0.0';

function App() {
  useEffect(() => {
    const storedVersion = localStorage.getItem('app_version');
    if (storedVersion !== APP_VERSION) {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('app_version', APP_VERSION);
      window.location.reload();
    }
  }, []);

  return (
    <LanguageProvider>
      <Router>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/staff" element={<StaffDashboard />} /> {/* Add this route */}
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