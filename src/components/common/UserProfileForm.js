import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import UserService from '../../services/UserService';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../constants';

const UserProfileForm = ({ userId, onClose }) => {
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

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const data = await userService.getUserProfile(userId);
      
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
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">My Profile</h2>
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
            Full Name {isEditing && '*'}
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
              {userData.full_name || 'Not set'}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
            {userData.email || 'Not set'}
          </div>
          {!isEditing && (
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
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
              {userData.phone_number || 'Not set'}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Birthday
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
            Post Code
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
              {userData.post_code || 'Not set'}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gender
          </label>
          {isEditing ? (
            <select
              value={userData.gender}
              onChange={(e) => handleInputChange('gender', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          ) : (
            <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
              {userData.gender || 'Not set'}
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
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors duration-200"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleEdit}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200"
              >
                Edit Profile
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileForm;