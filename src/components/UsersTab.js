import React, { useState, useEffect } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Table from "./Table";
import GenericForm from "./GenericForm";
import UserService from "../services/UserService";
import withErrorHandling from './withErrorHandling';

function UsersTab({ users: initialUsers, handleError }) {
  const [users, setUsers] = useState(initialUsers || []);
  const [selectedRows, setSelectedRows] = useState([]);
  const [loading, setLoading] = useState(!initialUsers);
  const [error, setError] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const [requiredFields, setRequiredFields] = useState(['email', 'full_name', 'post_code']);

  useEffect(() => {
    if (!initialUsers) {
      fetchUsers();
    }
    // Get required fields settings
    fetchRequiredFields();
  }, [initialUsers]);

  useEffect(() => {
    if (initialUsers) {
      setUsers(initialUsers);
    }
  }, [initialUsers]);

  const fetchRequiredFields = async () => {
    try {
      const userService = UserService.getInstance();
      const requiredUserFields = await userService.fetchRequiredFields();
      setRequiredFields(requiredUserFields);
    } catch (error) {
      console.error('Error fetching required fields:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const userService = UserService.getInstance();
      const data = await userService.fetchUsers();
      setUsers(data);
    } catch (error) {
      const errorMessage = await handleError('fetching', () => Promise.reject(error));
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (itemData) => {
    try {
      const userService = UserService.getInstance();
      
      // Handle empty date fields, convert empty strings to null
      if (itemData.birthday === '') {
        itemData.birthday = null;
      }
      
      if (isCreating) {
        // If creating new user, need to create user in auth table as well
        if (!itemData.password) {
          toast.error('Password is required for new users');
          return;
        }

        // Create new user
        const newUser = await userService.createUser(itemData);
        
        // Update local state
        setUsers([newUser, ...users]);
        setIsCreating(false);
        setEditItem(null);
      } else {
        // Update existing user
        await userService.updateUser(itemData);
        
        // Update local state
        setUsers(users.map((item) => 
          item.id === itemData.id ? { ...item, ...itemData } : item
        ));
        setEditItem(null);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  const handleDeleteSelected = async () => {
    try {
      const userService = UserService.getInstance();
      
      // Delete selected users
      await userService.deleteUsers(selectedRows);
      
      // Update local state
      setUsers(users.filter((item) => !selectedRows.includes(item.id)));
      setSelectedRows([]);
    } catch (error) {
      handleError('deleting', () => Promise.reject(error));
    }
  };
  // Filter users by role
  const filteredUsers = roleFilter === 'all' 
    ? users 
    : users.filter(user => user.role === roleFilter);

  if (loading) {
    return <p>Loading users...</p>;
  }
  if (error) {
    return <div>Error: {error}</div>;
  }
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Manage Users</h2>

      {/* Create New User Button */}
      <button
        onClick={() => {
          setIsCreating(true);
          setEditItem({
            email: "",
            password: "",
            full_name: "",
            phone_number: "",
            post_code: "",
            birthday: "",
            gender: "",
            role: "customer",
          });
        }}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 my-4"
      >
        Create New User
      </button>

      {/* Delete Selected Button */}
      <button
        onClick={handleDeleteSelected}
        className={`${selectedRows.length === 0 ? 'bg-gray-400 hover:bg-gray-500' : 'bg-red-500 hover:bg-red-600'} text-white px-4 py-2 rounded-lg my-4 ml-2`}
        disabled={selectedRows.length === 0}
      >
        Delete Selected
      </button>

      {/* Role filter */}
      <div className="my-4">
        <label className="mr-2 font-medium">Filter by Role:</label>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Users</option>
          <option value="customer">Customer</option>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Users Table */}
      <Table
        columns={[
          { key: "email", label: "Email" },
          { key: "full_name", label: "Full Name" },
          { key: "phone_number", label: "Phone Number" },
          { key: "post_code", label: "Post Code" },
          { key: "birthday", label: "Birthday" },
          { key: "gender", label: "Gender" },
          { key: "role", label: "Role" },
          { key: "created_at", label: "Created At" },
          { key: "last_sign_in", label: "Last Sign In" },
        ]}
        data={filteredUsers}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        onEdit={(user) => {
          setIsCreating(false);
          setEditItem(user);
        }}
      />

      {/* Edit/Create Popup */}
      {(editItem || isCreating) && (
        <GenericForm
          data={editItem}
          onSave={handleSave}
          onCancel={() => {
            setEditItem(null);
            setIsCreating(false);
          }}
          title={isCreating ? "Create New User" : "Edit User"}
          fields={[
            { key: "email", label: "Email", type: "text", required: requiredFields.includes('email') },
            ...(isCreating ? [{ key: "password", label: "Password", type: "password", required: true }] : []),
            { key: "full_name", label: "Full Name", type: "text", required: requiredFields.includes('full_name') },
            { key: "phone_number", label: "Phone Number", type: "text", required: requiredFields.includes('phone_number') },
            { key: "post_code", label: "Post Code", type: "text", required: requiredFields.includes('post_code') },
            { key: "birthday", label: "Birthday", type: "date", required: requiredFields.includes('birthday') },
            { 
              key: "gender", 
              label: "Gender", 
              type: "select",
              required: requiredFields.includes('gender'),
              options: [
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "other", label: "Other" }
              ]
            },
            { 
              key: "role", 
              label: "Role", 
              type: "select",
              required: true,
              options: [
                { value: "customer", label: "Customer" },
                { value: "staff", label: "Staff" },
                { value: "admin", label: "Admin" }
              ]
            },
          ]}
        />
      )}

      {/* Toast Container */}
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}

export default withErrorHandling(UsersTab, 'User');