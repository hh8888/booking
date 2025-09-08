import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { BlockedTimeSlotService } from '../../services/BlockedTimeSlotService';
import LocationService from '../../services/LocationService';
import DatabaseService from '../../services/DatabaseService';
import { toast } from 'react-toastify';
import { USER_ROLES, TABLES } from '../../constants';
import { isManagerOrAdmin } from '../../utils/userUtils';

const BlockTimeSlotForm = ({ staffId, userRole, onClose }) => {
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [selectedStaffId, setSelectedStaffId] = useState(staffId);
  const [staffUsers, setStaffUsers] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);


  const fetchStaffUsers = async () => {
    try {
      setLoadingStaff(true);
      const dbService = DatabaseService.getInstance();
      const users = await dbService.fetchData(TABLES.USERS, 'id,full_name', false, {
        role: { in: ['staff', 'manager'] }
      });
      setStaffUsers(users || []);
    } catch (error) {
      console.error('Error fetching staff users:', error);
      toast.error('Error loading staff users');
    } finally {
      setLoadingStaff(false);
    }
  };
  
  const canSelectStaff = isManagerOrAdmin(userRole);

  useEffect(() => {
    fetchBlockedSlots();
    if (canSelectStaff) {
      fetchStaffUsers();
    }
  }, [selectedStaffId, canSelectStaff]);


  const fetchBlockedSlots = async () => {
    try {
      setLoadingSlots(true);
      const slots = await BlockedTimeSlotService.getBlockedSlots(selectedStaffId);
      // Transform booking data to match expected format
      const transformedSlots = slots.map(slot => ({
        id: slot.id,
        staff_id: slot.provider_id,
        blocked_date: slot.start_time.split('T')[0],
        start_time: slot.start_time.split('T')[1].substring(0, 5),
        end_time: slot.end_time.split('T')[1].substring(0, 5),
        reason: slot.notes || '',
        created_at: slot.created_at
      }));
      setBlockedSlots(transformedSlots);
    } catch (error) {
      console.error('Error fetching blocked slots:', error);
      toast.error(t('blockTimeSlot.errorFetchingSlots'));
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDate || !startTime || !endTime) {
      toast.error(t('blockTimeSlot.fillAllFields'));
      return;
    }

    if (startTime >= endTime) {
      toast.error(t('blockTimeSlot.invalidTimeRange'));
      return;
    }

    try {
      setLoading(true);
      console.log('BlockTimeSlotForm selectedStaffId:', selectedStaffId);
      
      if (!selectedStaffId) {
        toast.error('Please select a staff member to block time for.');
        return;
      }
      
      const locationService = LocationService.getInstance();
      const currentLocation = locationService.getSelectedLocation();
      
      // Create datetime objects from date and time inputs
      const startDateTime = new Date(`${selectedDate}T${startTime}:00`);
      const endDateTime = new Date(`${selectedDate}T${endTime}:00`);
      
      await BlockedTimeSlotService.createBlockedSlot(
        selectedStaffId,
        startDateTime.toISOString(),
        endDateTime.toISOString(),
        reason,
        currentLocation?.id || null // Pass location ID instead of full object
      );
      
      toast.success(t('blockTimeSlot.slotBlocked'));
      setSelectedDate('');
      setStartTime('');
      setEndTime('');
      setReason('');
      fetchBlockedSlots();
    } catch (error) {
      console.error('Error blocking time slot:', error);
      toast.error(t('blockTimeSlot.errorBlocking'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm(t('blockTimeSlot.confirmDelete'))) {
      return;
    }

    try {
      await BlockedTimeSlotService.deleteBlockedSlot(slotId);
      toast.success(t('blockTimeSlot.slotUnblocked'));
      fetchBlockedSlots();
    } catch (error) {
      console.error('Error deleting blocked slot:', error);
      toast.error(t('blockTimeSlot.errorDeleting'));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {t('blockTimeSlot.title')}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Block New Time Slot Form */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('blockTimeSlot.blockNewSlot')}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Staff Selection for Admin/Manager */}
            {canSelectStaff && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('blockTimeSlot.selectStaff')}
                </label>
                {loadingStaff ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                    Loading staff...
                  </div>
                ) : (
                  <select
                    value={selectedStaffId || ''}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">{t('blockTimeSlot.selectStaffPlaceholder')}</option>
                    {staffUsers.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.full_name || `${staff.first_name} ${staff.last_name}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('blockTimeSlot.selectDate')}
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={today}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('blockTimeSlot.startTime')}
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('blockTimeSlot.endTime')}
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('blockTimeSlot.reason')} ({t('blockTimeSlot.optional')})
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('blockTimeSlot.reasonPlaceholder')}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? t('blockTimeSlot.blocking') : t('blockTimeSlot.blockSlot')}
              </button>
              
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>

        {/* Existing Blocked Slots */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('blockTimeSlot.existingBlocks')}
          </h3>
          
          {loadingSlots ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : blockedSlots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>{t('blockTimeSlot.noBlockedSlots')}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {blockedSlots.map((slot) => (
                <div key={slot.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center text-sm font-medium text-gray-900">
                      <svg className="w-4 h-4 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatDate(slot.blocked_date)}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                    </div>
                    {slot.reason && (
                      <div className="text-xs text-gray-500 mt-1">
                        {slot.reason}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleDeleteSlot(slot.id)}
                    className="ml-3 text-red-600 hover:text-red-800 transition-colors"
                    title={t('blockTimeSlot.unblock')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockTimeSlotForm;