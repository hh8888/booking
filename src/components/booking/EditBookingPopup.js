import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import GenericForm from '../common/GenericForm';
import DatabaseService from '../../services/DatabaseService';
import DateTimeFormatter from '../../utils/DateTimeFormatter';
import BookingService from '../../services/BookingService';
import StaffAvailabilityService from '../../services/StaffAvailabilityService';
import TimeSlots from './TimeSlots';


export default function EditBookingPopup({ 
  booking, 
  onSave, 
  onCancel, 
  isCreating = false, 
  defaultTime = null, 
  selectedDate = null, 
  defaultProviderId = null,
  hideCustomerSelection = false, // New prop
  hideRecurringOptions = false   // New prop
}) {
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [services, setServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [providers, setProviders] = useState([]);
  const [hourOptions, setHourOptions] = useState([]);
  const [minuteOptions, setMinuteOptions] = useState([]);
  const [showRecurringOptions, setShowRecurringOptions] = useState(false);
  const [bookingTimeInterval, setBookingTimeInterval] = useState(5);
  const [businessHours, setBusinessHours] = useState(null);
  const [selectedProviderAvailability, setSelectedProviderAvailability] = useState([]);
  const [recurringOptions] = useState([
    { value: 'daily', label: 'Repeat Daily' },
    { value: 'weekly', label: 'Repeat Weekly' }
  ]);

  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [allTimeSlots, setAllTimeSlots] = useState([]);

  // Initialize time options only once
  useEffect(() => {
    const initTimeOptions = async () => {
      await fetchBookingTimeInterval();
    };
    initTimeOptions();
  }, []);

  // Initialize data when time options are ready and when booking/isCreating changes
  useEffect(() => {
    if (hourOptions.length > 0 && minuteOptions.length > 0) {
      initData();
    }
  }, [booking, isCreating, hourOptions.length, minuteOptions.length]); // Use .length to avoid re-running when array contents change

  useEffect(() => {
    const fetchAvailableTimeSlots = async () => {
      if (editItem?.provider_id && editItem?.start_date) {
        try {
          const dbService = DatabaseService.getInstance();
          const staffAvailabilityService = StaffAvailabilityService.getInstance();
          const startDate = new Date(editItem.start_date);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(editItem.start_date);
          endDate.setHours(23, 59, 59, 999);

          // Debug logging
          console.log('Fetching slots for:', {
            provider_id: editItem.provider_id,
            start_date: editItem.start_date,
            hourOptions: hourOptions,
            minuteOptions: minuteOptions
          });

          // 获取该提供者在所选日期的所有预约
          const existingBookings = await dbService.fetchData('bookings', 'start_time', false, {
            provider_id: editItem.provider_id,
            start_time: { gte: startDate.toISOString(), lte: endDate.toISOString() }
          });

          // Filter out the current booking being edited
          const filteredBookings = existingBookings.filter(booking => {
            if (!isCreating && editItem && booking.id === editItem.id) {
              return false;
            }
            // Exclude cancelled bookings from conflict checking
            if (booking.status === 'cancelled') {
              return false;
            }
            return true;
          });
          
          // REMOVE THIS ENTIRE SECTION - it's causing the error
          // Check for time overlap with existing bookings
          // for (const booking of filteredBookings) {
          //   const bookingStart = new Date(booking.start_time);
          //   const bookingEnd = new Date(booking.end_time);
          //   
          //   // Check if there's any overlap
          //   if ((startDate < bookingEnd && endDate > bookingStart)) {
          //     const conflictTime = DateTimeFormatter.getInstance().formatDateTime(bookingStart);
          //     throw new Error(`The booking duration would conflict with an existing booking at ${conflictTime}. Please select a different time or reduce the duration.`);
          //   }
          // }

          console.log('Existing bookings:', existingBookings);
          console.log('Filtered bookings (excluding current):', filteredBookings);

          // 获取服务提供者在该日期的可用时间
          const availability = await staffAvailabilityService.getStaffAvailability(editItem.provider_id);
          const dayAvailability = availability.filter(slot => slot.date === editItem.start_date && slot.is_available);

          console.log('Day availability:', {
            availability,
            dayAvailability
          });

          // 生成所有可能的时间槽
          const allSlots = [];
          const availableSlots = [];
          const bookedSlots = [];

          // Check if we have the required data
          if (hourOptions.length === 0 || minuteOptions.length === 0) {
            console.log('Hour or minute options not loaded yet');
            return;
          }

          if(dayAvailability.length > 0){
            for (let hour of hourOptions) {
              for (let minute of minuteOptions) {
                const slotTime = new Date(editItem.start_date);
                slotTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
                
                // 检查时间槽是否在服务提供者的可用时间内
                const isInAvailableHours = dayAvailability.some(slot => {
                  const [startHour, startMinute] = slot.start_time.split(':');
                  const [endHour, endMinute] = slot.end_time.split(':');
                  const availStart = new Date(slotTime);
                  availStart.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
                  const availEnd = new Date(slotTime);
                  availEnd.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);
                  if (parseInt(endHour) < parseInt(startHour)) {
                    availEnd.setDate(availEnd.getDate() + 1);
                  }
                  return slotTime >= availStart && slotTime < availEnd;
                });

                // 检查时间槽是否被占用
                const isSlotBooked = filteredBookings.some(booking => {
                  // Exclude cancelled bookings from blocking time slots
                  if (booking.status === 'cancelled') {
                    return false;
                  }
                  
                  const bookingStart = new Date(booking.start_time);
                  const bookingEnd = new Date(booking.end_time);
                  return slotTime >= bookingStart && slotTime < bookingEnd;
                });

                if (isInAvailableHours) {
                  const timeSlot = `${hour}:${minute}`;
                  // Add to allSlots regardless of booking status
                  allSlots.push(timeSlot);
                  
                  if (isSlotBooked) {
                    bookedSlots.push(timeSlot);
                  } else {
                    availableSlots.push(timeSlot);
                  }
                }
              }
            }
          }
            //Remove last
            // if(availableSlots.length > 1){
            //   availableSlots.length -= 1;
            // }
            
            console.log('All Slots:', allSlots);
            console.log('Available Slots:', availableSlots);
            console.log('Booked Slots:', bookedSlots);
            
            setAllTimeSlots(allSlots);
            setAvailableTimeSlots(availableSlots);
            setBookedSlots(bookedSlots);
          } catch (error) {
            console.error('Error fetching available time slots:', error);
            toast.error('Failed to fetch available time slots');
          }
        } else {
          console.log('Missing provider_id or start_date:', {
            provider_id: editItem?.provider_id,
            start_date: editItem?.start_date
          });
          setAvailableTimeSlots([]);
        }
      };
      fetchAvailableTimeSlots();
    
    }, [editItem?.provider_id, editItem?.start_date, hourOptions.length, minuteOptions.length]); // Remove hourOptions and minuteOptions from dependencies

  const fetchProviderAvailability = async (providerId, days = 30) => {
    // 获取服务提供者未来days天的可用时间，从最近的周一开始
    if (!providerId) return [];
    
    try {
      const service = StaffAvailabilityService.getInstance();
      
      // 找到最近的周一
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
      const currentDay = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
      monday.setHours(0, 0, 0, 0);
      
      // Calculate end date
      const endDate = new Date(monday);
      endDate.setDate(monday.getDate() + days - 1);
      endDate.setHours(23, 59, 59, 999);
      
      // Single database call to get all availability data for the date range
      const availabilityData = await service.getStaffAvailabilityForDateRange(
        providerId, 
        monday, 
        endDate
      );
      
      const availabilityPromises = [];
      
      for (let i = 0; i < days; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        date.setHours(0, 0, 0, 0); // Reset time for accurate comparison
        
        // 检查是否是过去的日期 - Fixed comparison
        const isPastDate = date < today;
        
        if (isPastDate) {
          availabilityPromises.push({
            date: date.toLocaleDateString('en-us', { month: "short", day: "numeric" }),
            available: false
          });
        } else {
          // Check availability using cached data instead of making individual API calls
          const isAvailable = service.isTimeSlotAvailableInData(
            availabilityData,
            date,
            '09:00', // Business start time
            '17:00'  // Business end time
          );
          
          availabilityPromises.push({
            date: date.toLocaleDateString('en-us', { month: "short", day: "numeric" }),
            available: isAvailable
          });
        }
      }
      
      return availabilityPromises;
    } catch (error) {
      console.error('Error fetching availability:', error);
      return [];
    }
  };

  const initData = async () => {
    const fetchProviders = async () => {
      try {
        const dbService = DatabaseService.getInstance();
        const data = await dbService.fetchData('users', 'created_at', false, { role: { in: ['staff', 'admin'] } }, ['id', 'full_name']);
        setProviders(data);
        return data;
      } catch (error) {
        console.error('Error fetching providers:', error);
        return [];
      }
    };

    await Promise.all([
      fetchCustomers(),
      fetchServices(),
      fetchProviders()
    ]);

    if (booking) {
      if (isCreating) {
        // Handle new booking creation with existing booking data
        const defaultDate = selectedDate || new Date();
        
        let defaultHour = '09';
        let defaultMinute = '00';
        
        if (defaultTime) {
          const [hour, minute] = defaultTime.split(':');
          defaultHour = hour.padStart(2, '0');
          defaultMinute = minute.padStart(2, '0');
        } else if (businessHours) {
          const [start] = businessHours.split('-');
          const [hour, minute] = start.split(':');
          defaultHour = hour.padStart(2, '0');
          defaultMinute = minute.padStart(2, '0');
        }
        
        console.log('Setting default time:', { defaultHour, defaultMinute }); // Debug log
        
        const defaultBooking = {
          start_date: defaultDate.toLocaleDateString('en-CA'),
          start_time_hour: defaultHour,
          start_time_minute: defaultMinute,
          provider_id: defaultProviderId || '',
          status: 'pending'
        };
        
        console.log('Default booking object:', defaultBooking); // Debug log
        setEditItem(defaultBooking);
        
        // 触发provider_id的onChange事件
        if (defaultProviderId) {
          setLoadingAvailability(true);
          const availabilityData = await fetchProviderAvailability(defaultProviderId);
          setSelectedProviderAvailability(availabilityData);
          setLoadingAvailability(false);
        }
      } else {
        // Format start_time for date and time inputs
        const bookingDate = new Date(booking.start_time);
        // Calculate duration from start_time and end_time
        const endDate = new Date(booking.end_time);
        const durationInMinutes = Math.round((endDate - bookingDate) / (1000 * 60));
        
        const formattedBooking = {
          ...booking,
          start_date: bookingDate.toLocaleDateString('en-CA'),
          start_time_hour: bookingDate.getHours().toString().padStart(2, '0'),
          start_time_minute: bookingDate.getMinutes().toString().padStart(2, '0'),
          duration: durationInMinutes
        };
        
        // Debug logging
        console.log('Setting editItem for editing:', {
          original: booking,
          formatted: formattedBooking,
          provider_id: formattedBooking.provider_id,
          start_date: formattedBooking.start_date
        });
        
        setEditItem(formattedBooking);
        
        // 手动触发provider_id的onChange事件
        if (formattedBooking.provider_id) {
          setLoadingAvailability(true);
          const availabilityData = await fetchProviderAvailability(formattedBooking.provider_id);
          setSelectedProviderAvailability(availabilityData);
          setLoadingAvailability(false);
        }
      }
    } else if (isCreating) {
      // Handle new booking creation without existing booking data
      const defaultDate = selectedDate || new Date();
      
      let defaultHour = '09';
      let defaultMinute = '00';
      
      if (defaultTime) {
        const [hour, minute] = defaultTime.split(':');
        defaultHour = hour.padStart(2, '0');
        defaultMinute = minute.padStart(2, '0');
      } else if (businessHours) {
        const [start] = businessHours.split('-');
        const [hour, minute] = start.split(':');
        defaultHour = hour.padStart(2, '0');
        defaultMinute = minute.padStart(2, '0');
      }
      
      console.log('Setting default time (no booking):', { defaultHour, defaultMinute }); // Debug log
      
      const defaultBooking = {
        start_date: defaultDate.toLocaleDateString('en-CA'),
        start_time_hour: defaultHour,
        start_time_minute: defaultMinute,
        provider_id: defaultProviderId || '',
        status: 'pending'
      };
      
      console.log('Default booking object (no booking):', defaultBooking); // Debug log
      setEditItem(defaultBooking);
      
      // Fetch availability for prefilled provider
      // if (defaultProviderId) {
      //   setLoadingAvailability(true);
      //   const availabilityData = await fetchProviderAvailability(defaultProviderId);
      //   setSelectedProviderAvailability(availabilityData);
      //   setLoadingAvailability(false);
      // }
    }
  };

  useEffect(() => {
    initData();
  }, [booking, isCreating]);


  const fetchBookingTimeInterval = async () => {
    try {
      const dbService = DatabaseService.getInstance();
      const interval = await dbService.getSettingsByKey('booking', 'bookingTimeSlotInterval');
      setBookingTimeInterval(parseInt(interval) || 30);

      // Get business hours from settings
      const businessHoursValue = await dbService.getSettingsByKey('system', 'businessHours');
      setBusinessHours(businessHoursValue);
      
      let startHour = 9;
      let endHour = 17;
      
      if (businessHoursValue) {
        const [start, end] = businessHoursValue.split('-');
        const [startHourStr, startMinute] = start.split(':');
        const [endHourStr, endMinute] = end.split(':');
        startHour = parseInt(startHourStr);
        endHour = parseInt(endHourStr);
      }

      // Set hour options
      const hours = [];
      for (let hour = startHour; hour <= endHour; hour++) {
        hours.push(hour.toString().padStart(2, '0'));
      }
      setHourOptions(hours);

      // Set minute options based on interval
      const minutes = [];
      for (let minute = 0; minute < 60; minute += parseInt(interval) || 30) {
        minutes.push(minute.toString().padStart(2, '0'));
      }
      setMinuteOptions(minutes);
    } catch (error) {
      console.error('Error fetching booking time interval:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const dbService = DatabaseService.getInstance();
      const data = await dbService.fetchData('services');
      setServices(data);
      return data;
    } catch (error) {
      console.error('Error fetching services:', error);
      return [];
    }
  };

  const fetchCustomers = async () => {
    try {
      const dbService = DatabaseService.getInstance();
      const data = await dbService.fetchSpecificColumns('users', 'id, full_name', { role: 'customer' });
      setCustomers(data);
      return data;
    } catch (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
  };

  const handleSave = async (itemData) => {
    console.log('=== EditBookingPopup handleSave START ===');
    console.log('itemData received:', itemData);
    console.log('isCreating:', isCreating);
    console.log('editItem:', editItem);
    console.log('onSave function:', onSave);
    
    setLoading(true);
    try {
      const dbService = DatabaseService.getInstance();
      
      // Construct complete start_time
      const startDate = new Date(itemData.start_date);
      const hour = parseInt(itemData.start_time_hour);
      const minute = parseInt(itemData.start_time_minute);
      
      console.log('Date/time parsing:', {
        start_date: itemData.start_date,
        hour: itemData.start_time_hour,
        minute: itemData.start_time_minute,
        parsedDate: startDate,
        parsedHour: hour,
        parsedMinute: minute
      });
      
      if (isNaN(startDate.getTime()) || isNaN(hour) || isNaN(minute)) {
        console.error('Invalid date/time values');
        throw new Error('Please provide valid date and time');
      }
      
      startDate.setHours(hour, minute, 0, 0);
      const isoStartTime = startDate.toISOString();
      
      // DURATION OVERLAP VALIDATION
      const duration = parseInt(itemData.duration) || 60;
      const endTime = new Date(startDate.getTime() + duration * 60000);
      
      // Check if the booking would extend beyond working hours
      const staffAvailabilityService = StaffAvailabilityService.getInstance();
      const availability = await staffAvailabilityService.getStaffAvailability(itemData.provider_id);
      const dayAvailability = availability.filter(slot => 
        slot.date === itemData.start_date && slot.is_available
      );
      
      // Check if the selected date has no availability at all
      if (dayAvailability.length === 0) {
        throw new Error('The selected date is not available for the provider.');
      }
      
      let isWithinWorkingHours = false;
      for (const slot of dayAvailability) {
        const [endHour, endMinute] = slot.end_time.split(':');
        const workingEndTime = new Date(startDate);
        workingEndTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);
        
        if (endTime <= workingEndTime) {
          isWithinWorkingHours = true;
          break;
        }
      }
      
      if (!isWithinWorkingHours) {
        throw new Error(`The booking duration (${duration} minutes) would extend beyond working hours. Please select an earlier time or reduce the duration.`);
      }
      
      // Check for conflicts with existing bookings
      const existingBookings = await dbService.fetchData('bookings', 'start_time', false, {
        provider_id: itemData.provider_id,
        start_time: { gte: startDate.toISOString().split('T')[0] + 'T00:00:00.000Z', 
                     lte: startDate.toISOString().split('T')[0] + 'T23:59:59.999Z' }
      });
      
      // Get the selected service to check if it has assigned staff
      const selectedService = services.find(service => service.id === itemData.service_id);
      
      // Only check for overlaps if the service has assigned staff
      if (selectedService && selectedService.staff_id) {
        // Filter out the current booking being edited
        const filteredBookings = existingBookings.filter(booking => {
          if (!isCreating && editItem && booking.id === editItem.id) {
            return false;
          }
          // Exclude cancelled bookings from conflict checking
          if (booking.status === 'cancelled') {
            return false;
          }
          return true;
        });
        
        // Check for time overlap with existing bookings
        for (const booking of filteredBookings) {
          const bookingStart = new Date(booking.start_time);
          const bookingEnd = new Date(booking.end_time);
          
          // Check if there's any overlap
          if ((startDate < bookingEnd && endTime > bookingStart)) {
            const conflictTime = DateTimeFormatter.getInstance().formatDateTime(bookingStart);
            throw new Error(`The booking duration would conflict with an existing booking at ${conflictTime}. Please select a different time or reduce the duration.`);
          }
        }
      }
      // If service has no assigned staff (staff_id is null), skip overlap validation entirely
      
      // END DURATION OVERLAP VALIDATION
      
      let updatedData;
      if (isCreating) {
        const { start_date, start_time_hour, start_time_minute, ...restData } = itemData;
        updatedData = {
          ...restData,
          start_time: isoStartTime,
          status: restData.status || 'pending'
        };
      } else {
        const { start_date, start_time_hour, start_time_minute, ...restData } = itemData;
        updatedData = {
          ...editItem,
          ...restData,
          start_time: isoStartTime
        };
      }
      
      // Remove extra display fields
      const { service_name, customer_name, booking_time_formatted, created_at_formatted, show_recurring, start_datetime, availabledays, timeslots, ...dataToSave } = updatedData;
      
      // Ensure ID is preserved in edit mode, but removed in create mode
      if (!isCreating) {
        if (editItem && editItem.id) {
          dataToSave.id = editItem.id;
        }
      } else {
        // For new bookings, explicitly remove the id field to avoid UUID validation errors
        delete dataToSave.id;
      }
      
      // Handle recurring fields
      if (isCreating) {
        if (showRecurringOptions) {
          // Ensure recurring_count is a number
          dataToSave.recurring_count = parseInt(dataToSave.recurring_count) || 0;
          // Set default recurring_type if not selected
          dataToSave.recurring_type = dataToSave.recurring_type || 'daily';
          
          // Create the first booking as parent
          const parentBooking = await onSave(dataToSave);
          
          // Create recurring bookings with parent reference
          if (parentBooking && dataToSave.recurring_count > 1) {
            const startDate = new Date(isoStartTime);
            const totalBookings = dataToSave.recurring_count;
            
            // Create remaining bookings (total - 1 since parent is already created)
            for (let i = 1; i < totalBookings; i++) {
              if (dataToSave.recurring_type === 'daily') {
                startDate.setDate(startDate.getDate() + 1);
              } else if (dataToSave.recurring_type === 'weekly') {
                startDate.setDate(startDate.getDate() + 7);
              }
              
              // Use the duration value from the form instead of calculating from service
              const durationInMinutes = parseInt(dataToSave.duration) || 60;

              const recurringBooking = {
                ...dataToSave,
                start_time: startDate.toISOString(),
                end_time: new Date(startDate.getTime() + durationInMinutes * 60000).toISOString(),
                recurring_parent_id: parentBooking.id
              };
              
              await onSave(recurringBooking);
            }
            return;
          }
        } else {
          dataToSave.recurring_type = null;
          dataToSave.recurring_count = 0;
        }
      }

      // Validate required fields
      if (!hideCustomerSelection && (!dataToSave.customer_id || dataToSave.customer_id === '')) {
        toast.error('Please select a valid customer');
        return;
      }

      if (!dataToSave.provider_id) {
        toast.error('Please select a provider');
        return;
      }
      
      // Calculate end_time based on duration input
      const durationInMinutes = parseInt(dataToSave.duration) || 60;
      // const endTime = new Date(startDate.getTime() + durationInMinutes * 60000);
      dataToSave.end_time = endTime.toISOString();
      dataToSave.duration = durationInMinutes; // 确保duration字段为数字类型

      // Call the parent onSave handler
      console.log('Calling parent onSave with:', dataToSave);
      const result = await onSave(dataToSave);
      console.log('Parent onSave result:', result);
      console.log('=== EditBookingPopup handleSave SUCCESS ===');
    } catch (error) {
      console.error('=== EditBookingPopup handleSave ERROR ===');
      console.error('Error saving booking:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };
  // Add this useEffect to debug the options loading
  useEffect(() => {
    console.log('Hour options:', hourOptions);
    console.log('Minute options:', minuteOptions);
    console.log('Edit item:', editItem);
  }, [hourOptions, minuteOptions, editItem]);

  // Add this useEffect to ensure customer_id is set when hideCustomerSelection is true
  useEffect(() => {
    if (hideCustomerSelection && editItem && !editItem.customer_id) {
      // If customer_id is not set but we're hiding customer selection,
      // it should have been passed in the editItem prop from CustomerBooking
      console.log('Setting customer_id from editItem:', editItem);
    }
  }, [hideCustomerSelection, editItem]);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <GenericForm
          data={editItem}
          onSave={handleSave}
          onCancel={onCancel}
          title={isCreating ? "Create New Booking" : "Edit Booking"}
          loading={loading}
          loadingAvailability={loadingAvailability}
          fields={[
            { 
              key: "customer_id", 
              label: "Customer", 
              type: "select",
              options: customers.map(customer => ({
                value: customer.id,
                label: customer.full_name
              })),
              required: !hideCustomerSelection,
              placeholder: "Select a Customer",
              hidden: hideCustomerSelection,
              onChange: (value) => {
                setEditItem(prev => ({
                  ...prev,
                  customer_id: value
                }));
              }
            },
            { 
              key: "provider_id", 
              label: "Provider", 
              type: "select",
              options: providers.map(provider => ({
                value: provider.id,
                label: provider.full_name
              })),
              required: true,
              placeholder: "Select a Provider",
              onChange: async (value) => {
                if (value) {
                  setLoadingAvailability(true);
                  const availabilityData = await fetchProviderAvailability(value);
                  setSelectedProviderAvailability(availabilityData);
                  setEditItem(prev => ({
                    ...prev,
                    provider_id: value
                  }));
                  setLoadingAvailability(false);
                } else {
                  setSelectedProviderAvailability([]);
                }
              }
            },
            {
              key: "availabledays",
              type: "custom",
              renderField: () => (
                <div className="bg-gray-50 rounded-md">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Date availability</h3>
                  <div className="grid grid-cols-7 gap-2">
                    {selectedProviderAvailability.map((day, index) => (
                      <div 
                        key={index}
                        className={`p-2 text-center rounded cursor-pointer 
                          ${day.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} 
                          ${day.date === new Date().toLocaleDateString('en-us', { month:"short", day:"numeric"}) ? 'ring-2 ring-blue-500' : ''} 
                          ${editItem?.start_date && new Date(editItem.start_date).toLocaleDateString('en-us', { month:"short", day:"numeric"}) === day.date ? 'selected-date' : ''}`} 
                        onClick={e => {
                          const dayInfo = day.date.split(' ');
                          const month = dayInfo[0];
                          const dayNum = dayInfo[1];
                          const date = new Date();
                          date.setMonth(new Date(`${month} 1`).getMonth());
                          date.setDate(parseInt(dayNum));
                          const formattedDate = date.toLocaleDateString('en-CA');
                          setEditItem(prev => ({
                            ...prev,
                            start_date: formattedDate
                          }));
                        }}
                      >
                        <div className="text-xs">{day.date}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            },
            { 
              key: "service_id", 
              label: "Service", 
              type: "select",
              options: services.map(service => ({
                value: service.id,
                label: service.name
              })),
              required: false,
              placeholder: "Select a Service",
              onChange: (value) => {
                if (value) {
                  const selectedService = services.find(service => service.id === value);
                  if (selectedService && selectedService.duration) {
                    // Convert duration from "HH:MM:SS" format to minutes
                    let durationInMinutes = 60; // default
                    
                    if (typeof selectedService.duration === 'string' && selectedService.duration.includes(':')) {
                      const timeParts = selectedService.duration.split(':');
                      const hours = parseInt(timeParts[0]) || 0;
                      const minutes = parseInt(timeParts[1]) || 0;
                      const seconds = parseInt(timeParts[2]) || 0;
                      
                      durationInMinutes = (hours * 60) + minutes + Math.round(seconds / 60);
                    } else if (typeof selectedService.duration === 'number') {
                      durationInMinutes = selectedService.duration;
                    } else if (typeof selectedService.duration === 'string') {
                      // Handle other string formats like "60 minutes"
                      const match = selectedService.duration.match(/\d+/);
                      durationInMinutes = match ? parseInt(match[0]) : 60;
                    }
                    
                    setEditItem(prev => ({
                      ...prev,
                      service_id: value,
                      duration: durationInMinutes
                    }));
                  } else {
                    setEditItem(prev => ({
                      ...prev,
                      service_id: value
                    }));
                  }
                } else {
                  setEditItem(prev => ({
                    ...prev,
                    service_id: value
                  }));
                }
              }
            },
            {
              key: "duration",
              label: "Duration (minutes)",
              type: "number",
              min: 5,
              max: 480,
              step: 5,
              defaultValue: 60,
              required: true,
              onBlur: (value) => {
                setEditItem(prev => ({
                  ...prev,
                  duration: value
                }));
              }
            },
            {
              key: "start_date",
              label: "Date & Time",
              type: "date",
              required: true
            },
            { 
              inline: true,
              key: "start_datetime",
              fields: [
                { 
                  key: "start_time_hour", 
                  label: "Hour", 
                  type: "select",
                  required: true,
                  options: hourOptions.map(hour => ({
                    value: hour,
                    label: DateTimeFormatter.getInstance().to12HourFormat(hour)
                  })),
                  placeholder: "Select Hour",
                  onChange: (value) => {
                    setEditItem(prev => ({
                      ...prev,
                      start_time_hour: value
                    }));
                  }
                },
                { 
                  key: "start_time_minute", 
                  label: "Minute", 
                  type: "select",
                  required: true,
                  options: minuteOptions.map(minute => ({
                    value: minute,
                    label: minute
                  })),
                  placeholder: "Select Minute",
                  onChange: (value) => {
                    setEditItem(prev => ({
                      ...prev,
                      start_time_minute: value
                    }));
                  }
                }
              ]
            },
            {
              key: "timeslots",
              type: "custom",
              renderField: () => {
                if (!editItem?.provider_id || !editItem?.start_date) {
                  return null;
                }

                return (
                  <TimeSlots
                    allSlots={allTimeSlots}
                    availableSlots={availableTimeSlots}
                    bookedSlots={bookedSlots}
                    selectedHour={editItem?.start_time_hour}
                    selectedMinute={editItem?.start_time_minute}
                    duration={parseInt(editItem?.duration) || 60}
                    timeInterval={bookingTimeInterval}
                    onTimeSelect={(hour, minute) => {
                      // Validate if the selected time slot would cause duration overlap
                      const selectedTime = new Date(2000, 0, 1, parseInt(hour), parseInt(minute));
                      const duration = parseInt(editItem?.duration) || 60;
                      const endTime = new Date(selectedTime.getTime() + duration * 60000);
                      
                      // Check if any time slots within the duration are booked by others
                      let hasConflict = false;
                      const conflictSlots = [];
                      
                      for (let i = 0; i < duration; i += bookingTimeInterval) {
                        const checkTime = new Date(selectedTime.getTime() + i * 60000);
                        const checkHour = checkTime.getHours().toString().padStart(2, '0');
                        const checkMinute = checkTime.getMinutes().toString().padStart(2, '0');
                        const timeSlot = `${checkHour}:${checkMinute}`;
                        
                        if (bookedSlots.includes(timeSlot)) {
                          hasConflict = true;
                          conflictSlots.push(timeSlot);
                        }
                      }
                      
                      if (hasConflict) {
                        toast.error(`Cannot select this time slot. The booking duration would overlap with existing bookings at: ${conflictSlots.join(', ')}`);
                        return;
                      }
                      
                      // Also check if there are enough consecutive available slots
                      let consecutiveAvailable = true;
                      for (let i = 0; i < duration; i += bookingTimeInterval) {
                        const checkTime = new Date(selectedTime.getTime() + i * 60000);
                        const checkHour = checkTime.getHours().toString().padStart(2, '0');
                        const checkMinute = checkTime.getMinutes().toString().padStart(2, '0');
                        const timeSlot = `${checkHour}:${checkMinute}`;
                        
                        if (!availableTimeSlots.includes(timeSlot) && !bookedSlots.includes(timeSlot)) {
                          consecutiveAvailable = false;
                          break;
                        }
                      }
                      
                      if (!consecutiveAvailable) {
                        toast.error(`Cannot select this time slot. Not enough consecutive available time slots for the ${duration}-minute duration.`);
                        return;
                      }
                      
                      setEditItem(prev => ({
                        ...prev,
                        start_time_hour: hour,
                        start_time_minute: minute
                      }));
                    }}
                  />
                );
              }
            },
            {
              key: "status",
              label: "Status",
              type: hideCustomerSelection ? "text" : "select",
              options: hideCustomerSelection ? [] : [
                { value: "pending", label: "Pending" },
                { value: "confirmed", label: "Confirmed" },
                { value: "cancelled", label: "Cancelled" },
                { value: "completed", label: "Completed" }
              ],
              required: true,
              readOnly: hideCustomerSelection,
              defaultValue: hideCustomerSelection ? "pending" : undefined,
              value: hideCustomerSelection ? "Pending" : undefined
            },
            { 
              key: "notes", 
              label: "Notes", 
              type: "textarea" 
            },
            { 
              key: "show_recurring", 
              text: "Recurring booking", 
              type: "link",
              hidden: !isCreating || hideRecurringOptions,  // Hide if hideRecurringOptions is true
              onClick: () => setShowRecurringOptions(!showRecurringOptions)
            },
            { 
              key: "recurring_type", 
              label: "Recurring Type", 
              type: "select",
              options: recurringOptions,
              hidden: !isCreating || !showRecurringOptions || hideRecurringOptions,  // Hide if hideRecurringOptions is true
              defaultValue: "daily"
            },
            { 
              key: "recurring_count", 
              label: "Number of Occurrences", 
              type: "number",
              min: 2,
              max: 52,
              defaultValue: 2,
              hidden: !isCreating || !showRecurringOptions || hideRecurringOptions  // Hide if hideRecurringOptions is true
            },
          ]}
        />
      </div>
    </div>
  );
}
