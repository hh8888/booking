import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import LocationService from '../../services/LocationService';
import DatabaseService from '../../services/DatabaseService';

const CustomerProfile = ({ customerData }) => {
  const { t } = useLanguage();
  const [locations, setLocations] = useState([]);
  
  // Fetch locations for displaying last_location name
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const locationService = LocationService.getInstance();
        const dbService = DatabaseService.getInstance();
        
        // Initialize LocationService with database service
        await locationService.initializeLocations(dbService);
        
        // Get locations from LocationService
        const data = locationService.getLocations();
        setLocations(data);
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    };
    
    fetchLocations();
  }, []);
  
  // Helper function to get location name by ID
  const getLocationNameById = (locationId) => {
    if (!locationId) return t('common.notProvided');
    const location = locations.find(loc => loc.id === locationId);
    return location ? location.name : t('common.notProvided');
  };
  
  // Add defensive check
  if (!customerData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('profile.personalInfo')}</h2>
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-500">{t('profile.fullName')}</label>
          <p className="text-gray-900">{customerData.full_name || t('common.notProvided')}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">{t('profile.email')}</label>
          <p className="text-gray-900">{customerData.email || t('common.notProvided')}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">{t('profile.phone')}</label>
          <p className="text-gray-900">{customerData.phone_number || t('common.notProvided')}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">{t('profile.postCode')}</label>
          <p className="text-gray-900">{customerData.post_code || t('common.notProvided')}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">{t('common.location')}</label>
          <p className="text-gray-900">{getLocationNameById(customerData.last_location)}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">{t('profile.memberSince')}</label>
          <p className="text-gray-900">
            {customerData.created_at ? 
              new Date(customerData.created_at).toLocaleDateString() : 
              t('common.unknown')
            }
          </p>
        </div>
      </div>
      
      {/* <button className="mt-6 w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition duration-200">
        Edit Profile
      </button> */}
    </div>
  );
};

export default CustomerProfile;