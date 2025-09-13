import React from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import { useLanguage } from '../../contexts/LanguageContext';

const DashboardStats = ({ tableStats, currentLocation, loading }) => {
  const { t } = useLanguage();
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" text={t('dashboard.loadingStatistics')} />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-semibold text-gray-800">{t('dashboard.overview')}</h2>
        {currentLocation && (
          <span className="text-lg text-gray-600">- {currentLocation.name}</span>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-700 mb-2">{t('dashboard.today')}</h3>
          <p className="text-3xl font-bold text-orange-600">{tableStats.todayBookings}</p>
          <p className="text-sm text-gray-500 mt-1">{t('dashboard.scheduledAppointments')}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-700 mb-2">{t('dashboard.tomorrow')}</h3>
          <p className="text-3xl font-bold text-green-600">{tableStats.tomorrowBookings}</p>
          <p className="text-sm text-gray-500 mt-1">{t('dashboard.scheduledAppointments')}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-700 mb-2">{t('dashboard.afterTomorrow')}</h3>
          <p className="text-3xl font-bold text-blue-600">{tableStats.futureBookings}</p>
          <p className="text-sm text-gray-500 mt-1">{t('dashboard.upcomingAppointments')}</p>
        </div>
      </div>
    </>
  );
};

export default DashboardStats;