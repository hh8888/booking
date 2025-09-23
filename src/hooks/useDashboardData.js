import { useState, useEffect, useCallback } from 'react';
import DatabaseService from '../services/DatabaseService';
import { TABLES } from '../constants';
import LocationService from '../services/LocationService';
import StaffAvailabilityService from '../services/StaffAvailabilityService';
import ServiceStaffService from '../services/ServiceStaffService';
import { toast } from 'react-toastify';
import { supabase } from '../supabaseClient';
import { handleBookingRealtimeToast } from '../utils/realtimeBookingToastUtils';
import { useLanguage } from '../contexts/LanguageContext';
import { useMultilingualToast } from '../utils/multilingualToastUtils';
import { userHasLocation } from '../utils/userUtils';
import DateTimeFormatter from '../utils/DateTimeFormatter';

// Helper function to format time strings
const formatTime = (timeString) => {
  if (!timeString) return '00:00:00';
  
  // If time already includes seconds, return as is
  if (timeString.includes(':') && timeString.split(':').length === 3) {
    return timeString;
  }
  
  // If time is in HH:mm format, add seconds
  if (timeString.includes(':') && timeString.split(':').length === 2) {
    return `${timeString}:00`;
  }
  
  // If time is just a number or other format, try to parse it
  return `${timeString}:00`;
};

export const useDashboardData = (stackAvailability = false) => {
  const [loading, setLoading] = useState(true);
  const [tableStats, setTableStats] = useState({
    users: 0,
    services: 0,
    bookings: 0,
    todayBookings: 0,
    tomorrowBookings: 0,
    futureBookings: 0,
    pastBookings: 0
  });
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staffColors, setStaffColors] = useState({});
  const [currentLocation, setCurrentLocation] = useState(null);
  const [businessHours, setBusinessHours] = useState(null);

  // Move hook calls to top level
  const { t } = useLanguage();
  const { handleBookingRealtimeToast, showErrorToast } = useMultilingualToast(t);

  const fetchTableStats = useCallback(async () => {
    try {
      const dbService = DatabaseService.getInstance();
      const locationService = LocationService.getInstance();
      const currentLocationId = locationService.getSelectedLocationId();
      
      const [usersCount, servicesCount, bookings] = await Promise.all([
        dbService.getCount(TABLES.USERS),
        dbService.getCount(TABLES.SERVICES),
        // Filter bookings by current location
        currentLocationId 
          ? dbService.fetchData(TABLES.BOOKINGS, 'created_at', false, { location: currentLocationId })
          : dbService.fetchData(TABLES.BOOKINGS)
      ]);
  
      // Add debugging
      console.log('📊 Dashboard Stats Debug:');
      console.log('Total bookings fetched:', bookings.length);
      console.log('Bookings data:', bookings.map(b => ({ id: b.id, start_time: b.start_time, location: b.location })));
      
      const now = new Date();
      
      // Get current date components in local timezone (Sydney)
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const currentDate = now.getDate();
      
      // Create today's start and end times in local timezone
      const todayStart = new Date(currentYear, currentMonth, currentDate, 0, 0, 0, 0);
      const todayEnd = new Date(currentYear, currentMonth, currentDate, 23, 59, 59, 999);
      
      console.log('🕐 Current time (Sydney):', now.toISOString());
      console.log('🕐 Today start (Sydney):', todayStart.toISOString());
      console.log('🕐 Today end (Sydney):', todayEnd.toISOString());
      
      const todayBookingsArray = bookings.filter(booking => {
        const bookingDate = new Date(booking.start_time);
        // Check if booking falls within today's local time range
        const isToday = bookingDate >= todayStart && bookingDate <= todayEnd;
        if (isToday) {
          console.log(`✅ TODAY Booking ${booking.id}: ${booking.start_time}`);
        }
        return isToday;
      });
      
      const todayBookings = todayBookingsArray.length;
      
      console.log('📊 Today\'s bookings (Sydney timezone):');
      todayBookingsArray.forEach((booking, index) => {
        const bookingTime = new Date(booking.start_time).toLocaleTimeString('en-AU', {
          timeZone: 'Australia/Sydney',
          hour12: false
        });
        const statusIcon = booking.status === 'cancelled' ? '❌' : '✅';
        const userName = booking.customer_name || booking.user_name || 'Unknown';
        console.log(`  ${index + 1}. ${statusIcon} ${bookingTime} - ${userName} (${booking.status})`);
      });
      
      console.log(`📊 Today bookings count: ${todayBookings}`);
      
      const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);

      const tomorrowBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.start_time);
        const isTomorrow = bookingDate >= tomorrowStart && bookingDate <= tomorrowEnd;
        return isTomorrow;
      }).length;

      console.log(`📊 Tomorrow bookings count: ${tomorrowBookings}`);
  
      // Future bookings now means after tomorrow
      const afterTomorrowStart = new Date(tomorrowEnd);
      afterTomorrowStart.setMilliseconds(afterTomorrowStart.getMilliseconds() + 1);
      
      const futureBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.start_time);
        const isFuture = bookingDate > afterTomorrowStart;
        // console.log(`Booking ${booking.id}: ${booking.start_time} -> ${bookingDate.toISOString()} -> Future: ${isFuture}`);
        return isFuture;
      }).length;
  
      const pastBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.start_time);
        const isPast = bookingDate < now;
        // console.log(`Booking ${booking.id}: ${booking.start_time} -> ${bookingDate.toISOString()} -> Past: ${isPast}`);
        return isPast;
      }).length;
      
      console.log('Final counts:');
      console.log('Today bookings:', todayBookings);
      console.log('Future bookings:', futureBookings);
      console.log('Past bookings:', pastBookings);
  
      setTableStats({
        users: usersCount,
        services: servicesCount,
        bookings: bookings.length,
        todayBookings,
        tomorrowBookings,
        futureBookings,
        pastBookings
      });
    } catch (error) {
      console.error('Error fetching table stats:', error);
      toast.error('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const serviceStaffService = ServiceStaffService.getInstance();
      const data = await serviceStaffService.getAllServicesWithStaff();
      setServices(data);
      return data;
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to fetch services');
      return [];
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const dbService = DatabaseService.getInstance();
      const data = await dbService.fetchSpecificColumns(TABLES.USERS, 'id, full_name,email,phone_number', { role: 'customer' });
      setCustomers(data);
      return data;
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to fetch customers');
      return [];
    }
  }, []);

  // Add the missing fetchBusinessHours function
  const fetchBusinessHours = useCallback(async () => {
    try {
      const dbService = DatabaseService.getInstance();
      const businessHoursValue = await dbService.getSettingsByKey('system', 'businessHours');
      
      // Parse the business hours string into an object
      if (businessHoursValue && typeof businessHoursValue === 'string') {
        const [startTime, endTime] = businessHoursValue.split('-');
        if (startTime && endTime) {
          const parsedBusinessHours = {
            startTime: startTime.trim(),
            endTime: endTime.trim()
          };
          setBusinessHours(parsedBusinessHours);
          return parsedBusinessHours;
        }
      }
      
      // Fallback to default business hours if parsing fails
      const defaultBusinessHours = {
        startTime: '09:00',
        endTime: '17:00'
      };
      setBusinessHours(defaultBusinessHours);
      return defaultBusinessHours;
    } catch (error) {
      console.error('Error fetching business hours:', error);
      toast.error('Failed to fetch business hours');
      
      // Return default business hours on error
      const defaultBusinessHours = {
        startTime: '09:00',
        endTime: '17:00'
      };
      setBusinessHours(defaultBusinessHours);
      return defaultBusinessHours;
    }
  }, []);

  // Add staffData to state
  const [staffData, setStaffData] = useState([]);

  const fetchBookingsWithStaff = useCallback(async (customersData, includePastBookings = false) => {
    try {
      const dbService = DatabaseService.getInstance();
      const locationService = LocationService.getInstance();
      const currentLocationId = locationService.getSelectedLocationId();
      
      // Prepare booking filter based on includePastBookings flag
      let bookingFilter = currentLocationId ? { location: currentLocationId } : {};
      
      if (!includePastBookings) {
        // Exclude bookings before yesterday (keep today's and future bookings)
        const filterDate = DateTimeFormatter.getYesterdayStart();
        // console.log('🔍 Past booking filter - Yesterday start:', filterDate);
        // console.log('🔍 Current date for reference:', new Date().toISOString());
        bookingFilter.start_time = { gte: filterDate };
        // console.log('🔍 Applied booking filter:', JSON.stringify(bookingFilter, null, 2));
      }

      const [bookingsData, staffDataResult, servicesData, showStaffNameSetting, fetchedCustomersData] = await Promise.all([
        // Filter bookings by current location and optionally exclude past bookings
        dbService.fetchData(TABLES.BOOKINGS, 'created_at', false, bookingFilter),
        dbService.fetchData(TABLES.USERS, 'created_at', false, { role: { in: ['staff', 'manager'] } }, ['id', 'full_name', 'locations']),
        dbService.fetchData(TABLES.SERVICES),
        dbService.getSettingsByKey('booking', 'showStaffName'),
        // Fetch customers data if not provided
        customersData || dbService.fetchData(TABLES.USERS, 'created_at', false, { role: 'customer' }, ['id', 'full_name'])
      ]);
  
      // console.log('Bookings filtered by location:', currentLocationId, bookingsData.length);
  
      // Use the provided customersData or the fetched one
      const actualCustomersData = customersData || fetchedCustomersData;
  
      // Filter staff data by location using the same logic as fetchStaffAvailability
      const filteredStaffData = currentLocationId 
        ? staffDataResult.filter(staff => userHasLocation(staff, currentLocationId))
        : staffDataResult;
  
      // Set the filtered staff data
      setStaffData(filteredStaffData);
  
      // Predefined color array
      const predefinedColors = [
        '#4C7F50', // Green
        '#2196F3', // Blue
        '#9C27B0', // Purple
        '#FF9800', // Orange
        '#E91E63', // Pink
        '#00BCD4', // Cyan
        '#FF5722', // Deep Orange
        '#3F51B5', // Indigo
        '#009688', // Teal
        '#FFC107'  // Amber
      ];
  
      // Assign fixed colors for each staff member
      const colors = {};
      staffDataResult.forEach((staff, index) => {
        colors[staff.id] = predefinedColors[index % predefinedColors.length];
      });
      setStaffColors(colors);
  
      // Convert booking data to calendar event format
      const calendarEvents = bookingsData.map(booking => {
        const service = booking.service_id ? servicesData.find(s => s.id === booking.service_id) : null;
        const staff = booking.provider_id ? staffDataResult.find(s => s.id === booking.provider_id) : null;
        const staffName = staff?.full_name || (booking.provider_id ? 'Unknown Staff' : 'No Staff Assigned');
        const customer = actualCustomersData.find(c => c.id === booking.customer_id);
        const customerName = customer?.full_name || 'Unknown';
        
        const showStaffName = showStaffNameSetting === 'true';
        const title = showStaffName ? `${service?.name || 'Appointment'}-${staffName}` : service?.name || 'Appointment';
  
        // Add validation for start_time and end_time
        if (!booking.start_time || !booking.end_time) {
          console.warn('Invalid booking dates found:', {
            bookingId: booking.id,
            start_time: booking.start_time,
            end_time: booking.end_time
          });
          return null; // Skip this booking
        }
  
        // Validate that dates can be properly parsed
        const startDate = new Date(booking.start_time);
        const endDate = new Date(booking.end_time);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.warn('Invalid date objects created for booking:', {
            bookingId: booking.id,
            start_time: booking.start_time,
            end_time: booking.end_time,
            startDate,
            endDate
          });
          return null; // Skip this booking
        }
  
        // Define colors based on booking status
        const getStatusColor = (status) => {
          switch (status) {
            case 'pending':
              return '#fff3cd'; // light yellow
            case 'confirmed':
              return '#d4edda'; // light green
            case 'completed':
              return '#cce5ff'; // blue
            case 'cancelled':
              return '#e2e3e5'; // light gray
            default:
              return colors[booking.provider_id] || '#666'; // fallback to staff color
          }
        };
  
        const statusColor = getStatusColor(booking.status);
        
        // Check if service has no staff_id for special styling
        const hasNoStaffId = !service?.staff_id || service.staff_id === null || service.staff_id.trim() === '';
        const borderStyle = hasNoStaffId ? '2px dashed #dc2626' : '#1e40af'; // Red dashed border for no staff, blue solid for others
  
        return ({
          id: booking.id,
          title: title,
          start: booking.start_time,
          end: booking.end_time,
          backgroundColor: statusColor,
          borderColor: borderStyle,
          // Add tooltip content to the title attribute for built-in tooltips
          tooltip: `Service: ${service?.name || 'Appointment'}\nCustomer: ${customerName}\nStaff: ${staffName}\nTime: ${startDate.toLocaleString()} - ${endDate.toLocaleString()}\nStatus: ${booking.status || 'pending'}${booking.notes ? '\nNotes: ' + booking.notes : ''}`,
          extendedProps: {
            staffId: booking.provider_id,
            staffName: staffName,
            customerName: customerName,
            customerEmail: customer?.email || 'Not provided',
            customerPhone: customer?.phone_number || 'Not provided',
            serviceName: service?.name || 'Appointment',
            customerId: booking.customer_id,
            serviceId: service?.id,
            status: booking.status || 'pending',
            notes: booking.notes || '-',
            comments: booking.comments, // Add this line
            locationId: booking.location,
            locationName: booking.location ? LocationService.getInstance().getLocationNameById(booking.location) : 'N/A'
          }
        });
      });

      // Filter out null entries before setting bookings
      const validCalendarEvents = calendarEvents.filter(Boolean);
      setBookings(validCalendarEvents);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to fetch bookings');
    }
  }, []);

  const fetchStaffAvailability = useCallback(async () => {
    try {
      const dbService = DatabaseService.getInstance();
      const locationService = LocationService.getInstance();
      const currentLocationId = locationService.getSelectedLocationId();
      
      const [allStaffData, availabilityData] = await Promise.all([
        // Fetch all staff and managers with locations field
        dbService.fetchData(TABLES.USERS, 'created_at', false, { role: { in: ['staff', 'manager'] } }, ['id', 'full_name', 'locations']),
        // Filter availability data by current location AND is_available=true AND from yesterday onwards
        currentLocationId 
          ? dbService.fetchData('staff_availability', 'created_at', false, { 
              location: currentLocationId,
              is_available: true,
              date: { gte: DateTimeFormatter.getYesterdayStart().split('T')[0] }
            })
          : dbService.fetchData('staff_availability', 'created_at', false, {
              is_available: true,
              date: { gte: DateTimeFormatter.getYesterdayStart().split('T')[0] }
            })
      ]);
      
      // Filter staff by location using the new utility function
      const staffData = currentLocationId 
        ? allStaffData.filter(staff => userHasLocation(staff, currentLocationId))
        : allStaffData;

      // console.log('Staff data:', staffData);
      // console.log('Availability data:', availabilityData);
      // console.log('Filtered by location:', currentLocationId);
  
      // Group availability by date to handle overlapping
      const availabilityByDate = {};
      
      const availabilityEvents = staffData.map(staff => {
        const staffSchedules = availabilityData.filter(schedule => schedule.staff_id === staff.id);
        
        return staffSchedules.map(schedule => {
          if (schedule.date && schedule.start_time && schedule.end_time) {
            // Group by date for positioning
            if (!availabilityByDate[schedule.date]) {
              availabilityByDate[schedule.date] = [];
            }
            
            const formattedStartTime = formatTime(schedule.start_time);
            const formattedEndTime = formatTime(schedule.end_time);
            
            // Create date strings
            const startDateString = `${schedule.date}T${formattedStartTime}`;
            const endDateString = `${schedule.date}T${formattedEndTime}`;
            
            const eventStart = new Date(startDateString);
            const eventEnd = new Date(endDateString);
            
            // Calculate position index for overlapping events
            const existingEvents = availabilityByDate[schedule.date];
            let positionIndex = existingEvents.length;
            
            // Adjust position index based on total number of staff to match CSS rules
            const totalStaffForDate = staffData.length;
            if (totalStaffForDate === 2) {
              // For 2 staff, use positions 0, 1 (50% width each)
              // Keep original logic
            } else if (totalStaffForDate === 3) {
              // For 3 staff, use positions 2, 3, 4 (33.33% width each)
              positionIndex = positionIndex + 2;
            } else if (totalStaffForDate === 4) {
              // For 4 staff, use positions 5, 6, 7, 8 (25% width each)
              positionIndex = positionIndex + 5;
            } else {
              // For 5+ staff, distribute evenly using modulo to cycle through available positions
              // Use positions 2, 3, 4 for better visibility (33.33% width each)
              positionIndex = (positionIndex % 3) + 2;
            }
            
            // console.log(`Debug: Staff ${staff.full_name}, Total Staff: ${totalStaffForDate}, Position Index: ${positionIndex}`);
            
            availabilityByDate[schedule.date].push({
              start: eventStart,
              end: eventEnd,
              staffId: staff.id
            });
            
            // Create class names - exclude positioning for resource views
            const classNames = ['availability-event'];
            // Only add positioning class for non-resource views (week view)
            // Resource views (day view) will handle positioning through columns
            if (stackAvailability) {
              classNames.push(`availability-stack-${positionIndex}`);
            } else {
              classNames.push(`availability-position-${positionIndex}`);
            }
            
            // console.log(`Debug: Final classNames for ${staff.full_name}:`, classNames);
            return {
              title: `${staff.full_name} - Available${schedule.location ? ` (${LocationService.getInstance().getLocationNameById(schedule.location)})` : ''}`,
              start: eventStart.toISOString(),
              end: eventEnd.toISOString(),
              display: 'background',
              backgroundColor: '#d4edda',
              borderColor: '#28a745',
              color: '#155724',
              classNames: classNames,
              allDay: false,
              extendedProps: {
                staffId: staff.id,
                staffName: staff.full_name,
                status: 'Available',
                startTime: schedule.start_time,
                endTime: schedule.end_time,
                isAvailability: true,
                positionIndex: positionIndex,
                isResourceView: true, // Add flag to identify resource-compatible events
                locationId: schedule.location,
                locationName: schedule.location ? LocationService.getInstance().getLocationNameById(schedule.location) : null
              }
            };
          }
          return null;
        }).filter(Boolean);
      }).filter(Boolean);

      // console.log('Final Availability:', availabilityEvents.filter(Boolean));
      
      // Merge availability events with existing bookings
      const flattenedAvailabilityEvents = availabilityEvents.flat();
      setBookings(prevBookings => {
        // Filter out previous availability events and add new ones
        const bookingEvents = prevBookings.filter(event => !event.extendedProps?.isAvailability);
        const newBookings = [...bookingEvents, ...flattenedAvailabilityEvents];
        
        // console.log('Final bookings state with availability (including all-day):', newBookings);
        return newBookings;
      });
    } catch (error) {
      console.error('Error fetching staff availability:', error);
      toast.error('Failed to fetch staff availability');
    }
  }, [stackAvailability]); // Add stackAvailability to dependency array

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        
        const locationService = LocationService.getInstance();
        const currentLocationObj = locationService.getSelectedLocation();
        setCurrentLocation(currentLocationObj);
        
        await fetchTableStats();
        const customersData = await fetchCustomers();
        await fetchServices();
        await fetchBusinessHours(); // This will now work
        await fetchBookingsWithStaff(customersData);
        await fetchStaffAvailability();
        
        // Add real-time subscription for bookings
        // Remove the hook calls from here since they're now at the top level
        const bookingsChannel = supabase
          .channel('bookings-changes')
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
              schema: 'public',
              table: 'bookings'
            },
            async (payload) => {
              console.log('📡 Real-time booking change detected:', payload);
              
              // Refresh bookings data when any booking changes
              try {
                const customersData = await fetchCustomers();
                await fetchBookingsWithStaff(customersData);
                await fetchTableStats(); // Also refresh stats
                await fetchStaffAvailability();
                
                // Use the multilingual utility function for consistent toast notifications
                handleBookingRealtimeToast(payload, {
                  isCustomerView: false,
                  autoClose: 4000,
                  includeLocation: false,
                  includeNotes: true
                });
              } catch (error) {
                console.error('Error refreshing bookings after real-time update:', error);
                showErrorToast('general');
              }
            }
          )
          .subscribe();
        
        // Add location change listener
        // Add location change listener
        const handleLocationChange = async (newLocation) => {
          // console.log('🌍 Dashboard location change detected:', {
          //   newLocationId: newLocation?.id,
          //   newLocationName: newLocation?.name
          // });
          
          setCurrentLocation(newLocation || null); // Store the full location object, not just the ID
          
          // Refetch bookings and staff availability for the new location
          try {
            const customersData = await fetchCustomers();
            await fetchBookingsWithStaff(customersData);
            await fetchTableStats(); // ← ADD THIS LINE!
            await fetchStaffAvailability();
            // console.log('✅ Dashboard data refreshed for new location');
          } catch (error) {
            console.error('❌ Error refreshing dashboard data for location change:', error);
            showErrorToast('general');
          }
        };
        
        // Add listener for location changes
        const removeLocationListener = locationService.addLocationChangeListener(handleLocationChange);
        
        // Cleanup function
        return () => {
          removeLocationListener();
          bookingsChannel.unsubscribe();
        };
      } catch (error) {
        console.error('Error in initData:', error);
        setLoading(false);
      }
    };
    initData();
  }, []); // ← Empty dependency array since all functions are stable

  // Add useEffect to re-fetch availability when stackAvailability changes
  useEffect(() => {
    if (!loading) {
      fetchStaffAvailability();
    }
  }, [stackAvailability, fetchStaffAvailability, loading]);

  // Return staffData in the hook
  return {
    loading,
    tableStats,
    bookings,
    services,
    customers,
    staffColors,
    currentLocation,
    businessHours,
    fetchBookingsWithStaff,
    fetchStaffAvailability,
    staffData // Add this to exports
  };
};