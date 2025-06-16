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

function UsersTab({ users, setUsers, handleError, selectedLocation }) {
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
      const dbService = DatabaseService.getInstance();
      const data = await dbService.fetchData('users', 'created_at', false);
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
      } else if (itemData.location) {
        // Ensure location is an integer if a value is present
        itemData.location = parseInt(itemData.location, 10);
      }
      if (isCreating) {
        const newUser = await dbService.createItem('users', itemData, 'User');
        setUsers([newUser, ...users]);
        setIsCreating(false);
        showToast.success('User created successfully');
      } else {
        await dbService.updateItem('users', itemData, 'User');
        setUsers(users.map((item) => 
          item.id === itemData.id ? { ...item, ...itemData } : item
        ));
        setEditItem(null);
        showToast.success('User updated successfully');
      }
    } catch (error) {
      handleError('saving', () => Promise.reject(error));
    }
  };

  const handleDeleteSelected = async () => {
    try {
      const dbService = DatabaseService.getInstance();
      await dbService.deleteItems('users', selectedRows, 'User');
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

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const filteredUsers = users
    .filter(user => {
      if (roleFilter === 'all') return true;
      if (roleFilter === 'staff_admin') return user.role === 'staff' || user.role === 'admin';
      return user.role === roleFilter;
    })
    .filter(user => {
      const searchTerm = searchFilter.toLowerCase();
      return searchTerm === '' ||
        user.full_name?.toLowerCase().includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm);
    });

  return (
    <div>
      <ToastMessage />
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Users Management</h2>
      
      {/* Role filter */}
      <div className="flex gap-4 items-center mb-4">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg focus:outline-none focus:border-blue-500 w-40 h-10"
        >
          <option value="all">All Roles</option>
          <option value="customer">Customer</option>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
          <option value="staff_admin">Staff & Admin</option>
        </select>

        <FilterBox
          filter={searchFilter}
          setFilter={setSearchFilter}
          placeholder="Search by name or email..."
          className="flex-1 h-10"
        />
      </div>

      <button
        onClick={() => {
          setEditItem(null);
          setIsCreating(true);
        }}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 my-4"
      >
        Add New User
      </button>

      <button
        onClick={async () => {
          console.log('Refreshing users data...');
          await fetchUsers();
          console.log('Users data refreshed successfully');
        }}
        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 my-4 ml-2"
      >
        Refresh
      </button>

      <button
        onClick={handleDeleteSelected}
        className={`${selectedRows.length === 0 ? 'bg-gray-400 hover:bg-gray-500' : 'bg-red-500 hover:bg-red-600'} text-white px-4 py-2 rounded-lg my-4 ml-2`}
        disabled={selectedRows.length === 0}
      >
        Delete Selected
      </button>

      <Table
        data={filteredUsers}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        onEdit={setEditItem}
        onSetAvailability={(staff) => setSelectedStaffId(staff.id)}
        onResetPassword={handleResetPassword}
        columns={[
          { key: 'full_name', label: 'Full Name' },
          { key: 'email', label: 'Email' },
          { key: 'phone_number', label: 'Phone Number' },
          { key: 'gender', label: 'Gender' },
          { key: 'birthday', label: 'Birthday' },
          { key: 'post_code', label: 'Post Code' },
          { key: 'role', label: 'Role' },
          { key: 'last_sign_in', label: 'Last Sign In' },
          { key: 'created_at', label: 'Created At' }
        ]}
      />

      {(editItem || isCreating) && (
        <GenericForm
          data={editItem}
          onSave={handleSave}
          onCancel={() => {
            setEditItem(null);
            setIsCreating(false);
          }}
          fields={[
            { key: 'full_name', label: 'Full Name', type: 'text', required: true },
            { key: 'email', label: 'Email', type: 'email', required: true },
            { key: 'phone_number', label: 'Phone Number', type: 'text' },
            { key: 'gender', label: 'Gender', type: 'select', options: [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }] },
            { key: 'birthday', label: 'Birthday', type: 'date' },
            { key: 'post_code', label: 'Post Code', type: 'text' },
            { key: 'role', label: 'Role', type: 'select', options: [
              { value: 'customer', label: 'Customer' },
              { value: 'staff', label: 'Staff' },
              { value: 'admin', label: 'Admin' },
            ], required: true, defaultValue: 'customer' },
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