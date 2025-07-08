import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const CustomerProfile = ({ customerData }) => {
  const { t } = useLanguage();
  
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