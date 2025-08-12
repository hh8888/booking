import React, { useState } from 'react';
import { toast } from 'react-toastify';
import GenericForm from './GenericForm';
import UserService from '../../services/UserService';
import { USER_ROLES } from '../../constants';
import { useLanguage } from '../../contexts/LanguageContext';
import { isFakeEmail } from '../../utils/validationUtils';

const CreateUserPopup = ({ onClose, onUserCreated }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  const handleSave = async (userData) => {
    // Clear previous validation message
    setValidationMessage('');

    // Custom validation: require either email or phone number
    if (!userData.email && !userData.phone_number) {
      setValidationMessage('Either email or phone number is required');
      return;
    }

    // If no email is provided, generate a placeholder email for Supabase auth
    if (!userData.email && userData.phone_number) {
      // Generate a unique email using phone number as base
      userData.email = `${userData.phone_number.replace(/[^\d]/g, '')}@temp.local`;
    }

    setLoading(true);
    try {
      const userService = UserService.getInstance();
      
      // Create user with default role as customer and generate a temporary password
      const newUserData = {
        ...userData,
        role: USER_ROLES.CUSTOMER,
        password: await userService.generateTemporaryPassword() // Generate temporary password
      };
      
      // Remove empty birthday field
      if (newUserData.birthday === '') {
        delete newUserData.birthday;
      }
      
      // Use UserService.createUser() which properly handles auth and sends verification email
      const result = await userService.createUser(newUserData);
      
      // Check if email is fake and show appropriate message
      if (isFakeEmail(newUserData.email)) {
        // Don't show verification email message for fake emails
        console.log('User created with fake email address - no verification email sent');
      } else {
        // Show verification email message for real emails
        toast.info(t('messages.success.verificationEmailSent') || 'Verification email sent to user');
      }
      
      // Call the callback with the new user data
      if (onUserCreated) {
        onUserCreated(result);
      }

      // Close the popup
      onClose();
    } catch (error) {
      console.error('Error creating user:', error);
      setValidationMessage('Failed to create user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <GenericForm
          title={t('users.addNewUser')}
          onSave={handleSave}
          onCancel={onClose}
          loading={loading}
          validationMessage={validationMessage}
          setValidationMessage={setValidationMessage}
          fields={[
            { key: 'full_name', label: t('formLabels.fullName'), type: 'text', required: true },
            { key: 'phone_number', label: t('formLabels.phoneNumber'), type: 'text', required: false },
            { key: 'email', label: t('formLabels.email'), type: 'email', required: false },
            { key: 'gender', label: t('formLabels.gender'), type: 'select', options: [
              { value: 'male', label: t('formLabels.male') }, 
              { value: 'female', label: t('formLabels.female') }, 
              { value: 'other', label: t('formLabels.other') }
            ] },
            { key: 'birthday', label: t('formLabels.birthday'), type: 'date' },
            { key: 'post_code', label: t('formLabels.postCode'), type: 'text' }
          ]}
        />
        <div className="mt-2 text-sm text-gray-600">
          * Either email or phone number is required
        </div>
      </div>
      </div>
    </>
  );
};

export default CreateUserPopup;