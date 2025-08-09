import React, { useState } from 'react';
import { toast } from 'react-toastify';
import GenericForm from './GenericForm';
import DatabaseService from '../../services/DatabaseService';
import { USER_ROLES, TABLES } from '../../constants';
import { useLanguage } from '../../contexts/LanguageContext';

const CreateUserPopup = ({ onClose, onUserCreated }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const handleSave = async (userData) => {
    setLoading(true);
    try {
      const databaseService = DatabaseService.getInstance();
      
      // Create user with default role as customer
      const newUserData = {
        ...userData,
        role: USER_ROLES.CUSTOMER,
        email_verified: false
      };
      
      // Remove empty birthday field
      if (newUserData.birthday === '') {
        delete newUserData.birthday;
      }
      
      const result = await databaseService.createItem(TABLES.USERS, newUserData, 'User');
      
      toast.success(t('users.addNewUser') + ' successfully created');
      
      // Call the callback with the new user data
      if (onUserCreated) {
        onUserCreated(result);
      }
      
      // Close the popup
      onClose();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <GenericForm
          title={t('users.addNewUser')}
          onSave={handleSave}
          onCancel={onClose}
          loading={loading}
          fields={[
            { key: 'full_name', label: t('formLabels.fullName'), type: 'text', required: true },
            { key: 'email', label: t('formLabels.email'), type: 'email', required: true },
            { key: 'phone_number', label: t('formLabels.phoneNumber'), type: 'text' },
            { key: 'gender', label: t('formLabels.gender'), type: 'select', options: [
              { value: 'male', label: t('formLabels.male') }, 
              { value: 'female', label: t('formLabels.female') }, 
              { value: 'other', label: t('formLabels.other') }
            ] },
            { key: 'birthday', label: t('formLabels.birthday'), type: 'date' },
            { key: 'post_code', label: t('formLabels.postCode'), type: 'text' }
          ]}
        />
      </div>
    </div>
  );
};

export default CreateUserPopup;