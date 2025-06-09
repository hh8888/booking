import React from 'react';

const CustomerProfile = ({ customerData }) => {
  // Add defensive check
  if (!customerData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">Loading customer information...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h2>
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-500">Full Name</label>
          <p className="text-gray-900">{customerData.full_name || 'Not provided'}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">Email</label>
          <p className="text-gray-900">{customerData.email}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">Phone</label>
          <p className="text-gray-900">{customerData.phone || 'Not provided'}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">Post Code</label>
          <p className="text-gray-900">{customerData.post_code || 'Not provided'}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">Member Since</label>
          <p className="text-gray-900">
            {customerData.created_at ? 
              new Date(customerData.created_at).toLocaleDateString() : 
              'Unknown'
            }
          </p>
        </div>
      </div>
      
      {/* <button className="mt-6 w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition duration-200">
        Edit Profile
      </button> */}
    </div>
  );
};

export default CustomerProfile;