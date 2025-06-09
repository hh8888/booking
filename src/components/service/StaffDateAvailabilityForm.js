import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import StaffDateAvailabilityService from '../../services/StaffDateAvailabilityService';
import DatabaseService from '../../services/DatabaseService';

const StaffDateAvailabilityForm = ({ staffId, onClose, selectedLocation }) => {
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableDates, setAvailableDates] = useState([]);
  const [calendarDates, setCalendarDates] = useState([]);
  const [originalAvailability, setOriginalAvailability] = useState([]);

  // Add console log for props
  console.log('StaffDateAvailabilityForm props:', { staffId, selectedLocation });

  useEffect(() => {
    const initData = async () => {
      console.log('initData called, staffId:', staffId, 'currentMonth:', currentMonth);
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
      generateCalendarDates(currentMonth);
    };
    initData();
  }, [staffId, currentMonth]);

  const generateCalendarDates = (date) => {
    console.log('generateCalendarDates called with date:', date);
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 调整到最近的周一
    const start = new Date(firstDay);
    start.setDate(start.getDate() - (start.getDay() || 7) + 1);
    
    // 调整到最后一个周日
    const end = new Date(lastDay);
    end.setDate(end.getDate() + (7 - end.getDay()) % 7);
    
    const dates = [];
    const current = new Date(start);
    
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    console.log('Calendar dates generated:', dates.length, 'dates');
    setCalendarDates(dates);
  };

  const fetchAvailability = async (defaultStartTime = '09:00', defaultEndTime = '17:00') => {
    console.log('fetchAvailability called with defaultTimes:', { defaultStartTime, defaultEndTime });
    try {
      const service = StaffDateAvailabilityService.getInstance();
      
      // 获取未来30天的日期
      const today = new Date();
      const dates = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        // Replace toISOString() with local date formatting
        const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        dates.push(localDate);
      }
      console.log('Generated dates for availability:', dates);
      setAvailableDates(dates);

      // 获取员工在这些日期的可用性设置
      console.log('Fetching availability for staffId:', staffId, 'from:', dates[0], 'to:', dates[dates.length - 1]);
      const data = await service.getStaffDateAvailability(staffId, dates[0], dates[dates.length - 1]);
      console.log('Received availability data:', data);
      
      // 初始化所有日期的可用性
      const initialAvailability = dates.map(date => {
        const existingSchedule = data.find(item => item.date === date);
        return existingSchedule || {
          date: date,
          start_time: defaultStartTime,
          end_time: defaultEndTime,
          is_available: false
        };
      });

      console.log('Initial availability set:', initialAvailability);
      setAvailability(initialAvailability);
      setOriginalAvailability(initialAvailability);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast.error('Failed to fetch availability schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleAvailabilityChange = (date, field, value) => {
    setAvailability(prev => prev.map(schedule => {
      if (schedule.date === date) {
        return { ...schedule, [field]: value };
      }
      return schedule;
    }));
  };

  // Add this function to ensure consistent state
  const toggleDateAvailability = (dateStr, isCurrentlyAvailable) => {
    const schedule = availability.find(s => s.date === dateStr);
    if (schedule) {
      // Toggle availability and ensure time display is consistent
      const newIsAvailable = !isCurrentlyAvailable;
      handleAvailabilityChange(dateStr, 'is_available', newIsAvailable);
      
      // If making available, ensure times are set
      if (newIsAvailable && (!schedule.start_time || !schedule.end_time)) {
        // Set default times if they're empty
        if (!schedule.start_time) handleAvailabilityChange(dateStr, 'start_time', '09:00');
        if (!schedule.end_time) handleAvailabilityChange(dateStr, 'end_time', '17:00');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 比较原始数据和修改后的数据，找出变更的记录
      const changedAvailability = availability.filter((schedule, index) => {
        const original = originalAvailability[index];
        return (
          schedule.is_available !== original.is_available ||
          schedule.start_time !== original.start_time ||
          schedule.end_time !== original.end_time
        );
      }).map(schedule => ({
        ...schedule,
        location: selectedLocation // Add the location to each changed schedule
      }));

      console.log('Changed availability to save:', changedAvailability);
      console.log('Selected location being saved:', selectedLocation, 'type:', typeof selectedLocation);

      if (changedAvailability.length > 0) {
        const service = StaffDateAvailabilityService.getInstance();
        await service.updateStaffDateAvailability(staffId, changedAvailability);
        // 更新成功后，将当前数据设置为原始数据
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
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full mx-auto relative">
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
          <div className="mb-4 flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                const newDate = new Date(currentMonth);
                newDate.setMonth(newDate.getMonth() - 1);
                setCurrentMonth(newDate);
              }}
              className="px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Previous Month
            </button>
            <h3 className="text-lg font-medium text-gray-900">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              type="button"
              onClick={() => {
                const newDate = new Date(currentMonth);
                newDate.setMonth(newDate.getMonth() + 1);
                setCurrentMonth(newDate);
              }}
              className="px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Next Month
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center font-medium text-gray-500">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDates.map(date => {
              // Use local date formatting instead of toISOString()
              const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
              const schedule = availability.find(s => s.date === dateStr);
              const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
              const isPastDate = date < new Date(new Date().setHours(0, 0, 0, 0));
              const isAvailable = schedule?.is_available || false;
              // Use local date formatting for today comparison too
              const today = new Date();
              const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
              const isToday = todayStr === dateStr;
              
              // Add debug log for specific dates to check availability
              if (isToday) {
                console.log('Today\'s schedule:', { dateStr, schedule, isAvailable });
              }
              
              return (
                <div 
                  key={date} 
                  className={`p-2 rounded-lg transition-colors duration-200 
                    ${!isCurrentMonth ? 'bg-gray-100 text-gray-400' : ''}
                    ${isPastDate ? 'bg-gray-200 cursor-not-allowed' : ''}
                    ${isAvailable && !isPastDate ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50 border-2 border-gray-200'}
                    ${isToday ? 'ring-2 ring-blue-500' : ''}
                    ${selectedDate === dateStr ? 'ring-2 ring-green-700' : ''}
                  `}
                  onClick={() => {
                    if (!isPastDate && isCurrentMonth) {
                      toggleDateAvailability(dateStr, isAvailable);
                      setSelectedDate(selectedDate === dateStr ? null : dateStr);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="font-medium text-gray-900 mb-1">{date.getDate()}</div>
                  <div className="text-sm text-gray-600">
                    {isAvailable ? `${schedule?.start_time?.substring(0, 5)} - ${schedule?.end_time?.substring(0, 5)}` : 'Not Available'}
                  </div>
                  {selectedDate === dateStr && (
                    <div className="space-y-1 mt-2">
                      <div>
                        <input
                          type="time"
                          value={schedule?.start_time}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleAvailabilityChange(dateStr, 'start_time', e.target.value);
                            // Always ensure availability is set to true when time is changed
                            handleAvailabilityChange(dateStr, 'is_available', true);
                          }}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          placeholder="Start Time"
                        />
                      </div>
                      <div>
                        <input
                          type="time"
                          value={schedule?.end_time}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleAvailabilityChange(dateStr, 'end_time', e.target.value);
                            // Always ensure availability is set to true when time is changed
                            handleAvailabilityChange(dateStr, 'is_available', true);
                          }}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          placeholder="End Time"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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

export default StaffDateAvailabilityForm;