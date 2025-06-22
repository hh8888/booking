

import React, { Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Auth from './Auth';
import Services from './Services';
import Bookings from './Bookings';
// import Payment from './Payment';
import './index.css'; // Import Tailwind CSS
import './App.css';
import ResetPassword from './ResetPassword'; 
import Footer from './components/common/Footer';
import LoadingSpinner from './components/common/LoadingSpinner';

// import AdminDashboard from './AdminDashboard';
// import StaffDashboard from './StaffDashboard'; // Add this import
// import CustomerDashboard from './components/customer/CustomerDashboard';

const AdminDashboard = lazy(() => import('./AdminDashboard'));
const StaffDashboard = lazy(() => import('./StaffDashboard'));
const CustomerDashboard = lazy(() => import('./components/customer/CustomerDashboard'));

function App() {
  return (
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
    </Router>
  );
}

export default App;