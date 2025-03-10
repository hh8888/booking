import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import UsersTab from './components/UsersTab';
import ServicesTab from './components/ServicesTab';
import BookingsTab from './components/BookingsTab';
import ReportsTab from './components/ReportsTab';
import SettingsTab from './components/SettingsTab';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users'); // Default active tab
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for storing network error messages
  const [networkError, setNetworkError] = useState(null);

  // Fetch users from the database
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .order("created_at", { ascending: false });
    
        if (error) {
          console.error("Error fetching users:", error);
          setNetworkError("Network connection issue. Unable to fetch user data. Please check your connection and try again.");
        } else {
          setUsers(data);
          setNetworkError(null); // Clear previous errors
        }
      } catch (e) {
        console.error("Exception fetching users:", e);
        setNetworkError("Network connection issue. Unable to fetch user data. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    };
  
    fetchUsers();
  }, []);

  // Retry fetching user data
  const retryFetchUsers = () => {
    setLoading(true);
    setNetworkError(null);
    // Trigger useEffect again
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .order("created_at", { ascending: false });
    
        if (error) {
          console.error("Error fetching users:", error);
          setNetworkError("Network connection issue. Unable to fetch user data. Please check your connection and try again.");
        } else {
          setUsers(data);
          setNetworkError(null);
        }
      } catch (e) {
        console.error("Exception fetching users:", e);
        setNetworkError("Network connection issue. Unable to fetch user data. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert(error.message);
    else window.location.reload(); // Reload the page to return to the sign-in screen
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>

      {/* Sign Out Button */}
      <button
        onClick={handleSignOut}
        className="absolute top-4 right-4 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition duration-200"
      >
        Sign Out
      </button>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`py-2 px-4 ${activeTab === 'users' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'} -mb-[2px]`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('Services')}
          className={`py-2 px-4 ${activeTab === 'Services' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'} -mb-[2px]`}
        >
          Services
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`py-2 px-4 ${activeTab === 'bookings' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'} -mb-[2px]`}
        >
          Bookings
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`py-2 px-4 ${activeTab === 'reports' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'} -mb-[2px]`}
        >
          Reports
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`py-2 px-4 ${activeTab === 'settings' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'} -mb-[2px]`}
        >
          Settings
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        {loading ? (
          <p>Loading users...</p>
        ) : networkError ? (
          <div className="text-center py-8">
            <div className="text-red-500 text-xl mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>{networkError}</p>
            </div>
            <button 
              onClick={retryFetchUsers}
              className="mt-4 bg-blue-500 text-white py-2 px-6 rounded-lg hover:bg-blue-600 transition duration-200"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'users' && <UsersTab users={users} setUsers={setUsers} />}
            {activeTab === 'Services' && <ServicesTab users={users} />}
            {activeTab === 'bookings' && <BookingsTab />}
            {activeTab === 'reports' && <ReportsTab />}
            {activeTab === 'settings' && <SettingsTab />}
          </>
        )}
      </div>
    </div>
  );
}