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
// Remove this import
// import ToastMessage from './components/common/ToastMessage';
import { useBusinessInfo } from './hooks/useBusinessInfo';
import useDashboardUser from './hooks/useDashboardUser';
// Remove this import completely
// import useLocationManager from './hooks/useLocationManager';
import { useUsersData } from './hooks/useUsersData';
import { useLanguage } from './contexts/LanguageContext';
import { USER_ROLES, TABLES } from './constants';
import { toast } from 'react-toastify';

export default function Dashboard() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isScrolled, setIsScrolled] = useState(false); // Restore this line
  const [isHeaderMinimized, setIsHeaderMinimized] = useState(false); // Add header minimization state
  
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
  const isManager = userRole === USER_ROLES.MANAGER;
  const isStaff = userRole === USER_ROLES.STAFF;
  
  // Conditional users data filtering for staff
  const usersDataConfig = isStaff ? { roleFilter: ['customer', 'staff'] } : {};
  const { users, setUsers, loading: usersLoading, networkError, retryFetch, error: usersError } = useUsersData(usersDataConfig);

  // Toggle header minimization
  const toggleHeaderMinimization = () => {
    setIsHeaderMinimized(!isHeaderMinimized);
  };

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
        
        // Use fixed thresholds instead of percentage-based
        const upperThreshold = 50; // Scroll down threshold
        const lowerThreshold = 30; // Scroll up threshold
        
        const shouldBeScrolled = isScrolled 
          ? scrollTop > lowerThreshold  // If already scrolled, use lower threshold
          : scrollTop > upperThreshold; // If not scrolled, use upper threshold
        
        if (shouldBeScrolled !== isScrolled) {
          isUpdating = true;
          setIsScrolled(shouldBeScrolled);
          
          // Reset the updating flag after a short delay
          setTimeout(() => {
            isUpdating = false;
          }, 150); // Increased delay to prevent rapid updates
        }
      }, 16); // Increased debounce to ~60fps
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []); // Remove isScrolled dependency to prevent re-registration

  // Add debugging logs for admin and manager
  useEffect(() => {
    if (isAdmin || isManager) {
      // console.log('=== Dashboard Debug Info ===');
      // console.log('userLoading:', userLoading);
      // console.log('usersLoading:', usersLoading);
      // console.log('userError:', userError);
      // console.log('usersError:', usersError);
      // console.log('networkError:', networkError);
      // console.log('currentUserId:', currentUserId);
      // console.log('userRole:', userRole);
      // console.log('users count:', users?.length);
      // console.log('=== End Debug Info ===');
    }
  }, [userLoading, usersLoading, userError, usersError, networkError, currentUserId, userRole, users, isAdmin, isManager]);

  // Remove the useLocationManager call (around lines 114-120)
  // useLocationManager({
  //   userId: currentUserId,
  //   lastLocation,
  //   userLoading,
  //   userType: userRole === USER_ROLES.ADMIN ? 'admin' : 'staff'
  // });

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
    users: isAdmin || isManager,
    customers: isStaff,
    services: isAdmin || isManager,
    reports: isAdmin || isManager,
    settings: isAdmin // Only admin can access settings, not manager
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Sticky Header Section - Remove all scroll-based styling */}
      <div className="sticky top-0 z-50 bg-gray-100 border-b border-gray-200 shadow-sm transition-all duration-300 ease-in-out py-2 md:py-3">
        <div className={`transition-all duration-300 ease-in-out ${
          isHeaderMinimized ? 'px-0' : 'px-2 md:px-3'
        }`}>
          {/* Conditionally render header content based on minimization state */}
          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
            isHeaderMinimized ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
          }`}>
            {!isHeaderMinimized && (
              <>
                {/* Full width title - Remove scroll-based margin */}
                <div className="transition-all duration-300 ease-in-out mb-2 md:mb-3">
                  <h1 className="font-bold text-gray-800 transition-all duration-300 ease-in-out text-lg md:text-xl">{businessName}</h1>
                </div>
                
                {/* Location and menu row - Remove scroll-based margin */}
                <div className="flex justify-between items-center transition-all duration-300 ease-in-out mb-2 md:mb-3">
                  <div className="transition-all duration-300 ease-in-out">
                    <LocationSelector />
                  </div>
                  <div className="flex items-center space-x-2 transition-all duration-300 ease-in-out">
                    <SessionIndicator />
                    <UserDropdown 
                      userEmail={userEmail}
                      userRole={userRole}
                      userName={userName}
                      currentUserId={currentUserId}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        
          {/* Tab Navigation with toggle button on the same row */}
          <div className={`flex justify-between items-center gap-1 border-b border-gray-200 transition-[padding] duration-500 ease-in-out`}>
            {/* Tabs container */}
            <div className="flex gap-1 overflow-x-auto flex-1">
              {availableTabs.dashboard && (
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`whitespace-nowrap flex-shrink-0 text-sm md:text-base transition-[color,padding] duration-300 ease-in-out ${
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
              {availableTabs.bookings && (
                <button
                  onClick={() => setActiveTab('bookings')}
                  className={`whitespace-nowrap flex-shrink-0 text-sm md:text-base transition-[color,padding] duration-300 ease-in-out ${
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
                  className={`whitespace-nowrap flex-shrink-0 text-sm md:text-base transition-[color,padding] duration-300 ease-in-out ${
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
                  className={`whitespace-nowrap flex-shrink-0 text-sm md:text-base transition-[color,padding] duration-300 ease-in-out ${
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
                  onClick={() => setActiveTab('services')}
                  className={`whitespace-nowrap flex-shrink-0 text-sm md:text-base transition-[color,padding] duration-300 ease-in-out ${
                    isScrolled ? 'py-1 px-2 md:px-2' : 'py-1.5 px-2 md:px-3'
                  } ${
                    activeTab === 'services' 
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
                  className={`whitespace-nowrap flex-shrink-0 text-sm md:text-base transition-[color,padding] duration-300 ease-in-out ${
                    isScrolled ? 'py-1 px-2 md:px-2' : 'py-1.5 px-2 md:px-3'
                  } ${
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
                  className={`whitespace-nowrap flex-shrink-0 text-sm md:text-base transition-[color,padding] duration-300 ease-in-out ${
                    isScrolled ? 'py-1 px-2 md:px-2' : 'py-1.5 px-2 md:px-3'
                  } ${
                    activeTab === 'settings' 
                      ? 'text-blue-500 border-b-2 border-blue-500' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('nav.settings')}
                </button>
              )}
            </div>
            
            {/* Toggle button on the same row as tabs */}
            <button
              onClick={toggleHeaderMinimization}
              className={`flex-shrink-0 ml-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm transition-[background-color,border-color,box-shadow,padding] duration-300 ease-in-out ${
                isHeaderMinimized ? 'p-1' : 'p-1.5'
              }`}
              title={isHeaderMinimized ? 'Expand header' : 'Minimize header'}
            >
              <svg 
                className={`text-gray-600 transition-[width,height] duration-300 ease-in-out ${
                  isHeaderMinimized ? 'w-3 h-3' : 'w-4 h-4'
                }`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                {isHeaderMinimized ? (
                  // Expand icon (double arrows pointing outward)
                  <>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7l4-4m0 0l4 4m-4-4v18" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 17l-4 4m0 0l-4-4m4 4V3" />
                  </>
                ) : (
                  // Minimize icon (double arrows pointing inward)
                  <>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17l4 4m0 0l4-4m-4 4V3" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7l-4-4m0 0l-4 4m4-4v18" />
                  </>
                )}
              </svg>
            </button>
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
            {activeTab === 'users' && (isAdmin || isManager) && (
              <UsersTab users={users} setUsers={setUsers} />
            )}
            {activeTab === 'customers' && isStaff && (
              <UsersTab 
                users={users.filter(user => user.role === USER_ROLES.CUSTOMER)} 
                setUsers={setUsers} 
                staffMode={true} 
              />
            )}
            {activeTab === 'services' && (isAdmin || isManager) && (
              <ServicesTab users={users} />
            )}
            {activeTab === 'reports' && (isAdmin || isManager) && (
              <ReportsTab />
            )}
            {activeTab === 'settings' && isAdmin && (
              <SettingsTab />
            )}
          </>
        )}
      </div>
      
      {/* Remove this line */}
      {/* <ToastMessage /> */}
    </div>
    </div>
  );
}