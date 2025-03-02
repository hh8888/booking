import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import UsersTab from './components/UsersTab';
import ProvidersTab from './components/ProvidersTab';
import BookingsTab from './components/BookingsTab';
import ReportsTab from './components/ReportsTab';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users'); // Default active tab

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
      <div className="flex space-x-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`py-2 px-4 ${activeTab === 'users' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('providers')}
          className={`py-2 px-4 ${activeTab === 'providers' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
        >
          Providers
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`py-2 px-4 ${activeTab === 'bookings' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
        >
          Bookings
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`py-2 px-4 ${activeTab === 'reports' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
        >
          Reports
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'providers' && <ProvidersTab />}
        {activeTab === 'bookings' && <BookingsTab />}
        {activeTab === 'reports' && <ReportsTab />}
      </div>
    </div>
  );
}