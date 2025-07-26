import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
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
import useDashboardUser from './hooks/useDashboardUser'; // Changed from named to default import
import { useUsersData } from './hooks/useUsersData';
import { useLanguage } from './contexts/LanguageContext';
import { USER_ROLES } from './constants';

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // Use custom hooks for shared logic
  const { businessName } = useBusinessInfo();
  const { userEmail, userRole, userName, currentUserId } = useDashboardUser(); // Now using default import
  const { users, setUsers, loading, networkError, retryFetch } = useUsersData();
  




  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert(error.message);
    else window.location.reload(); // Reload the page to return to the sign-in screen
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6 flex flex-col">
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
      <div className="flex flex-wrap gap-2 border-b border-gray-200 mb-4 md:mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-2 px-3 md:px-4 text-sm md:text-base whitespace-nowrap ${activeTab === 'dashboard' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {t('nav.dashboard')}
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`py-2 px-3 md:px-4 text-sm md:text-base whitespace-nowrap ${activeTab === 'bookings' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {t('nav.bookings')}
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`py-2 px-3 md:px-4 text-sm md:text-base whitespace-nowrap ${activeTab === 'users' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {t('nav.users')}
        </button>
        <button
          onClick={() => setActiveTab('Services')}
          className={`py-2 px-3 md:px-4 text-sm md:text-base whitespace-nowrap ${activeTab === 'Services' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {t('nav.services')}
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`py-2 px-3 md:px-4 text-sm md:text-base whitespace-nowrap ${activeTab === 'reports' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {t('nav.reports')}
        </button>
        {/* Settings tab only visible to Admin */}
        {userRole === USER_ROLES.ADMIN && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-3 md:px-4 text-sm md:text-base whitespace-nowrap ${activeTab === 'settings' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t('nav.settings')}
          </button>
        )}
      </div>
    
      {/* Tab Content */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md flex-grow mb-16">
        {loading ? (
          <LoadingSpinner text={t('users.loadingUsers')} />
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
  );
}
