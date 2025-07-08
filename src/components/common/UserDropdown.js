import React, { useState, useRef, useEffect } from 'react';
import { UserCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../supabaseClient';
import StaffDateAvailabilityForm from '../service/StaffDateAvailabilityForm';
import UserProfileForm from './UserProfileForm';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguage } from '../../contexts/LanguageContext';
import { USER_ROLES, ERROR_MESSAGES } from '../../constants';

const UserDropdown = ({ userEmail, userRole, userName, currentUserId, onProfileUpdate }) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [showAvailabilityForm, setShowAvailabilityForm] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      console.log('Attempting to sign out...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        alert(`${t('messages.error.signOutError')}: ${error.message}`);
      } else {
        console.log('Sign out successful, reloading page...');
        // Clear any local storage if needed
        localStorage.clear();
        sessionStorage.clear();
        
        // Redirect to login page instead of just reloading
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Unexpected error during sign out:', err);
      alert(t('messages.error.unexpectedSignOutError'));
    }
  };

  const handleSetAvailability = () => {
    setShowAvailabilityForm(true);
    setIsOpen(false);
  };

  const handleUpdateProfile = () => {
    setShowProfileForm(true);
    setIsOpen(false);
  };

  const handleProfileClose = () => {
    setShowProfileForm(false);
    // Call the callback to refresh customer data if provided
    if (onProfileUpdate) {
      onProfileUpdate();
    }
  };

  const displayName = userName || userEmail?.split('@')[0] || 'User';

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg p-2 transition-colors duration-200"
        >
          <UserCircleIcon className="h-8 w-8 text-gray-600" />
          <div className="text-left">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-gray-500 capitalize">({t(`roles.${userRole}`) || userRole})</p>
          </div>
          <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
            <div className="py-1">
              {(userRole === USER_ROLES.STAFF || userRole === USER_ROLES.ADMIN) && (
                <button
                  onClick={handleSetAvailability}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
                >
                  <svg className="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('userDropdown.setAvailability')}
                </button>
              )}
              <button
                onClick={handleUpdateProfile}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
              >
                <svg className="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {t('userDropdown.myProfile')}
              </button>
              
              {/* Language Switcher */}
              <LanguageSwitcher isInDropdown={true} />
              
              <hr className="my-1" />
              <button
                onClick={handleSignOut}
                className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 hover:text-red-900 transition-colors duration-200"
              >
                <svg className="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {t('userDropdown.logout')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Availability Form Modal */}
      {showAvailabilityForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <StaffDateAvailabilityForm
              staffId={currentUserId}
              onClose={() => setShowAvailabilityForm(false)}
            />
          </div>
        </div>
      )}

      {/* Profile Form Modal */}
      {showProfileForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <UserProfileForm
              userId={currentUserId}
              onClose={handleProfileClose}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default UserDropdown;