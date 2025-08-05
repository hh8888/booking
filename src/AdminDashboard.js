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

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // Add refs for location management
  const initializationRef = useRef(false);
  const locationRestorationRef = useRef(false);
  
  // Use custom hooks for shared logic
  const { businessName } = useBusinessInfo();
  const { userEmail, userRole, userName, currentUserId, lastLocation, loading: userLoading, error: userError } = useDashboardUser();
  const { users, setUsers, loading: usersLoading, networkError, retryFetch, error: usersError } = useUsersData();

  // Add debugging logs
  useEffect(() => {
    console.log('=== AdminDashboard Debug Info ===');
    console.log('userLoading:', userLoading);
    console.log('usersLoading:', usersLoading);
    console.log('userError:', userError);
    console.log('usersError:', usersError);
    console.log('networkError:', networkError);
    console.log('currentUserId:', currentUserId);
    console.log('userRole:', userRole);
    console.log('users count:', users?.length);
    console.log('=== End Debug Info ===');
  }, [userLoading, usersLoading, userError, usersError, networkError, currentUserId, userRole, users]);

  // Use the location manager hook
  useLocationManager({
    userId: currentUserId,
    lastLocation,
    userLoading,
    userType: 'admin'
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

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Sticky Header Section */}
      <div className="sticky top-0 z-50 bg-gray-100 border-b border-gray-200 shadow-sm">
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">{businessName}</h1>
              <LocationSelector />
            </div>
            <div className="flex items-center space-x-3">
              <SessionIndicator />
              <UserDropdown 
                userEmail={userEmail}
                userRole={userRole}
                userName={userName}
                currentUserId={currentUserId}
              />
            </div>
          </div>
        
          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 px-3 md:px-4 text-sm md:text-base whitespace-nowrap flex-shrink-0 ${activeTab === 'dashboard' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t('nav.dashboard')}
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`py-2 px-3 md:px-4 text-sm md:text-base whitespace-nowrap flex-shrink-0 ${activeTab === 'bookings' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t('nav.bookings')}
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-3 md:px-4 text-sm md:text-base whitespace-nowrap flex-shrink-0 ${activeTab === 'users' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t('nav.users')}
            </button>
            <button
              onClick={() => setActiveTab('Services')}
              className={`py-2 px-3 md:px-4 text-sm md:text-base whitespace-nowrap flex-shrink-0 ${activeTab === 'Services' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t('nav.services')}
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-2 px-3 md:px-4 text-sm md:text-base whitespace-nowrap flex-shrink-0 ${activeTab === 'reports' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t('nav.reports')}
            </button>
            {/* Settings tab only visible to Admin */}
            {userRole === USER_ROLES.ADMIN && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-3 md:px-4 text-sm md:text-base whitespace-nowrap flex-shrink-0 ${activeTab === 'settings' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
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
        {/* Update the loading condition to check both loading states */}
        {userLoading ? (
          <div>
            <LoadingSpinner text={t('common.loading')} />
            <div className="text-center mt-4 text-sm text-gray-500">Loading user information...</div>
          </div>
        ) : usersLoading ? (
          <div>
            <LoadingSpinner text={t('users.loadingUsers')} />
            <div className="text-center mt-4 text-sm text-gray-500">Loading users data...</div>
          </div>
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
        ) : usersError ? (
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
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'bookings' && <BookingsTab users={users} />}
            {activeTab === 'users' && <UsersTab users={users} setUsers={setUsers} />}
            {activeTab === 'Services' && <ServicesTab users={users} />}
            {activeTab === 'reports' && <ReportsTab />}
            {activeTab === 'settings' && userRole === USER_ROLES.ADMIN && <SettingsTab />}
          </>
        )}
      </div>
    </div>
    </div>
  );
}
