import React, { useState, useEffect } from 'react';
import DatabaseService from '../services/DatabaseService';
import DateTimeFormatter from '../utils/DateTimeFormatter';

const TimeSlotPicker = ({ value, onChange, interval = 30, required = false }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedHour, setSelectedHour] = useState('');
  const [selectedMinute, setSelectedMinute] = useState('');
  const [hourOptions, setHourOptions] = useState([]);
  const [minuteOptions, setMinuteOptions] = useState([]);

  // Initialize date and time
  useEffect(() => {
    if (value) {
        console.log('value:', value);
      try {
        let localTimeString;
        let dateObj;
        let dateString;
        var gmtDate;
        if(!value.includes('+')){ // no timezone info, then it's from database, GMT
          localTimeString = DateTimeFormatter.getInstance().convertGMTStringToLocalString(value);
          console.log('localTimeString:', localTimeString);
          dateObj = new Date(localTimeString);
          gmtDate = new Date(localTimeString);
        } else {  //value is always GMT time, when creating
          dateObj = new Date(value);
          gmtDate = new Date(value);
          localTimeString = gmtDate.toGMTString();
        }
        console.log('Parsed date:', dateObj);
        
        dateString = gmtDate.toLocaleDateString('en-CA', { year: "numeric", day: "2-digit", month: "2-digit", weekday: "long", firstDayOfWeek: 1});
        console.log('dateString:', dateString);
        
        if (!isNaN(dateObj.getTime())) {
          setSelectedDate(dateString); //set param to yyyy-mm-dd
          
          // Set time parts (HH and MM)
          const hours = dateObj.getHours().toString();
          let min = dateObj.getMinutes();
          if((min+interval)>60){min = 1;}
          const minutes = Math.ceil(min/interval)*interval;    //set to next interval
          
          setSelectedHour(hours.toString().padStart(2, '0'));
          setSelectedMinute(minutes.toString().padStart(2, '0'));
          
          console.log('TimeSlotPicker initialized with:', {
            date: dateString,
            hours: hours,
            minutes: minutes.toString().padStart(2, '0')
          });
        } else {
          console.error('Invalid date value:', value);
        }
      } catch (error) {
        console.error('Error parsing date:', error, value);
      }
    }
  }, [value]);

  // Get business hours from settings and generate time slots when date changes
  useEffect(() => {
    if (selectedDate) {
      const fetchBusinessHours = async () => {
        try {
          const dbService = DatabaseService.getInstance();
          const businessHours = await dbService.getSettingsByKey('system', 'businessHours');
          
          // Parse business hours or use default (9:00-17:00)
          let startHour = 9;
          let endHour = 17;
          
          if (businessHours) {
            const [start, end] = businessHours.split('-');
            startHour = parseInt(start.split(':')[0]);
            endHour = parseInt(end.split(':')[0]);
          }
          
          generateTimeOptions(interval, startHour, endHour);
        } catch (error) {
          console.error('Failed to fetch business hours:', error);
          // Use default hours if failed to fetch
          generateTimeOptions(interval, 9, 17);
        }
      };
      
      fetchBusinessHours();
    }
  }, [selectedDate, interval]);

  // Generate hour and minute options
  const generateTimeOptions = (intervalMinutes, startHour, endHour) => {
    // Generate hour options
    const hours = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      hours.push(hour.toString().padStart(2, '0'));
    }
    setHourOptions(hours);

    // Generate minute options based on interval
    const minutes = [];
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      minutes.push(minute.toString().padStart(2, '0'));
    }
    setMinuteOptions(minutes);
  };

  // Update complete datetime value when date or time parts change
  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    updateDateTime(newDate, selectedHour, selectedMinute);
  };

  const handleHourChange = (e) => {
    const newHour = e.target.value;
    setSelectedHour(newHour);
    updateDateTime(selectedDate, newHour, selectedMinute);
  };

  const handleMinuteChange = (e) => {
    const newMinute = e.target.value;
    setSelectedMinute(newMinute);
    updateDateTime(selectedDate, selectedHour, newMinute);
  };

  // Update complete datetime value and trigger onChange callback
  const updateDateTime = (date, hour, minute) => {
    if (date && hour && minute) {
      // Create a date object based on local timezone
      const localDate = new Date(`${date}T${hour}:${minute}:00`);
      
      // Get timezone offset (in minutes)
      const timezoneOffset = localDate.getTimezoneOffset();
      
      // Calculate timezone offset hours and minutes
      const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
      const offsetMinutes = Math.abs(timezoneOffset) % 60;
      
      // Build timezone string (+/-HH:MM)
      const offsetSign = timezoneOffset <= 0 ? '+' : '-';
      const offsetString = `${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;
      
      // Build ISO format datetime string with timezone information
      const dateTimeString = `${date}T${hour}:${minute}:00${offsetString}`;
      
      onChange({ target: { name: 'start_time', value: dateTimeString } });
    }
  };

  // Convert 24-hour format to 12-hour format
  const to12HourFormat = (hour24) => {
    const hour = parseInt(hour24);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12} ${period}`; // Remove padStart as hour value doesn't need zero padding
  };

  return (
    <div className="space-y-2">
      {/* Date Picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
        <input
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-400 focus:border-indigo-400 hover:border-indigo-300"
          required={required}
        />
      </div>
      
      {/* Time Picker */}
      <div className="flex space-x-2">
        {/* Hour Picker */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Hour</label>
          <select
            value={selectedHour}
            onChange={handleHourChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-400 focus:border-indigo-400 hover:border-indigo-300"
            required={required}
            disabled={!selectedDate}
          >
            <option value="">Please select</option>
            {hourOptions.map((hour) => (
              <option key={hour} value={hour}>
                {to12HourFormat(hour)}
              </option>
            ))}
          </select>
        </div>

        {/* Minute Picker */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Minute</label>
          <select
            value={selectedMinute}
            onChange={handleMinuteChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-400 focus:border-indigo-400 hover:border-indigo-300"
            required={required}
            disabled={!selectedDate || !selectedHour}
          >
            <option value="">Please select</option>
            {minuteOptions.map((minute) => (
              <option key={minute} value={minute}>
                {minute}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Display selected complete time */}
      {selectedDate && selectedHour && selectedMinute && (
        <div className="text-sm text-gray-500 mt-1">
          Selected: {selectedDate} {to12HourFormat(selectedHour)}:{selectedMinute}
        </div>
      )}
    </div>
  );
};

export default TimeSlotPicker;