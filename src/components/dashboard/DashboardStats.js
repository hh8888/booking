import React from 'react';
import LoadingSpinner from '../common/LoadingSpinner';

const DashboardStats = ({ tableStats, currentLocation, loading }) => {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" text="Loading statistics..." />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Overview</h2>
        {currentLocation && (
          <span className="text-lg text-gray-600 mb-4">- {currentLocation.name}</span>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Today</h3>
          <p className="text-3xl font-bold text-orange-600">{tableStats.todayBookings}</p>
          <p className="text-sm text-gray-500 mt-1">Scheduled appointments</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Future</h3>
          <p className="text-3xl font-bold text-blue-600">{tableStats.futureBookings}</p>
          <p className="text-sm text-gray-500 mt-1">Upcoming appointments</p>
        </div>
      </div>
    </>
  );
};

export default DashboardStats;