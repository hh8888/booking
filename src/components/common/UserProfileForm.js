import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import UserService from '../../services/UserService';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../constants';
import { useLanguage } from '../../contexts/LanguageContext';

const UserProfileForm = ({ userId, onClose }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    birthday: '',
    post_code: '',
    gender: ''
  });

  const userService = UserService.getInstance();

  // Add debugging
  useEffect(() => {
    console.log('UserProfileForm - userId received:', userId);
    if (userId) {
      fetchUserData();
    } else {
      console.error('UserProfileForm - No userId provided');
    }
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      console.log('Fetching user data for userId:', userId);
      const data = await userService.getUserProfile(userId);
      console.log('Received user data:', data);
      
      setUserData({
        full_name: data.full_name || '',
        email: data.email || '',
        phone_number: data.phone_number || '',
        birthday: data.birthday || '',
        post_code: data.post_code || '',
        gender: data.gender || ''
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error(ERROR_MESSAGES.FAILED_LOAD_PROFILE);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      console.log('Saving profile for userId:', userId);
      
      // Prepare the update data, converting empty strings to null for date fields
      const updateData = {
        full_name: userData.full_name,
        phone_number: userData.phone_number,
        birthday: userData.birthday || null, // Convert empty string to null
        post_code: userData.post_code,
        gender: userData.gender
      };
      
      console.log('Update data:', updateData);
      
      const result = await userService.updateUserProfile(userId, updateData);
      console.log('Update result:', result);

      toast.success(SUCCESS_MESSAGES.PROFILE_UPDATED);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(ERROR_MESSAGES.FAILED_UPDATE_PROFILE);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setUserData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    fetchUserData(); // Reset to original data
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('profile.notSet');
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">{t('profile.title')}</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('profile.fullName')} {isEditing && '*'}
          </label>
          {isEditing ? (
            <input
              type="text"
              value={userData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          ) : (
            <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
              {userData.full_name || t('profile.notSet')}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('profile.email')}
          </label>
          <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
            {userData.email || t('profile.notSet')}
          </div>
          {!isEditing && (
            <p className="text-xs text-gray-500 mt-1">{t('profile.emailCannotChange')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('profile.phone')}
          </label>
          {isEditing ? (
            <input
              type="tel"
              value={userData.phone_number}
              onChange={(e) => handleInputChange('phone_number', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          ) : (
            <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
              {userData.phone_number || t('profile.notSet')}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('profile.birthday')}
          </label>
          {isEditing ? (
            <input
              type="date"
              value={userData.birthday}
              onChange={(e) => handleInputChange('birthday', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          ) : (
            <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
              {formatDate(userData.birthday)}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('profile.postCode')}
          </label>
          {isEditing ? (
            <input
              type="text"
              value={userData.post_code}
              onChange={(e) => handleInputChange('post_code', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          ) : (
            <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
              {userData.post_code || t('profile.notSet')}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('profile.gender')}
          </label>
          {isEditing ? (
            <select
              value={userData.gender}
              onChange={(e) => handleInputChange('gender', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('profile.selectGender')}</option>
              <option value="Male">{t('profile.male')}</option>
              <option value="Female">{t('profile.female')}</option>
              <option value="Other">{t('profile.other')}</option>
            </select>
          ) : (
            <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
              {userData.gender || t('profile.notSet')}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors duration-200"
                disabled={loading}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? t('profile.saving') : t('profile.saveChanges')}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors duration-200"
              >
                {t('common.close')}
              </button>
              <button
                type="button"
                onClick={handleEdit}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200"
              >
                {t('profile.editProfile')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileForm;