import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import Table from './Table';
import FilterBox from './FilterBox';
import EditPopup from './EditPopup';

export default function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedRows, setSelectedRows] = useState([]); // Ensure this is an array
  const [editUser, setEditUser] = useState(null);

  // Fetch users from the database
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
      } else {
        setUsers(data);
      }
      setLoading(false);
    };

    fetchUsers();
  }, []);

  // Handle filtering
  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(filter.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(filter.toLowerCase()) ||
    user.phone_number?.toLowerCase().includes(filter.toLowerCase())
  );

  // Handle sorting
  const handleSort = (key, direction) => {
    const sortedUsers = [...filteredUsers].sort((a, b) => {
      const valueA = a[key] || ''; // Treat empty values as empty strings
      const valueB = b[key] || '';
  
      if (valueA < valueB) return direction === 'asc' ? -1 : 1;
      if (valueA > valueB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setUsers(sortedUsers);
  };

  // Handle delete selected users
  const handleDeleteSelected = async () => {
    console.log('Selected Rows:', selectedRows); // Debugging
  
    if (!Array.isArray(selectedRows)) {
      console.error('selectedRows is not an array:', selectedRows);
      return;
    }
  
    if (selectedRows.length === 0) {
      alert('No users selected for deletion.');
      return;
    }
  
    // Ensure selectedRows contains valid UUIDs
    const validUUIDs = selectedRows.filter((id) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)
    );
  
    if (validUUIDs.length === 0) {
      alert('No valid users selected for deletion.');
      return;
    }
  
    const { error } = await supabase
      .from('users')
      .delete()
      .in('id', validUUIDs); // Use validUUIDs instead of selectedRows
  
    if (error) {
      console.error('Error deleting users:', error);
      alert('Failed to delete users. Please try again.');
    } else {
      // Remove deleted users from the local state
      setUsers(users.filter((user) => !validUUIDs.includes(user.id)));
      setSelectedRows([]); // Clear the selection
      alert('Selected users deleted successfully.');
    }
  };

  // Handle save edited user
  const handleSaveEdit = async (editedUser) => {
    const { error } = await supabase
      .from('users')
      .update(editedUser)
      .eq('id', editedUser.id);

    if (error) {
      console.error('Error updating user:', error);
    } else {
      setUsers(users.map((user) => (user.id === editedUser.id ? editedUser : user)));
      setEditUser(null);
    }
  };

  if (loading) {
    return <p>Loading users...</p>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Manage Users</h2>

      {/* Filter Box */}
      <FilterBox
        filter={filter}
        setFilter={setFilter}
        placeholder="Filter by email, name, or phone"
      />

      {/* Delete Selected Button */}
      {selectedRows.length > 0 && (
        <button
          onClick={handleDeleteSelected}
          className="mb-4 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition duration-200"
        >
          Delete Selected
        </button>
      )}

      {/* Users Table */}
      <Table
        columns={[
          { key: 'email', label: 'Email' },
          { key: 'full_name', label: 'Full Name' },
          { key: 'phone_number', label: 'Phone Number' },
          { key: 'post_code', label: 'Post Code' },
          { key: 'birthday', label: 'Birthday' },
          { key: 'gender', label: 'Gender' },
          { key: 'role', label: 'Role' },
          { key: 'created_at', label: 'Created At' },
          { key: 'last_sign_in', label: 'Last Sign In' },
        ]}
        data={filteredUsers}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows} // Pass setSelectedRows as a prop
        onSort={handleSort}
        onEdit={setEditUser}
      />

      {/* Edit User Popup */}
      {editUser && (
        <EditPopup
          data={editUser}
          onSave={handleSaveEdit}
          onCancel={() => setEditUser(null)}
          // Inside EditPopup.js
          fields={[
            { key: 'email', label: 'Email' },
            { key: 'full_name', label: 'Full Name' },
            { key: 'phone_number', label: 'Phone Number' },
            { key: 'post_code', label: 'Post Code' }, // Add post_code field
            { key: 'birthday', label: 'Birthday' },
            { key: 'gender', label: 'Gender' },
            { key: 'role', label: 'Role' },
          ]}
        />
      )}
    </div>
  );
}