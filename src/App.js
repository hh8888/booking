import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Auth from './Auth';
import Services from './Services';
import Bookings from './Bookings';
// import Payment from './Payment';
import './index.css'; // Import Tailwind CSS
import './App.css';
import AdminDashboard from './AdminDashboard';
import Footer from './components/common/Footer';
import CustomerDashboard from './components/customer/CustomerDashboard';
import ResetPassword from './ResetPassword'; 

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('=== ERROR BOUNDARY CAUGHT ERROR ===');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('Error Stack:', error.stack);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Sorry, something went wrong</h2>
            <p className="text-gray-600 mb-4">We are working to fix this issue. Please try again later.</p>
            {/* Add error details for debugging */}
            <details className="mb-4 text-sm">
              <summary className="cursor-pointer text-gray-500">Error Details (for debugging)</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                {this.state.error && this.state.error.toString()}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-200"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/booking" element={<CustomerDashboard />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth" element={<Auth />} />
        </Routes>
        <Footer />
      </ErrorBoundary>
    </Router>
  );
}

export default App;