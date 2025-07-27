import React, { useState, useEffect } from 'react';
import Table from '../table/Table';
import GenericForm from '../common/GenericForm';
import FilterBox from '../common/FilterBox';
import DatabaseService from '../../services/DatabaseService';
import UserService from '../../services/UserService';
import StaffAvailabilityService from '../../services/StaffAvailabilityService';
import withErrorHandling from '../common/withErrorHandling';
import { showToast } from '../common/ToastMessage';
import ToastMessage from '../common/ToastMessage';
import StaffDateAvailabilityForm from './StaffDateAvailabilityForm';
import { USER_ROLES, TABLES } from '../../constants';
import { useLanguage } from '../../contexts/LanguageContext';
import { getAvailableRoleOptions, canUpdateToRole } from '../../utils/userUtils';
// Change this line:
// import { useDashboardUser } from '../../hooks/useDashboardUser';
// To:
import useDashboardUser from '../../hooks/useDashboardUser';

function UsersTab({ users, setUsers, handleError, selectedLocation, staffMode = false }) {
  const { t } = useLanguage();
  const { userRole } = useDashboardUser();
  const [selectedRows, setSelectedRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState(null);

  useEffect(() => {
    if (!users || users.length === 0) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [users]);

  const fetchUsers = async () => {
    try {
      const userService = UserService.getInstance();
      const data = await userService.fetchUsers();
      setUsers(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (itemData) => {
    try {
      const dbService = DatabaseService.getInstance();
      if(itemData.birthday===''){
        delete itemData.birthday;
      }
      // Convert empty string location to null
      if (itemData.location === '') {
        itemData.location = null;
      }
      
      // Remove created_at field to prevent the warning
      const { created_at, ...updateData } = itemData;
      
      // For staff mode, restrict role to customer only
      if (staffMode && updateData.role !== 'customer') {
        updateData.role = 'customer';
      }
      
      if (isCreating) {
        const newUser = await dbService.createItem(TABLES.USERS, updateData, 'User');
        setUsers([newUser, ...users]);
        setIsCreating(false);
        showToast.success('User created successfully');
      } else {
        // updateItem doesn't return data, so we need to update local state manually
        await dbService.updateItem(TABLES.USERS, updateData, 'User');
        
        // Update the local state with the updated data
        setUsers(users.map((item) => 
          item.id === updateData.id ? { ...item, ...updateData, created_at: item.created_at } : item
        ));
        
        // Close the form
        setEditItem(null);
        showToast.success('User updated successfully');
      }
    } catch (error) {
      console.error('Error in handleSave:', error);
      handleError('saving', () => Promise.reject(error));
    }
  };

  const handleDeleteSelected = async () => {
    try {
      const dbService = DatabaseService.getInstance();
      await dbService.deleteItems(TABLES.USERS, selectedRows, 'User');
      setUsers(users.filter((item) => !selectedRows.includes(item.id)));
    } catch (error) {
      handleError('deleting', () => Promise.reject(error));
    }
  };

  const handleResetPassword = async (user) => {
    if (!window.confirm(`Send password reset email to ${user.full_name || user.email}?`)) {
      return;
    }

    try {
      const userService = UserService.getInstance();
      await userService.resetUserPassword(user);
      
      showToast.success('Password reset email sent successfully');
      alert(`Password reset email has been sent to ${user.email}.\n\nThe user will receive an email with instructions to reset their password.`);
    } catch (error) {
      console.error('Password reset error:', error);
      showToast.error(`Failed to send reset email: ${error.message}`);
    }
  };

  if (loading) return <div>{t('common.loading')}</div>;
  if (error) return <div>Error: {error}</div>;

  const filteredUsers = users
    .filter(user => {
      if (roleFilter === 'all') return true;
      if (roleFilter === 'staff_admin') return user.role === USER_ROLES.STAFF || user.role === USER_ROLES.ADMIN;
      return user.role === roleFilter;
    })
    .filter(user => {
      const searchTerm = searchFilter.toLowerCase();
      return searchTerm === '' ||
        user.full_name?.toLowerCase().includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm);
    });

// Update the getAvailableRoleOptions function to use translations
const getAvailableRoleOptions = (currentUserRole) => {
  const baseOptions = [
    { value: USER_ROLES.CUSTOMER, label: t('formLabels.customer') }
  ];
  
  if (currentUserRole === USER_ROLES.ADMIN) {
    return [
      ...baseOptions,
      { value: USER_ROLES.STAFF, label: t('formLabels.staff') },
      { value: USER_ROLES.MANAGER, label: t('formLabels.manager') },
      { value: USER_ROLES.ADMIN, label: t('formLabels.admin') }
    ];
  } else if (currentUserRole === USER_ROLES.MANAGER) {
    return [
      ...baseOptions,
      { value: USER_ROLES.STAFF, label: t('formLabels.staff') }
    ];
  }
  
  return baseOptions;
};
  return (
    <div>
      <ToastMessage />
      

      <h2 className="text-xl font-semibold text-gray-800 mb-4">{t('users.manageUsers')}</h2>
      
      {/* Only show Add New User and Delete Selected buttons for non-staff users */}
      {!staffMode && (
        <>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 my-4"
          >
            {t('users.addNewUser')}
          </button>

          <button
            onClick={async () => {
              console.log('Refreshing users data...');
              await fetchUsers();
              console.log('Users data refreshed successfully');
            }}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 my-4 ml-2"
          >
            {t('common.refresh')}
          </button>

          <button
            onClick={handleDeleteSelected}
            className={`${selectedRows.length === 0 ? 'bg-gray-400 hover:bg-gray-500' : 'bg-red-500 hover:bg-red-600'} text-white px-4 py-2 rounded-lg my-4 ml-2`}
            disabled={selectedRows.length === 0}
          >
            {t('users.deleteSelected')}
          </button>
        </>
      )}

      {/* Show Add New Customer button and refresh button for staff users */}
      {staffMode && (
        <>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 my-4"
          >
            {t('users.addNewCustomer')}
          </button>
          
          <button
            onClick={async () => {
              console.log('Refreshing users data...');
              await fetchUsers();
              console.log('Users data refreshed successfully');
            }}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 my-4 ml-2"
          >
            {t('common.refresh')}
          </button>
        </>
      )}
      {/* Role filter dropdown - Add this section */}
      <div className="my-4">
        <label className="mr-2 font-medium">{t('users.filterByRole')}</label>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">{t('users.allUsers')}</option>
          <option value={USER_ROLES.ADMIN}>{t('users.admin')}</option>
          <option value={USER_ROLES.MANAGER}>{t('users.manager')}</option>
          <option value={USER_ROLES.STAFF}>{t('users.staff')}</option>
          <option value={USER_ROLES.CUSTOMER}>{t('users.customer')}</option>
        </select>
      </div>

      <Table
        data={filteredUsers}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        onEdit={!staffMode ? setEditItem : null}
        onSetAvailability={(staff) => setSelectedStaffId(staff.id)}
        onResetPassword={!staffMode ? handleResetPassword : null}
        staffMode={staffMode}
        columns={[
          { key: 'full_name', label: t('formLabels.fullName') },
          { key: 'email', label: t('formLabels.email') },
          { 
            key: 'email_verified', 
            label: t('formLabels.emailVerified'),
            render: (value, row) => {
              // console.log('Email verified render - value:', value, 'type:', typeof value, 'row:', row.full_name);
              return (
                <div className="flex items-center justify-center">
                  {value === true ? (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      ✅ Verified
                    </span>
                  ) : value === false ? (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                      ❌ Unverified
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                      ? Unknown ({String(value)})
                    </span>
                  )}
                </div>
              );
            }
          },
          { key: 'phone_number', label: t('formLabels.phoneNumber') },
          { key: 'gender', label: t('formLabels.gender') },
          { key: 'birthday', label: t('formLabels.birthday') },
          { key: 'post_code', label: t('formLabels.postCode') },
          { key: 'role', label: t('formLabels.role') },
          { key: 'last_sign_in', label: t('formLabels.lastSignIn') },
          { key: 'created_at', label: t('formLabels.createdAt') }
        ]}
      />

      {(editItem || isCreating) && (
        <GenericForm
          title={isCreating ? t('formLabels.createNewUser') : t('formLabels.editUser')}
          data={editItem}
          onSave={handleSave}
          onCancel={() => {
            setEditItem(null);
            setIsCreating(false);
          }}
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
            { key: 'post_code', label: t('formLabels.postCode'), type: 'text' },
            // Conditionally show role field based on staffMode and user permissions
            ...(staffMode ? [
              { key: 'role', label: t('formLabels.role'), type: 'select', options: [
                { value: USER_ROLES.CUSTOMER, label: t('formLabels.customer') }
              ], required: true, defaultValue: USER_ROLES.CUSTOMER, disabled: true }
            ] : [
              { 
                key: 'role', 
                label: t('formLabels.role'), 
                type: 'select', 
                options: getAvailableRoleOptions(userRole), 
                required: true, 
                defaultValue: USER_ROLES.CUSTOMER,
                disabled: userRole === USER_ROLES.STAFF // Staff cannot update roles
              }
            ])
          ]}
        />
      )}

      {selectedStaffId && (
        <StaffDateAvailabilityForm
          staffId={selectedStaffId}
          onClose={() => setSelectedStaffId(null)}
          selectedLocation={selectedLocation}
        />
      )}
    </div>
  );
}

export default withErrorHandling(UsersTab, 'User');