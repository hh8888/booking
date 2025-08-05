import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import DatabaseService from './services/DatabaseService';
import LocationService from './services/LocationService';
import DashboardTab from './components/dashboard/DashboardTab';
import UsersTab from './components/service/UsersTab';
import ServicesTab from './components/service/ServicesTab';
import BookingsTab from './components/booking/BookingsTab';
import ReportsTab from './components/reports/ReportsTab';
import SettingsTab from './components/SettingsTab';
import LocationSelector from './components/common/LocationSelector';
import UserDropdown from './components/common/UserDropdown';
import SessionIndicator from './components/common/SessionIndicator';
import LoadingSpinner from './components/common/LoadingSpinner';
import { useBusinessInfo } from './hooks/useBusinessInfo';
import useDashboardUser from './hooks/useDashboardUser';
import useLocationManager from './hooks/useLocationManager';
import { useUsersData } from './hooks/useUsersData';
import { useLanguage } from './contexts/LanguageContext';
import { USER_ROLES, TABLES } from './constants';
import { toast } from 'react-toastify';

export default function Dashboard() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isScrolled, setIsScrolled] = useState(false); // Restore this line
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // Add refs for location management
  const initializationRef = useRef(false);
  const locationRestorationRef = useRef(false);
  
  // Use custom hooks for shared logic
  const { businessName } = useBusinessInfo();
  const { userEmail, userRole, userName, currentUserId, lastLocation, loading: userLoading, error: userError } = useDashboardUser();
  
  // Role-based configuration
  const isAdmin = userRole === USER_ROLES.ADMIN;
  const isStaff = userRole === USER_ROLES.STAFF;
  
  // Conditional users data filtering for staff
  const usersDataConfig = isStaff ? { roleFilter: ['customer', 'staff'] } : {};
  const { users, setUsers, loading: usersLoading, networkError, retryFetch, error: usersError } = useUsersData(usersDataConfig);

  // Scroll event listener for header transition with improved stability
  useEffect(() => {
    let timeoutId = null;
    let isUpdating = false;
    
    const handleScroll = () => {
      if (isUpdating) return;
      
      // Clear any pending timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Debounce the scroll handler
      timeoutId = setTimeout(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const scrollThreshold = windowHeight * 0.1; // 10% of viewport height
        
        // Add hysteresis to prevent bouncing
        const upperThreshold = scrollThreshold + 20; // Add 20px buffer
        const lowerThreshold = scrollThreshold - 20; // Subtract 20px buffer
        
        const shouldBeScrolled = isScrolled 
          ? scrollTop > lowerThreshold  // If already scrolled, use lower threshold
          : scrollTop > upperThreshold; // If not scrolled, use upper threshold
        
        if (shouldBeScrolled !== isScrolled) {
          isUpdating = true;
          setIsScrolled(shouldBeScrolled);
          
          // Reset the updating flag after a short delay
          setTimeout(() => {
            isUpdating = false;
          }, 100);
        }
      }, 10); // 10ms debounce
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isScrolled]); // Include isScrolled in dependencies for hysteresis

  // Add debugging logs for admin
  useEffect(() => {
    if (isAdmin) {
      console.log('=== Dashboard Debug Info ===');
      console.log('userLoading:', userLoading);
      console.log('usersLoading:', usersLoading);
      console.log('userError:', userError);
      console.log('usersError:', usersError);
      console.log('networkError:', networkError);
      console.log('currentUserId:', currentUserId);
      console.log('userRole:', userRole);
      console.log('users count:', users?.length);
      console.log('=== End Debug Info ===');
    }
  }, [userLoading, usersLoading, userError, usersError, networkError, currentUserId, userRole, users, isAdmin]);

  // Use the location manager hook for both admin and staff
  useLocationManager({
    userId: currentUserId,
    lastLocation,
    userLoading,
    userType: isAdmin ? 'admin' : 'staff'
  });

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert(error.message);
    else window.location.reload();
  };

  // Add error display for user loading errors
  if (userError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-4">User Authentication Error</div>
          <div className="text-sm text-gray-600 mb-4">{userError}</div>
          <button 
            onClick={() => window.location.href = '/auth'}
            className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Define available tabs based on role
  const availableTabs = {
    dashboard: true,
    bookings: true,
    users: isAdmin,
    customers: isStaff,
    services: isAdmin,
    reports: isAdmin,
    settings: isAdmin
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Sticky Header Section with Scroll-based Transition */}
      <div className={`sticky top-0 z-50 bg-gray-100 border-b border-gray-200 shadow-sm transition-all duration-300 ease-in-out ${
        isScrolled ? 'py-0' : 'py-2 md:py-3'
      }`}>
        <div className={`transition-all duration-300 ease-in-out ${
          isScrolled ? 'px-1 md:px-2' : 'px-2 md:px-3'
        }`}>
          {/* Full width title with conditional margin */}
          <div className={`transition-all duration-300 ease-in-out ${
            isScrolled ? 'mb-0' : 'mb-2 md:mb-3'
          }`}>
            <h1 className={`font-bold text-gray-800 transition-all duration-300 ease-in-out ${
              isScrolled ? 'text-base md:text-lg' : 'text-lg md:text-xl'
            }`}>{businessName}</h1>
          </div>
          
          {/* Location and menu row with conditional margin */}
          <div className={`flex justify-between items-center transition-all duration-300 ease-in-out ${
            isScrolled ? 'mb-0' : 'mb-2 md:mb-3'
          }`}>
            <div>
              <LocationSelector />
            </div>
            <div className="flex items-center space-x-2">
              <SessionIndicator />
              <UserDropdown 
                userEmail={userEmail}
                userRole={userRole}
                userName={userName}
                currentUserId={currentUserId}
              />
            </div>
          </div>
        
          {/* Tab Navigation with conditional padding */}
          <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
            {availableTabs.dashboard && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`whitespace-nowrap flex-shrink-0 text-sm transition-all duration-300 ease-in-out ${
                  isScrolled ? 'py-1 px-2 md:px-2' : 'py-1.5 px-2 md:px-3'
                } ${
                  activeTab === 'dashboard' 
                    ? 'text-blue-500 border-b-2 border-blue-500' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('nav.dashboard')}
              </button>
            )}
            {/* Apply the same conditional padding pattern to all other tab buttons */}

            {availableTabs.bookings && (
              <button
                onClick={() => setActiveTab('bookings')}
                className={`whitespace-nowrap flex-shrink-0 text-sm transition-all duration-300 ease-in-out ${
                  isScrolled ? 'py-1 px-2 md:px-2' : 'py-1.5 px-2 md:px-3'
                } ${
                  activeTab === 'bookings' 
                    ? 'text-blue-500 border-b-2 border-blue-500' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {isStaff ? t('nav.myBookings') : t('nav.bookings')}
              </button>
            )}
            {availableTabs.users && (
              <button
                onClick={() => setActiveTab('users')}
                className={`whitespace-nowrap flex-shrink-0 text-sm transition-all duration-300 ease-in-out ${
                  isScrolled ? 'py-1 px-2 md:px-2' : 'py-1.5 px-2 md:px-3'
                } ${
                  activeTab === 'users' 
                    ? 'text-blue-500 border-b-2 border-blue-500' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('nav.users')}
              </button>
            )}
            {availableTabs.customers && (
              <button
                onClick={() => setActiveTab('customers')}
                className={`whitespace-nowrap flex-shrink-0 text-sm transition-all duration-300 ease-in-out ${
                  isScrolled ? 'py-1 px-2 md:px-2' : 'py-1.5 px-2 md:px-3'
                } ${
                  activeTab === 'customers' 
                    ? 'text-blue-500 border-b-2 border-blue-500' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('nav.customers')}
              </button>
            )}
            {availableTabs.services && (
              <button
                onClick={() => setActiveTab('Services')}
                className={`py-2 px-3 md:px-4 text-sm md:text-base whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'Services' 
                    ? 'text-blue-500 border-b-2 border-blue-500' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('nav.services')}
              </button>
            )}
            {availableTabs.reports && (
              <button
                onClick={() => setActiveTab('reports')}
                className={`py-2 px-3 md:px-4 text-sm md:text-base whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'reports' 
                    ? 'text-blue-500 border-b-2 border-blue-500' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('nav.reports')}
              </button>
            )}
            {availableTabs.settings && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-3 md:px-4 text-sm md:text-base whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'settings' 
                    ? 'text-blue-500 border-b-2 border-blue-500' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('nav.settings')}
              </button>
            )}
          </div>
        </div>
      </div>
    
      {/* Scrollable Content Area */}
      <div className="flex-grow p-4 md:p-6 pt-0">
        {/* Tab Content */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md flex-grow mb-16">
        {/* Loading and error handling */}
        {userLoading ? (
          <div>
            <LoadingSpinner text={t('common.loading')} />
            <div className="text-center mt-4 text-sm text-gray-500">Loading user information...</div>
          </div>
        ) : (isAdmin && usersLoading) ? (
          <div>
            <LoadingSpinner text={t('users.loadingUsers')} />
            <div className="text-center mt-4 text-sm text-gray-500">Loading users data...</div>
          </div>
        ) : (isStaff && usersLoading) ? (
          <LoadingSpinner fullScreen={true} text={t('common.loading')} />
        ) : networkError ? (
          <div className="text-center py-6 md:py-8">
            <div className="text-red-500 text-base md:text-xl mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>{networkError}</p>
            </div>
            <button 
              onClick={retryFetch}
              className="mt-4 bg-blue-500 text-white py-2 px-4 md:px-6 rounded-lg hover:bg-blue-600 transition duration-200 text-sm md:text-base"
            >
              {t('common.retry')}
            </button>
          </div>
        ) : (isAdmin && usersError) ? (
          <div className="text-center py-6 md:py-8">
            <div className="text-red-500 text-base md:text-xl mb-4">
              <p>Error loading users: {usersError}</p>
            </div>
            <button 
              onClick={retryFetch}
              className="mt-4 bg-blue-500 text-white py-2 px-4 md:px-6 rounded-lg hover:bg-blue-600 transition duration-200 text-sm md:text-base"
            >
              {t('common.retry')}
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardTab 
                staffMode={isStaff} 
                currentUserId={isStaff ? currentUserId : undefined} 
              />
            )}
            {activeTab === 'bookings' && (
              <BookingsTab 
                users={users} 
                staffMode={isStaff} 
                currentUserId={isStaff ? currentUserId : undefined} 
              />
            )}
            {activeTab === 'users' && isAdmin && (
              <UsersTab users={users} setUsers={setUsers} />
            )}
            {activeTab === 'customers' && isStaff && (
              <UsersTab 
                users={users.filter(user => user.role === USER_ROLES.CUSTOMER)} 
                setUsers={setUsers} 
                staffMode={true} 
              />
            )}
            {activeTab === 'Services' && isAdmin && (
              <ServicesTab users={users} />
            )}
            {activeTab === 'reports' && isAdmin && (
              <ReportsTab />
            )}
            {activeTab === 'settings' && isAdmin && (
              <SettingsTab />
            )}
          </>
        )}
      </div>
    </div>
    </div>
  );
}