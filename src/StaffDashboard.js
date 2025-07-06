import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import DashboardTab from './components/dashboard/DashboardTab';
import UsersTab from './components/service/UsersTab';
import BookingsTab from './components/booking/BookingsTab';
import ReportsTab from './components/reports/ReportsTab';
import LocationSelector from './components/common/LocationSelector';
import UserDropdown from './components/common/UserDropdown';
import DatabaseService from './services/DatabaseService';
import LocationService from './services/LocationService';
import UserService from './services/UserService';
import LoadingSpinner from './components/common/LoadingSpinner';

export default function StaffDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState('Booking Management System');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userName, setUserName] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  
  const [networkError, setNetworkError] = useState(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchBusinessInfo = async () => {
      try {
        const dbService = DatabaseService.getInstance();
        const name = await dbService.getSettingsByKey('system', 'businessName');
        
        if (name) {
          setBusinessName(name);
        }
      } catch (error) {
        console.error('Error fetching business info:', error);
      }
    };

    fetchBusinessInfo();
    
    const fetchUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Auth user:', user);
      if (user) {
        setUserEmail(user.email);
        
        const { data: userData } = await supabase
          .from('users')
          .select('id, role, full_name')
          .eq('email', user.email)
          .single();
          
        console.log('Database userData:', userData);
          
        if (userData) {
          console.log('Setting currentUserId to:', userData.id);
          setCurrentUserId(userData.id);
          setUserRole(userData.role);
          setUserName(userData.full_name);
        } else {
          console.log('No user found in database for email:', user.email);
        }
      }
    };
    fetchUserInfo();
    
    // For staff dashboard, we only need to fetch customers and other staff for booking purposes
    const fetchUsers = async () => {
      try {
        const userService = UserService.getInstance();
        const allUsers = await userService.fetchUsers();
        // Filter to only show customers and staff for staff dashboard
        const filteredUsers = allUsers.filter(user => ['customer', 'staff'].includes(user.role));
        setUsers(filteredUsers);
        setNetworkError(null); // Clear previous errors
      } catch (e) {
        console.error("Exception fetching users:", e);
        setNetworkError("Network connection issue. Unable to fetch user data. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    };
  
    fetchUsers();
  }, []);

  // Retry fetching user data
  const retryFetchUsers = () => {
    setLoading(true);
    setNetworkError(null);
    // Trigger useEffect again
    const fetchUsers = async () => {
      try {
        const userService = UserService.getInstance();
        const allUsers = await userService.fetchUsers();
        // Filter to only show customers and staff for staff dashboard
        const filteredUsers = allUsers.filter(user => ['customer', 'staff'].includes(user.role));
        setUsers(filteredUsers);
        setNetworkError(null);
      } catch (e) {
        console.error("Exception fetching users:", e);
        setNetworkError("Network connection issue. Unable to fetch user data. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert(error.message);
    else window.location.reload(); // Reload the page to return to the sign-in screen
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6 flex flex-col">
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">{businessName} - Staff Portal</h1>
          <LocationSelector />
        </div>
        <UserDropdown 
          userEmail={userEmail}
          userRole={userRole}
          userName={userName}
          currentUserId={currentUserId}
        />
      </div>
    
      {/* Tab Navigation - Removed Settings, Services, and Reports tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 mb-4 md:mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-2 px-3 md:px-4 text-sm md:text-base whitespace-nowrap ${
            activeTab === 'dashboard' 
              ? 'text-blue-500 border-b-2 border-blue-500' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`py-2 px-3 md:px-4 text-sm md:text-base whitespace-nowrap ${
            activeTab === 'bookings' 
              ? 'text-blue-500 border-b-2 border-blue-500' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          My Bookings
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`py-2 px-3 md:px-4 text-sm md:text-base whitespace-nowrap ${
            activeTab === 'customers' 
              ? 'text-blue-500 border-b-2 border-blue-500' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Customers
        </button>
      </div>
    
      {/* Tab Content */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md flex-grow mb-16">
        {loading ? (
          <LoadingSpinner fullScreen={true} text="Loading data..." />
        ) : networkError ? (
          <div className="text-center py-6 md:py-8">
            <div className="text-red-500 text-base md:text-xl mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>{networkError}</p>
            </div>
            <button 
              onClick={retryFetchUsers}
              className="mt-4 bg-blue-500 text-white py-2 px-4 md:px-6 rounded-lg hover:bg-blue-600 transition duration-200 text-sm md:text-base"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardTab staffMode={true} currentUserId={currentUserId} />}
            {activeTab === 'bookings' && <BookingsTab users={users} staffMode={true} currentUserId={currentUserId} />}
            {activeTab === 'customers' && <UsersTab users={users.filter(user => user.role === 'customer')} setUsers={setUsers} staffMode={true} />}
          </>
        )}
      </div>
    </div>
  );
}
