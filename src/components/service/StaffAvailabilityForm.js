import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import StaffAvailabilityService from '../../services/StaffAvailabilityService';
import DatabaseService from '../../services/DatabaseService';

// Define days of the week
const daysOfWeek = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' }
];

const StaffAvailabilityForm = ({ staffId, onClose }) => {
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [originalAvailability, setOriginalAvailability] = useState([]);

  useEffect(() => {
    const initData = async () => {
      const dbService = DatabaseService.getInstance();
      const businessHoursStr = await dbService.getSettingsByKey('system', 'businessHours');
      
      let defaultStartTime = '09:00';
      let defaultEndTime = '17:00';
      
      if (businessHoursStr) {
        const [start, end] = businessHoursStr.split('-');
        defaultStartTime = start;
        defaultEndTime = end;
      }
      
      await fetchAvailability(defaultStartTime, defaultEndTime);
    };
    initData();
  }, [staffId]);

  const fetchAvailability = async (defaultStartTime = '09:00', defaultEndTime = '17:00') => {
    try {
      const service = StaffAvailabilityService.getInstance();
      const data = await service.getStaffAvailability(staffId);
      
      // Initialize availability for all days if not set
      const initialAvailability = daysOfWeek.map(day => {
        const existingSchedule = data.find(item => item.day_of_week === day.value);
        return existingSchedule || {
          day_of_week: day.value,
          start_time: defaultStartTime,
          end_time: defaultEndTime,
          is_available: false
        };
      });

      setAvailability(initialAvailability);
      setOriginalAvailability(initialAvailability);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast.error('Failed to fetch availability schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleAvailabilityChange = (dayOfWeek, field, value) => {
    setAvailability(prev => prev.map(schedule => {
      if (schedule.day_of_week === dayOfWeek) {
        return { ...schedule, [field]: value };
      }
      return schedule;
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Compare original data with modified data to find changed records
      const changedAvailability = availability.filter((schedule, index) => {
        const original = originalAvailability[index];
        return (
          schedule.is_available !== original.is_available ||
          schedule.start_time !== original.start_time ||
          schedule.end_time !== original.end_time
        );
      });

      if (changedAvailability.length > 0) {
        const service = StaffAvailabilityService.getInstance();
        await service.updateStaffAvailability(staffId, changedAvailability);
        // After successful update, set current data as original data
        setOriginalAvailability(availability);
      }
      onClose();
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability schedule');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full mx-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-2xl font-semibold mb-6">Staff Availability Schedule</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {daysOfWeek.map(day => (
              <div key={day.value} className="flex items-center space-x-4 p-4 bg-gray-50 rounded">
                <div className="w-32">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={availability.find(s => s.day_of_week === day.value)?.is_available}
                      onChange={(e) => handleAvailabilityChange(day.value, 'is_available', e.target.checked)}
                      className="form-checkbox h-5 w-5 text-blue-600"
                    />
                    <span className="ml-2">{day.label}</span>
                  </label>
                </div>
                
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Time</label>
                    <input
                      type="time"
                      value={availability.find(s => s.day_of_week === day.value)?.start_time}
                      onChange={(e) => handleAvailabilityChange(day.value, 'start_time', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      disabled={!availability.find(s => s.day_of_week === day.value)?.is_available}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Time</label>
                    <input
                      type="time"
                      value={availability.find(s => s.day_of_week === day.value)?.end_time}
                      onChange={(e) => handleAvailabilityChange(day.value, 'end_time', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      disabled={!availability.find(s => s.day_of_week === day.value)?.is_available}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffAvailabilityForm;