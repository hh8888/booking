import React, { useState, useEffect } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useLanguage } from '../../contexts/LanguageContext';
import { useConnectedUsersTracker } from '../../hooks/useConnectedUsersTracker';
import { USER_ROLES } from '../../constants';
import { UsersIcon, ClockIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const ConnectedUsersReport = ({ currentUserId, userRole, userName }) => {
  const { t } = useLanguage();
  const { 
    connectedUsers, 
    totalConnectedUsers, 
    disconnectedUsers,
    totalDisconnectedUsers,
    fetchConnectedUsers,
    fetchDisconnectedUsers,
    deleteSession,
    deleteMultipleSessions,
    clearAllDisconnectedSessions
  } = useConnectedUsersTracker(
    currentUserId, 
    userRole, 
    userName
  );
  const [timeRange, setTimeRange] = useState('5min'); // 5min, 15min, 1hour
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Group users by role for the chart
  const getUsersByRole = () => {
    const roleGroups = {
      [USER_ROLES.ADMIN]: 0,
      [USER_ROLES.MANAGER]: 0,
      [USER_ROLES.STAFF]: 0,
      [USER_ROLES.CUSTOMER]: 0
    };

    connectedUsers.forEach(user => {
      if (Object.prototype.hasOwnProperty.call(roleGroups, user.user_role)) {
        roleGroups[user.user_role]++;
      }
    });

    return roleGroups;
  };

  const roleData = getUsersByRole();

  const barChartData = {
    labels: [t('roles.admin'), t('roles.manager'), t('roles.staff'), t('roles.customer')],
    datasets: [
      {
        label: t('reports.connectedUsers'),
        data: [roleData.admin, roleData.manager, roleData.staff, roleData.customer],
        backgroundColor: [
          'rgba(239, 68, 68, 0.5)',   // Red for admin
          'rgba(245, 158, 11, 0.5)',  // Orange for manager
          'rgba(59, 130, 246, 0.5)',  // Blue for staff
          'rgba(34, 197, 94, 0.5)'    // Green for customer
        ],
        borderColor: [
          'rgb(239, 68, 68)',
          'rgb(245, 158, 11)',
          'rgb(59, 130, 246)',
          'rgb(34, 197, 94)'
        ],
        borderWidth: 1
      }
    ]
  };

  const doughnutChartData = {
    labels: [t('roles.admin'), t('roles.manager'), t('roles.staff'), t('roles.customer')],
    datasets: [
      {
        data: [roleData.admin, roleData.manager, roleData.staff, roleData.customer],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)'
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top'
      },
      title: {
        display: true,
        text: t('reports.connectedUsersByRole'),
        font: {
          size: 16
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  const formatLastActivity = (lastActivity) => {
    const now = new Date();
    const activityTime = new Date(lastActivity);
    const diffInSeconds = Math.floor((now - activityTime) / 1000);

    if (diffInSeconds < 60) {
      return t('reports.activeNow');
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return t('reports.minutesAgo', { minutes });
    } else {
      const hours = Math.floor(diffInSeconds / 3600);
      return t('reports.hoursAgo', { hours });
    }
  };

  const formatSessionTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatSessionDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = Math.max(0, end - start); // Ensure duration is never negative
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleDeleteSession = async (sessionId) => {
    setSessionToDelete(sessionId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteSession(sessionToDelete);
      setShowDeleteConfirm(false);
      setSessionToDelete(null);
      // Refresh disconnected users list
      fetchDisconnectedUsers();
    } catch (error) {
      console.error('Error deleting session:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectSession = (sessionId) => {
    setSelectedSessions(prev => 
      prev.includes(sessionId) 
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const handleDeleteSelectedSessions = async () => {
    if (selectedSessions.length === 0) return;
    
    setIsDeleting(true);
    try {
      await deleteMultipleSessions(selectedSessions);
      setSelectedSessions([]);
      // Refresh disconnected users list
      fetchDisconnectedUsers();
    } catch (error) {
      console.error('Error deleting sessions:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Add Clear All handler function
  const handleClearAllDisconnectedSessions = async () => {
    setIsClearingAll(true);
    try {
      const result = await clearAllDisconnectedSessions();
      if (result.success) {
        setSelectedSessions([]);
        setShowClearAllConfirm(false);
        // Show success message if needed
      } else {
        console.error('Failed to clear all disconnected sessions:', result.error);
      }
    } catch (error) {
      console.error('Error clearing all disconnected sessions:', error);
    } finally {
      setIsClearingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <UsersIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">{t('reports.totalConnected')}</p>
              <p className="text-2xl font-bold text-gray-900">{totalConnectedUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <UsersIcon className="h-8 w-8 text-gray-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">{t('reports.totalDisconnected')}</p>
              <p className="text-2xl font-bold text-gray-900">{totalDisconnectedUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
            <div>
              <p className="text-sm font-medium text-gray-500">{t('roles.admin')}</p>
              <p className="text-xl font-bold text-gray-900">{roleData.admin}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
            <div>
              <p className="text-sm font-medium text-gray-500">{t('roles.staff')}</p>
              <p className="text-xl font-bold text-gray-900">{roleData.staff}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
            <div>
              <p className="text-sm font-medium text-gray-500">{t('roles.customer')}</p>
              <p className="text-xl font-bold text-gray-900">{roleData.customer}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <Bar data={barChartData} options={chartOptions} />
        </div>
        
        {/* Doughnut Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <Doughnut 
            data={doughnutChartData} 
            options={{
              ...chartOptions,
              scales: undefined, // Remove scales for doughnut chart
              plugins: {
                ...chartOptions.plugins,
                title: {
                  ...chartOptions.plugins.title,
                  text: t('reports.userDistribution')
                }
              }
            }} 
          />
        </div>
      </div>

      {/* Connected Users List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">{t('reports.connectedUsersList')}</h3>
          <p className="text-sm text-gray-500">{t('reports.currentlyActiveUsers')}</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('formLabels.role')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('reports.sessionStartTime')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('reports.lastActivity')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.status')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {connectedUsers.map((user, index) => (
                <tr key={user.user_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.user_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.user_role === 'admin' ? 'bg-red-100 text-red-800' :
                      user.user_role === 'manager' ? 'bg-orange-100 text-orange-800' :
                      user.user_role === 'staff' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {t(`roles.${user.user_role}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {formatSessionTime(user.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {formatLastActivity(user.last_activity)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {t('common.online')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {connectedUsers.length === 0 && (
            <div className="text-center py-8">
              <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">{t('reports.noConnectedUsers')}</h3>
              <p className="mt-1 text-sm text-gray-500">{t('reports.noActiveUsersFound')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Disconnected Users List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-gray-900">{t('reports.disconnectedUsers')}</h3>
              <p className="text-sm text-gray-500">{t('reports.disconnectedUsersDescription')}</p>
            </div>
            <div className="flex space-x-2">
              {disconnectedUsers.length > 0 && (
                <button
                  onClick={() => setShowClearAllConfirm(true)}
                  disabled={isClearingAll}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  title={t('reports.clearAllDisconnectedSessionsTooltip')}
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                  {t('reports.clearAllDisconnectedSessions')}
                </button>
              )}
              {selectedSessions.length > 0 && (
                <button
                  onClick={handleDeleteSelectedSessions}
                  disabled={isDeleting}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                  {t('reports.deleteSession')} ({selectedSessions.length})
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={selectedSessions.length === disconnectedUsers.length && disconnectedUsers.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSessions(disconnectedUsers.map(user => user.session_id));
                      } else {
                        setSelectedSessions([]);
                      }
                    }}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('formLabels.role')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('reports.sessionStartTime')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('reports.sessionEndTime')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('reports.sessionDuration')}
                </th>
                {/* Removed action column header */}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {disconnectedUsers.map((user, index) => (
                <tr key={user.session_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={selectedSessions.includes(user.session_id)}
                      onChange={() => handleSelectSession(user.session_id)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.user_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.user_role === 'admin' ? 'bg-red-100 text-red-800' :
                      user.user_role === 'manager' ? 'bg-orange-100 text-orange-800' :
                      user.user_role === 'staff' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {t(`roles.${user.user_role}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {formatSessionTime(user.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {formatSessionTime(user.last_activity)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatSessionDuration(user.created_at, user.last_activity)}
                  </td>
                  {/* Removed action column with delete button */}
                </tr>
              ))}
            </tbody>
          </table>
          
          {disconnectedUsers.length === 0 && (
            <div className="text-center py-8">
              <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">{t('reports.noDisconnectedUsers')}</h3>
              <p className="mt-1 text-sm text-gray-500">{t('reports.disconnectedUsersDescription')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-600" />
              <h3 className="text-lg font-medium text-gray-900 mt-2">
                {t('reports.deleteSessionConfirmation')}
              </h3>
              <div className="mt-4 flex justify-center space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSessionToDelete(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={confirmDeleteSession}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? t('common.deleting') : t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearAllConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">
                {t('reports.confirmClearAllDisconnectedSessions')}
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  {t('reports.confirmClearAllDisconnectedSessions')}
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowClearAllConfirm(false)}
                    disabled={isClearingAll}
                    className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleClearAllDisconnectedSessions}
                    disabled={isClearingAll}
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50"
                  >
                    {isClearingAll ? t('common.deleting') : t('reports.clearAllDisconnectedSessions')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectedUsersReport;