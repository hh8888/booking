import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import GenericForm from '../common/GenericForm';
import CustomerSearchSelect from '../common/CustomerSearchSelect';
import CreateUserPopup from '../common/CreateUserPopup';
import DatabaseService from '../../services/DatabaseService';
import DateTimeFormatter from '../../utils/DateTimeFormatter';
import BookingService from '../../services/BookingService';
import StaffAvailabilityService from '../../services/StaffAvailabilityService';
import LocationService from '../../services/LocationService';
import ServiceStaffService from '../../services/ServiceStaffService';
import TimeSlots from './TimeSlots';
import { BOOKING_STATUS, USER_ROLES, TABLES, ERROR_MESSAGES } from '../../constants';
import { useLanguage } from '../../contexts/LanguageContext';
import useDashboardUser from '../../hooks/useDashboardUser';


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
  const { t } = useLanguage();
  const { user: currentUser } = useDashboardUser();
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [providers, setProviders] = useState([]);
  const [hourOptions, setHourOptions] = useState([]);
  const [minuteOptions, setMinuteOptions] = useState([]);
  const [showRecurringOptions, setShowRecurringOptions] = useState(false);
  const [bookingTimeInterval, setBookingTimeInterval] = useState(5);
  const [businessHours, setBusinessHours] = useState(null);
  const [selectedProviderAvailability, setSelectedProviderAvailability] = useState([]);
  const [recurringOptions] = useState([
    { value: 'daily', label: t('bookings.repeatDaily') },
    { value: 'weekly', label: t('bookings.repeatWeekly') }
  ]);

  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [allTimeSlots, setAllTimeSlots] = useState([]);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);

  // Check if current user can edit staff comments
  const canEditStaffComments = currentUser && (
    currentUser.role === USER_ROLES.STAFF || 
    currentUser.role === USER_ROLES.MANAGER || 
    currentUser.role === USER_ROLES.ADMIN
  );

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
          
          // Get the selected service to check if it has staff_id
          const selectedService = services.find(service => service.id === editItem?.service_id);
          const serviceHasStaff = selectedService?.staff_id;
          
          // Use the location from editItem instead of LocationService
          const locationId = editItem.location || LocationService.getInstance().getSelectedLocationId();
          
          const startDate = new Date(editItem.start_date);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(editItem.start_date);
          endDate.setHours(23, 59, 59, 999);

          // Debug logging
          console.log('Fetching slots for:', {
            provider_id: editItem.provider_id,
            start_date: editItem.start_date,
            locationId: locationId,
            editItemLocation: editItem.location,
            hourOptions: hourOptions,
            minuteOptions: minuteOptions,
            serviceHasStaff: serviceHasStaff
          });

          // 获取该提供者在所选日期的所有预约 - also filter by location
          const bookingFilters = {
            provider_id: editItem.provider_id,
            start_time: { gte: startDate.toISOString(), lte: endDate.toISOString() }
          };
          
          // Add location filter for bookings too
          if (locationId !== null) {
            bookingFilters.location = locationId;
          }
          
          // Also try fetching ALL bookings for this provider without date/location filters for comparison
          const allProviderBookings = await dbService.fetchData(TABLES.BOOKINGS, 'start_time', false, { provider_id: editItem.provider_id });
          
          const existingBookings = await dbService.fetchData(TABLES.BOOKINGS, 'start_time', false, bookingFilters);

          // Filter out the current booking being edited
          const filteredBookings = existingBookings.filter(booking => {
            if (!isCreating && editItem && booking.id === editItem.id) {
              return false;
            }
            // Exclude cancelled bookings from conflict checking
            if (booking.status === BOOKING_STATUS.CANCELLED) {
              return false;
            }
            return true;
          });
          
          console.log('Existing bookings:', existingBookings);
          console.log('Filtered bookings (excluding current):', filteredBookings);

          // 获取服务提供者在该日期的可用时间 - now with location filter
          const availability = await staffAvailabilityService.getStaffAvailability(editItem.provider_id, locationId);
          const dayAvailability = availability.filter(slot => slot.date === editItem.start_date && slot.is_available);

          console.log('Day availability:', {
            availability,
            dayAvailability,
            locationId
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
                
                // Calculate the end time for this slot based on service duration
                console.log('EditItem:', editItem);
                console.log('EditItem duration:', editItem?.duration);
                const serviceDuration = parseInt(editItem?.duration) || 30; // Ensure correct duration
                console.log('Using service duration (minutes):', serviceDuration);
                const slotEndTime = new Date(slotTime.getTime() + serviceDuration * 60000);
                console.log(`Slot ${hour}:${minute} - Start: ${slotTime.toLocaleTimeString()}, End: ${slotEndTime.toLocaleTimeString()}`);
              
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
                  // Only check if the slot starts within business hours
                  return slotTime >= availStart && slotTime < availEnd;
                });

                // 检查时间槽是否被占用 - improved conflict detection
                // Only check for conflicts if the service has staff_id
                const isSlotBooked = serviceHasStaff ? filteredBookings.some(booking => {
                  // Exclude cancelled bookings from blocking time slots
                  if (booking.status === BOOKING_STATUS.CANCELLED) {
                    return false;
                  }
                  
                  const bookingStart = new Date(booking.start_time);
                  const bookingEnd = new Date(booking.end_time);
                  
                  // More explicit overlap check
                  const slotStartTime = slotTime.getTime();
                  const slotEndTimeMs = slotEndTime.getTime();
                  const bookingStartTime = bookingStart.getTime();
                  const bookingEndTime = bookingEnd.getTime();
                  
                  // Check for any overlap: slot starts before booking ends AND slot ends after booking starts
                  const hasOverlap = slotStartTime < bookingEndTime && slotEndTimeMs > bookingStartTime;
                  
                  console.log(`Checking slot ${hour}:${minute}:`);
                  console.log(`  Slot time: ${new Date(slotStartTime).toLocaleTimeString()} - ${new Date(slotEndTimeMs).toLocaleTimeString()}`);
                  console.log(`  Booking time: ${new Date(bookingStartTime).toLocaleTimeString()} - ${new Date(bookingEndTime).toLocaleTimeString()}`);
                  console.log(`  Has overlap: ${hasOverlap}`);
                  
                  return hasOverlap;
                }) : false; // If no staff_id, never consider slots as booked

                if (isInAvailableHours) {
                  const timeSlot = `${hour}:${minute}`;
                  // Add to allSlots regardless of booking status
                  allSlots.push(timeSlot);
                  
                  // Only check for booking conflicts if service has staff_id
                  if (serviceHasStaff) {
                    // Check if this slot falls within any existing booking duration
                    const isWithinBooking = filteredBookings.some(booking => {
                      const bookingStart = new Date(booking.start_time);
                      const bookingEnd = new Date(booking.end_time);
                      const slotTime = new Date(bookingStart);
                      slotTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
                      
                      // Check if slot time is within the booking period
                      return slotTime >= bookingStart && slotTime < bookingEnd;
                    });
                    
                    if (isWithinBooking) {
                      bookedSlots.push(timeSlot);
                    } else if (isSlotBooked) {
                      // This slot would cause overlap but isn't within an existing booking
                      // Don't add to bookedSlots - let TimeSlots.js handle it as overlap
                    } else {
                      availableSlots.push(timeSlot);
                    }
                  } else {
                    // For services without staff_id, all slots within available hours are available
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
            toast.error(ERROR_MESSAGES.FAILED_FETCH_TIME_SLOTS);
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
    
    }, [editItem?.provider_id, editItem?.start_date, editItem?.location, editItem?.duration, hourOptions.length, minuteOptions.length]); // Remove hourOptions and minuteOptions from dependencies

  const fetchProviderAvailability = async (providerId, locationId = null, days = 30) => {
    // 获取服务提供者未来days天的可用时间，从最近的周一开始
    if (!providerId) return [];
    
    try {
      const service = StaffAvailabilityService.getInstance();
      
      // Use the provided locationId or get the current one
      const currentLocationId = locationId || LocationService.getInstance().getSelectedLocationId();
      
      console.log('Fetching availability for provider:', providerId, 'location:', currentLocationId);
      
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
        endDate,
        currentLocationId
      );

      console.log('Availability Dates:', availabilityData);
      
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
      toast.error(ERROR_MESSAGES.FAILED_FETCH_PROVIDER_AVAILABILITY);
      return [];
    }
  };

  const initData = async () => {
    const fetchProviders = async () => {
      try {
        const dbService = DatabaseService.getInstance();
        const data = await dbService.fetchData(TABLES.USERS, 'created_at', false, { role: { in: [USER_ROLES.STAFF, USER_ROLES.MANAGER] } }, ['id', 'full_name']);
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
        
        // Get current location from LocationService
        const locationService = LocationService.getInstance();
        const currentLocation = locationService.getSelectedLocation();
        
        const defaultBooking = {
          start_date: defaultDate.toLocaleDateString('en-CA'),
          start_time_hour: defaultHour,
          start_time_minute: defaultMinute,
          provider_id: defaultProviderId || '',
          location: currentLocation?.id || null,
          status: BOOKING_STATUS.PENDING
        };
        
        console.log('Default booking object:', defaultBooking); // Debug log
        setEditItem(defaultBooking);
        
        // 触发provider_id的onChange事件
        if (defaultProviderId) {
          setLoadingAvailability(true);
          const currentLocationId = defaultBooking.location || LocationService.getInstance().getSelectedLocationId();
          const availabilityData = await fetchProviderAvailability(defaultProviderId, currentLocationId);
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
          duration: durationInMinutes,
          // Explicitly preserve the location field
          location: booking.location || null
        };
        
        // Debug logging - add this before creating formattedBooking
        console.log('Original booking object:', booking);
        console.log('Booking location field:', booking.location);
        
        console.log('Formatted booking object:', formattedBooking);
        console.log('Formatted booking location:', formattedBooking.location);
        
        // Debug logging
        console.log('Setting editItem for editing:', {
          original: booking,
          formatted: formattedBooking,
          provider_id: formattedBooking.provider_id,
          start_date: formattedBooking.start_date,
          location: formattedBooking.location  // Add this line
        });
        
        setEditItem(formattedBooking);
        
        // 手动触发provider_id的onChange事件
        if (formattedBooking.provider_id) {
          setLoadingAvailability(true);
          const availabilityData = await fetchProviderAvailability(formattedBooking.provider_id, formattedBooking.location);
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
      
      // Get current location from LocationService
      const locationService = LocationService.getInstance();
      const currentLocation = locationService.getSelectedLocation();
      
      const defaultBooking = {
        start_date: defaultDate.toLocaleDateString('en-CA'),
        start_time_hour: defaultHour,
        start_time_minute: defaultMinute,
        provider_id: defaultProviderId || '',
        location: currentLocation?.id || null,
        status: BOOKING_STATUS.PENDING
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
      const data = await dbService.fetchData(TABLES.SERVICES);
      setServices(data);
      setFilteredServices(data); // Initialize filtered services with all services
      return data;
    } catch (error) {
      console.error('Error fetching services:', error);
      return [];
    }
  };

  const fetchCustomers = async () => {
    try {
      const dbService = DatabaseService.getInstance();
      // Use fetchData instead of fetchSpecificColumns for better filtering support
      const data = await dbService.fetchData(TABLES.USERS, 'created_at', false, { role: USER_ROLES.CUSTOMER });
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
      
      // Use the location from the form data instead of the global location service
      const bookingDataWithLocation = {
        ...itemData,
        // Only use global location if form doesn't have a location value
        location: itemData.location !== null && itemData.location !== undefined 
          ? itemData.location 
          : LocationService.getInstance().getSelectedLocationId()
      };
      
      // Construct complete start_time
      const startDate = new Date(bookingDataWithLocation.start_date);
      const hour = parseInt(bookingDataWithLocation.start_time_hour);
      const minute = parseInt(bookingDataWithLocation.start_time_minute);
      
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
      
      // ADD TIME SLOT AVAILABILITY VALIDATION
      // Check if the selected time slot is available
      const selectedTimeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      // Get the selected service to check if it has staff_id
      const selectedService = services.find(service => service.id === bookingDataWithLocation.service_id);
      const serviceHasStaff = selectedService?.staff_id && selectedService.staff_id.trim() !== '';
      
      // Only validate time slots for services with assigned staff
      if (serviceHasStaff) {
        if (availableTimeSlots.length === 0) {
          throw new Error('No time slots are available for the selected date, provider, and location combination. Please choose a different date or provider.');
        }
        
        if (!availableTimeSlots.includes(selectedTimeSlot)) {
          throw new Error(`The selected time ${DateTimeFormatter.getInstance().to12HourFormat(hour.toString().padStart(2, '0'))}:${minute.toString().padStart(2, '0')} is not available. Please select from the available time slots.`);
        }
      }
      
      startDate.setHours(hour, minute, 0, 0);
      const isoStartTime = startDate.toISOString();
      
      // DURATION OVERLAP VALIDATION
      const duration = parseInt(bookingDataWithLocation.duration) || 60;
      const endTime = new Date(startDate.getTime() + duration * 60000);
      
      // Check if the booking would extend beyond working hours
      const staffAvailabilityService = StaffAvailabilityService.getInstance();
      const availability = await staffAvailabilityService.getStaffAvailability(bookingDataWithLocation.provider_id);
      const dayAvailability = availability.filter(slot => 
        slot.date === bookingDataWithLocation.start_date && slot.is_available
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
      const bookingFilters = {
        provider_id: bookingDataWithLocation.provider_id,
        start_time: { gte: startDate.toISOString().split('T')[0] + 'T00:00:00.000Z', 
                     lte: startDate.toISOString().split('T')[0] + 'T23:59:59.999Z' }
      };
      
      // Add location filter if available
      if (bookingDataWithLocation.location !== null && bookingDataWithLocation.location !== undefined) {
        bookingFilters.location = bookingDataWithLocation.location;
      }
      
      const existingBookings = await dbService.fetchData(TABLES.BOOKINGS, 'start_time', false, bookingFilters);
      
      // Add debug logging
      console.log('Debug - selectedService:', selectedService);
      console.log('Debug - staff_id value:', selectedService?.staff_id);
      console.log('Debug - staff_id type:', typeof selectedService?.staff_id);
      console.log('Debug - staff_id trimmed:', selectedService?.staff_id?.trim?.());
      
      // Only check for overlaps if the service has assigned staff
      if (selectedService && selectedService.staff_id && selectedService.staff_id.trim() !== '') {
        console.log('Debug - Entering conflict validation (service has staff)');
        console.log('Debug - isCreating:', isCreating);
        console.log('Debug - editItem.id:', editItem?.id);
        console.log('Debug - existingBookings before filter:', existingBookings.map(b => ({ id: b.id, start_time: b.start_time, end_time: b.end_time })));
        
        // Filter out the current booking being edited
        const filteredBookings = existingBookings.filter(booking => {
          console.log('Debug - Checking booking:', booking.id, 'vs editItem.id:', editItem?.id, 'equal?', booking.id === editItem?.id);
          if (!isCreating && editItem && booking.id === editItem.id) {
            console.log('Debug - Filtering out current booking:', booking.id);
            return false;
          }
          // Exclude cancelled bookings from conflict checking
          if (booking.status === BOOKING_STATUS.CANCELLED) {
            console.log('Debug - Filtering out cancelled booking:', booking.id);
            return false;
          }
          return true;
        });
        
        console.log('Debug - filteredBookings after filter:', filteredBookings.map(b => ({ id: b.id, start_time: b.start_time, end_time: b.end_time })));
        
        // Check for time overlap with existing bookings
        for (const booking of filteredBookings) {
          const bookingStart = new Date(booking.start_time);
          const bookingEnd = new Date(booking.end_time);
          
          console.log('Debug - Checking overlap with booking:', booking.id, 'from', bookingStart, 'to', bookingEnd);
          console.log('Debug - New booking time:', startDate, 'to', endTime);
          
          // Check if there's any overlap
          if ((startDate < bookingEnd && endTime > bookingStart)) {
            // Get the service for the conflicting booking to check if it allows double-booking
            const conflictingBookingService = services.find(service => service.id === booking.service_id);
            console.log('Debug - Conflicting booking service:', conflictingBookingService);
            console.log('Debug - Conflicting booking staff_id:', conflictingBookingService?.staff_id);
            
            // If the conflicting booking's service has no staff_id (allows double-booking), skip this conflict
            if (!conflictingBookingService?.staff_id || conflictingBookingService.staff_id.trim() === '') {
              console.log('Debug - Conflicting booking allows double-booking, skipping conflict');
              continue;
            }
            
            console.log('Debug - CONFLICT DETECTED with booking:', booking.id);
            const conflictTime = DateTimeFormatter.getInstance().formatDateTime(bookingStart);
            throw new Error(`The booking duration would conflict with an existing booking at ${conflictTime}. Please select a different time or reduce the duration.`);
          }
        }
        
        console.log('Debug - No conflicts found');
      } else {
        console.log('Debug - Skipping conflict validation (service has no staff or staff_id is empty)');
      }
      // If service has no assigned staff (staff_id is null), skip overlap validation entirely
      
      // END DURATION OVERLAP VALIDATION
      
      let updatedData;
      if (isCreating) {
        const { start_date, start_time_hour, start_time_minute, ...restData } = bookingDataWithLocation;
        updatedData = {
          ...restData,
          start_time: isoStartTime,
          status: restData.status || BOOKING_STATUS.PENDING
        };
      } else {
        const { start_date, start_time_hour, start_time_minute, ...restData } = bookingDataWithLocation;
        updatedData = {
          ...editItem,
          ...restData,
          start_time: isoStartTime
        };
      }
      
      // Remove extra display fields
      const { service_name, customer_name, provider_name,start_date,start_time_hour,start_time_minute, booking_time_formatted, created_at_formatted, show_recurring, start_datetime, availabledays, timeslots, ...restDataToSave } = updatedData;
      
      // Create a copy of the data to save
      const dataToSave = { ...restDataToSave };
      
      // DEBUG: Log the data before any processing
      console.log('=== DEBUG: Data before processing ===');
      console.log('restDataToSave:', restDataToSave);
      console.log('editItem:', editItem);
      console.log('bookingDataWithLocation:', bookingDataWithLocation);
      
      // Ensure numeric fields are properly converted from strings
      dataToSave.recurring_count = parseInt(dataToSave.recurring_count) || 0;
      dataToSave.duration = parseInt(dataToSave.duration) || 60;
     
      
      // Handle location field
      if (dataToSave.location !== null && dataToSave.location !== undefined) {
        dataToSave.location = parseInt(dataToSave.location);
      }
      
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
          // Ensure recurring_count is a number and handle empty strings
          dataToSave.recurring_count = parseInt(dataToSave.recurring_count) || 0;
          // Set default recurring_type if not selected
          dataToSave.recurring_type = dataToSave.recurring_type || '';
          
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
          }
          return; // This prevents the final onSave call
        } else {
          dataToSave.recurring_type = null;
          dataToSave.recurring_count = 0;
        }
      } else {
        // For editing existing bookings, ensure recurring_count is always a number
        dataToSave.recurring_count = parseInt(dataToSave.recurring_count) || 0;
      }

      // DEBUG: Log final dataToSave before validation
      console.log('=== DEBUG: Final dataToSave before validation ===');
      console.log('dataToSave:', dataToSave);
      console.log('provider_id:', dataToSave.provider_id, 'type:', typeof dataToSave.provider_id);
      console.log('customer_id:', dataToSave.customer_id, 'type:', typeof dataToSave.customer_id);
      console.log('service_id:', dataToSave.service_id, 'type:', typeof dataToSave.service_id);
      console.log('isCreating:', isCreating);
      console.log('hideCustomerSelection:', hideCustomerSelection);

      // Validate required fields
      if (!hideCustomerSelection && (!dataToSave.customer_id || dataToSave.customer_id === '')) {
        console.log('=== DEBUG: Customer validation failed ===');
        toast.error(ERROR_MESSAGES.INVALID_CUSTOMER);
        return;
      }

      if (!dataToSave.provider_id || dataToSave.provider_id === '') {
        console.log('=== DEBUG: Provider validation failed ===');
        console.log('!dataToSave.provider_id:', !dataToSave.provider_id);
        console.log('dataToSave.provider_id === "":', dataToSave.provider_id === '');
        toast.error(ERROR_MESSAGES.INVALID_PROVIDER);
        return;
      }
      
      // Calculate end_time based on duration input
      const durationInMinutes = parseInt(dataToSave.duration) || 60;
      const endTime2 = new Date(startDate.getTime() + durationInMinutes * 60000);
      dataToSave.end_time = endTime2.toISOString();
      dataToSave.duration = durationInMinutes;

      // Call the parent onSave handler (this should only execute for non-recurring bookings or edits)
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

  // Add this useEffect near the other useEffect hooks
  useEffect(() => {
    console.log('showCreateUserForm state changed:', showCreateUserForm);
  }, [showCreateUserForm]);

  // Function to handle when a new user is created
  const handleUserCreated = async (newUser) => {
    // Refresh customers list
    await fetchCustomers();
    
    // Auto-select the newly created user
    setEditItem(prev => ({
      ...prev,
      customer_id: newUser.id
    }));
  };

  // Add this useEffect to ensure customer_id is set when hideCustomerSelection is true
  useEffect(() => {
    if (hideCustomerSelection && editItem && !editItem.customer_id) {
      // If customer_id is not set but we're hiding customer selection,
      // it should have been passed in the editItem prop from CustomerBooking
      console.log('Setting customer_id from editItem:', editItem);
    }
  }, [hideCustomerSelection, editItem]);
  
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <GenericForm
          data={editItem}
          onSave={handleSave}
          onCancel={onCancel}
          title={isCreating ? t('editBooking.createNewBooking') : t('editBooking.editBooking')}
          loading={loading}
          loadingAvailability={loadingAvailability}
          fields={[
            { 
              key: "customer_id", 
              label: t('editBooking.customer'), 
              type: "custom",
              required: !hideCustomerSelection,
              hidden: hideCustomerSelection,
              renderField: () => !hideCustomerSelection ? (
                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <CustomerSearchSelect
                      customers={customers}
                      value={editItem?.customer_id}
                      onChange={(value) => {
                        setEditItem(prev => ({
                          ...prev,
                          customer_id: value
                        }));
                      }}
                      placeholder={t('editBooking.selectCustomer')}
                      required={!hideCustomerSelection}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Create user button clicked'); // Add this line
                      setShowCreateUserForm(true);
                    }}
                    className="bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 whitespace-nowrap"
                    title={t('users.addNewUser')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                </div>
              ) : null
            },
            {
              key: "location",
              label: t('editBooking.location'),
              type: "select",
              options: (() => {
                const locationService = LocationService.getInstance();
                const locations = locationService.getLocations();
                return locations.map(location => ({
                  value: location.id,
                  label: location.name
                }));
              })(),
              required: true,
              placeholder: t('editBooking.selectLocation'),
              hidden: isCreating, // Hide when creating new bookings
              defaultValue: (() => {
                // If editing an existing booking and it has a location, use it
                if (!isCreating && booking && booking.location !== null && booking.location !== undefined) {
                  return booking.location;
                }
                // Otherwise, use the current selected location (for new bookings or bookings without location)
                const locationService = LocationService.getInstance();
                const currentLocation = locationService.getSelectedLocation();
                return currentLocation?.id || null;
              })(),
              onChange: async (value) => {
                setEditItem(prev => ({
                  ...prev,
                  location: parseInt(value)
                }));
                
                // Reset time slots when location changes
                setAvailableTimeSlots([]);
                setAllTimeSlots([]);
                setBookedSlots([]);
                
                // Reload date availability when location changes
                if (editItem?.provider_id) {
                  setLoadingAvailability(true);
                  try {
                    console.log('Location changed, reloading availability for provider:', editItem.provider_id, 'location:', value);
                    const availabilityData = await fetchProviderAvailability(editItem.provider_id, parseInt(value));
                    setSelectedProviderAvailability(availabilityData);
                    
                    // The useEffect will automatically handle time slot reloading when editItem.location changes
                  } catch (error) {
                    console.error('Error reloading availability:', error);
                    toast.error(t('editBooking.failedToReloadAvailability'));
                  } finally {
                    setLoadingAvailability(false);
                  }
                }
              }
            },
            { 
              key: "provider_id", 
              label: t('editBooking.provider'), 
              type: "select",
              options: providers.map(provider => ({
                value: provider.id,
                label: provider.full_name
              })),
              required: true,
              placeholder: t('editBooking.selectProvider'),
              onChange: async (value) => {
                console.log('Provider selected:', value);
                if (value) {
                  setLoadingAvailability(true);
                  
                  try {
                    // Fetch provider availability with current location
                    const currentLocationId = editItem?.location || LocationService.getInstance().getSelectedLocationId();
                    const availabilityData = await fetchProviderAvailability(value, currentLocationId);
                    setSelectedProviderAvailability(availabilityData);
                    
                    // Fetch services linked to this provider from service_staff table
                    const serviceStaffService = ServiceStaffService.getInstance();
                    console.log('Fetching services for provider:', value);
                    const providerServiceIds = await serviceStaffService.getStaffServices(value);
                    console.log('Provider service IDs:', providerServiceIds);
                    console.log('All services:', services.map(s => ({ id: s.id, name: s.name, staff_id: s.staff_id })));
                    
                    // Filter services based on:
                    // 1. Services with no staff_id (null or empty) - available to all providers
                    // 2. Services specifically linked to this provider via service_staff table
                    const availableServices = services.filter(service => {
                      // Include services with no staff_id (general services)
                      const hasNoStaffId = !service.staff_id || service.staff_id.trim() === '';
                      // Include services linked to this provider
                      const isLinkedToProvider = providerServiceIds.includes(service.id);
                      
                      return hasNoStaffId || isLinkedToProvider;
                    });
                    
                    console.log('Available services for provider:', availableServices.map(s => ({ id: s.id, name: s.name, staff_id: s.staff_id })));
                    setFilteredServices(availableServices);
                    
                    // Clear service selection if current service is not available for this provider
                    if (editItem?.service_id) {
                      const isCurrentServiceAvailable = availableServices.some(service => service.id === editItem.service_id);
                      if (!isCurrentServiceAvailable) {
                        console.log('Clearing service selection - current service not available for provider');
                        setEditItem(prev => ({
                          ...prev,
                          provider_id: value,
                          service_id: null // Clear service selection
                        }));
                      } else {
                        console.log('Keeping current service selection');
                        setEditItem(prev => ({
                          ...prev,
                          provider_id: value
                        }));
                      }
                    } else {
                      setEditItem(prev => ({
                        ...prev,
                        provider_id: value
                      }));
                    }
                  } catch (error) {
                    console.error('Error fetching provider services:', error);
                    toast.error('Failed to load services for selected provider');
                    setFilteredServices([]);
                  } finally {
                    setLoadingAvailability(false);
                  }
                } else {
                  console.log('No provider selected - showing all services');
                  setSelectedProviderAvailability([]);
                  setFilteredServices(services); // Show all services when no provider selected
                }
              }
            },
            { 
              key: "service_id", 
              label: t('editBooking.service'), 
              type: "select",
              options: (filteredServices.length > 0 ? filteredServices : services)
                .sort((a, b) => {
                  // Check if service names start with "-" or "_"
                  const aStartsWithSpecial = a.name.startsWith('-') || a.name.startsWith('_');
                  const bStartsWithSpecial = b.name.startsWith('-') || b.name.startsWith('_');
                  
                  // If one starts with special character and the other doesn't
                  if (aStartsWithSpecial && !bStartsWithSpecial) {
                    return 1; // a comes after b
                  }
                  if (!aStartsWithSpecial && bStartsWithSpecial) {
                    return -1; // a comes before b
                  }
                  
                  // Both are special or both are normal, sort alphabetically
                  return a.name.localeCompare(b.name);
                })
                .map(service => ({
                  value: service.id,
                  label: service.name
                })),
              required: isCreating,
              placeholder: t('editBooking.selectService'),
              onChange: (value) => {
                if (value) {
                  // Use filteredServices if available, otherwise fall back to services
                  const serviceList = filteredServices.length > 0 ? filteredServices : services;
                  const selectedService = serviceList.find(service => service.id === value);
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
              label: t('editBooking.durationMinutes'),
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
              key: "availabledays",
              type: "custom",
              renderField: () => (
                <div className="bg-gray-50 rounded-md">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">{t('editBooking.dateAvailability')}</h3>
              {/* Day of week headers */}
              <div className="grid grid-cols-7 gap-2 mb-1">
                {[t('editBooking.mon'), t('editBooking.tue'), t('editBooking.wed'), t('editBooking.thu'), t('editBooking.fri'), t('editBooking.sat'), t('editBooking.sun')].map(day => (
                  <div key={day} className="text-xs text-gray-500 text-center py-1 font-medium">
                    {day}
                  </div>
                ))}
              </div>
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
              key: "start_date",
              label: t('editBooking.dateTime'),
              type: "date",
              required: true
            },
            { 
              inline: true,
              key: "start_datetime",
              fields: [
                { 
                  key: "start_time_hour", 
                  label: t('editBooking.hour'), 
                  type: "select",
                  required: true,
                  options: hourOptions.map(hour => ({
                    value: hour,
                    label: DateTimeFormatter.getInstance().to12HourFormat(hour)
                  })),
                  placeholder: t('editBooking.selectHour'),
                  onChange: (value) => {
                    setEditItem(prev => ({
                      ...prev,
                      start_time_hour: value
                    }));
                  }
                },
                { 
                  key: "start_time_minute", 
                  label: t('editBooking.minute'), 
                  type: "select",
                  required: true,
                  options: minuteOptions.map(minute => ({
                    value: minute,
                    label: minute
                  })),
                  placeholder: t('editBooking.selectMinute'),
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
                      // Get the selected service to check if it has staff_id
                      const selectedService = services.find(service => service.id === editItem?.service_id);
                      
                      // If service has no staff_id (empty/null), bypass all conflict detection
                      if (!selectedService?.staff_id || selectedService.staff_id.trim() === '') {
                        setEditItem(prev => ({
                          ...prev,
                          start_time_hour: hour,
                          start_time_minute: minute
                        }));
                        return;
                      }
                      
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
                        toast.error(t('editBooking.overlapDetected') + `: ${conflictSlots.join(', ')}`);
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
              label: t('editBooking.status'),
              type: "select",
              options: [
                { value: BOOKING_STATUS.PENDING, label: t('editBooking.pending') },
                { value: BOOKING_STATUS.CONFIRMED, label: t('editBooking.confirmed') },
                { value: BOOKING_STATUS.CANCELLED, label: t('editBooking.cancelled') },
                { value: BOOKING_STATUS.COMPLETED, label: t('editBooking.completed') }
              ],
              required: true,
              hidden: hideCustomerSelection,
              defaultValue: hideCustomerSelection ? BOOKING_STATUS.PENDING : undefined
            },
            { 
              key: "notes", 
              label: t('bookings.customerNotes'), 
              type: "textarea",
              placeholder: t('bookings.customerNotesPlaceholder'),
              rows: 3
            },
            ...(canEditStaffComments ? [{
              key: "staff_comments",
              label: t('bookings.staffComments'),
              type: "textarea",
              placeholder: t('bookings.staffCommentsPlaceholder'),
              rows: 3,
              helpText: t('bookings.staffCommentsHelp')
            }] : []),
            ...(canEditStaffComments ? [{
              key: "staff_comments",
              label: t('bookings.staffComments'),
              type: "textarea",
              placeholder: t('bookings.staffCommentsPlaceholder'),
              rows: 3,
              helpText: t('bookings.staffCommentsHelp')
            }] : []),
            { 
              key: "show_recurring", 
              text: t('editBooking.recurringBooking'), 
              type: "link",
              hidden: !isCreating || hideRecurringOptions,  // Hide if hideRecurringOptions is true
              onClick: () => setShowRecurringOptions(!showRecurringOptions)
            },
            { 
              key: "recurring_type", 
              label: t('editBooking.recurringType'), 
              type: "select",
              options: recurringOptions,
              hidden: !isCreating || !showRecurringOptions || hideRecurringOptions,  // Hide if hideRecurringOptions is true
              defaultValue: "daily"
            },
            { 
              key: "recurring_count", 
              label: t('editBooking.numberOfOccurrences'), 
              type: "number",
              min: 2,
              max: 52,
              defaultValue: 0,
              hidden: !isCreating || !showRecurringOptions || hideRecurringOptions  // Hide if hideRecurringOptions is true
            },
          ]}
        />
        </div>
      </div>
      
      {/* Create User Form Modal */}
      {showCreateUserForm && (
        <CreateUserPopup
          onClose={() => setShowCreateUserForm(false)}
          onUserCreated={handleUserCreated}
        />
      )}
    </>
  );
}
