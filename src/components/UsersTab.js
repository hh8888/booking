import React, { useState, useEffect } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Table from "./Table";
import GenericForm from "./GenericForm";
import DatabaseService from "../services/DatabaseService";

function UsersTab({ users: initialUsers }) {
  const [users, setUsers] = useState(initialUsers || []);
  const [selectedRows, setSelectedRows] = useState([]);
  const [loading, setLoading] = useState(!initialUsers);
  const [error, setError] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  useEffect(() => {
    if (!initialUsers) {
      fetchUsers();
    }
  }, [initialUsers]);
  useEffect(() => {
    if (initialUsers) {
      setUsers(initialUsers);
    }
  }, [initialUsers]);
  const fetchUsers = async () => {
    try {
      // 使用DatabaseService单例获取用户数据
      const dbService = DatabaseService.getInstance();
      const data = await dbService.fetchData('users', 'created_at', false);
      setUsers(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  // 使用DatabaseService单例实现保存功能
  const handleSave = async (itemData) => {
    try {
      const dbService = DatabaseService.getInstance();
      
      if (isCreating) {
        // 创建新用户
        const newUser = await dbService.createItem('users', itemData, 'User');
        
        // 更新本地状态
        setUsers([newUser, ...users]);
        setIsCreating(false);
      } else {
        // 更新现有用户
        await dbService.updateItem('users', itemData, 'User');
        
        // 更新本地状态
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
  // 使用DatabaseService单例实现删除功能
  const handleDeleteSelected = async () => {
    try {
      const dbService = DatabaseService.getInstance();
      
      // 删除选中的用户
      await dbService.deleteItems('users', selectedRows, 'User');
      
      // 更新本地状态
      setUsers(users.filter((item) => !selectedRows.includes(item.id)));
      setSelectedRows([]);
    } catch (error) {
      console.error('Error deleting users:', error);
      // 错误处理已在DatabaseService中通过toast显示
    }
  };
  // 根据角色筛选用户
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

      {/* 角色筛选 */}
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
            { key: "email", label: "Email", type: "text", required: true },
            { key: "full_name", label: "Full Name", type: "text", required: true },
            { key: "phone_number", label: "Phone Number", type: "text" },
            { key: "post_code", label: "Post Code", type: "text", required: true },
            { key: "birthday", label: "Birthday", type: "date" },
            { 
              key: "gender", 
              label: "Gender", 
              type: "select",
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

export default UsersTab;