import { useState, useEffect, useCallback } from 'react';
import DatabaseService from '../services/DatabaseService';
import LocationService from '../services/LocationService';
import StaffAvailabilityService from '../services/StaffAvailabilityService';
import { toast } from 'react-toastify';

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

export const useDashboardData = () => {
  const [loading, setLoading] = useState(true);
  const [tableStats, setTableStats] = useState({
    users: 0,
    services: 0,
    bookings: 0,
    todayBookings: 0,
    futureBookings: 0,
    pastBookings: 0
  });
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staffColors, setStaffColors] = useState({});
  const [currentLocation, setCurrentLocation] = useState(null);
  const [businessHours, setBusinessHours] = useState(null);

  const fetchTableStats = useCallback(async () => {
    try {
      const dbService = DatabaseService.getInstance();
      const locationService = LocationService.getInstance();
      const currentLocationId = locationService.getSelectedLocationId();
      
      const [usersCount, servicesCount, bookings] = await Promise.all([
        dbService.getCount('users'),
        dbService.getCount('services'),
        // Filter bookings by current location
        currentLocationId 
          ? dbService.fetchData('bookings', 'created_at', false, { location: currentLocationId })
          : dbService.fetchData('bookings')
      ]);
  
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);
  
      const todayBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.start_time);
        return bookingDate >= now && bookingDate <= todayEnd;
      }).length;
  
      const futureBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.start_time);
        return bookingDate > todayEnd;
      }).length;
  
      const pastBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.start_time);
        return bookingDate < now;
      }).length;
  
      setTableStats({
        users: usersCount,
        services: servicesCount,
        bookings: bookings.length,
        todayBookings,
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
      const dbService = DatabaseService.getInstance();
      const data = await dbService.fetchData('services');
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
      const data = await dbService.fetchSpecificColumns('users', 'id, full_name', { role: 'customer' });
      setCustomers(data);
      return data;
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to fetch customers');
      return [];
    }
  }, []);

  // Add staffData to state
  const [staffData, setStaffData] = useState([]);

  const fetchBookingsWithStaff = useCallback(async (customersData) => {
    try {
      const dbService = DatabaseService.getInstance();
      const locationService = LocationService.getInstance();
      const currentLocationId = locationService.getSelectedLocationId();
      
      const [bookingsData, staffDataResult, servicesData, showStaffNameSetting, fetchedCustomersData] = await Promise.all([
        // Filter bookings by current location
        currentLocationId 
          ? dbService.fetchData('bookings', 'created_at', false, { location: currentLocationId })
          : dbService.fetchData('bookings'),
        dbService.fetchData('users', 'created_at', false, { role: { in: ['staff', 'admin'] } }, ['id', 'full_name']),
        dbService.fetchData('services'),
        dbService.getSettingsByKey('booking', 'showStaffName'),
        // Fetch customers data if not provided
        customersData || dbService.fetchData('users', 'created_at', false, { role: 'customer' }, ['id', 'full_name'])
      ]);

      console.log('Bookings filtered by location:', currentLocationId, bookingsData.length);

      // Use the provided customersData or the fetched one
      const actualCustomersData = customersData || fetchedCustomersData;
  
      // Set the staff data from the fetched result
      setStaffData(staffDataResult);
  
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
        const staff = staffDataResult.find(s => s.id === booking.provider_id);
        const staffName = staff?.full_name || 'Unknown';
        const customer = actualCustomersData.find(c => c.id === booking.customer_id);
        const customerName = customer?.full_name || 'Unknown';
        
        const showStaffName = showStaffNameSetting === 'true';
        const title = showStaffName ? `${service?.name || 'Appointment'}-${staffName}` : service?.name || 'Appointment';

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
          tooltip: `Service: ${service?.name || 'Appointment'}\nCustomer: ${customerName}\nStaff: ${staffName}\nTime: ${new Date(booking.start_time).toLocaleString()} - ${new Date(booking.end_time).toLocaleString()}\nStatus: ${booking.status || 'pending'}${booking.notes ? '\nNotes: ' + booking.notes : ''}`,
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
            notes: booking.notes || 'No notes',
            locationId: booking.location,
            locationName: booking.location ? LocationService.getInstance().getLocationNameById(booking.location) : 'N/A'
          }
        });
      });

      setBookings(calendarEvents);
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
      
      const [staffData, availabilityData] = await Promise.all([
        dbService.fetchData('users', 'created_at', false, { role: { in: ['staff', 'admin'] } }, ['id', 'full_name']),
        // Filter availability data by current location
        currentLocationId 
          ? dbService.fetchData('staff_availability', 'created_at', false, { location: currentLocationId })
          : dbService.fetchData('staff_availability')
      ]);
  
      console.log('Staff data:', staffData);
      console.log('Availability data:', availabilityData);
      console.log('Filtered by location:', currentLocationId);
  
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
            
            // Check if dates are valid
            if (isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) {
              console.warn('Invalid date created:', {
                schedule,
                startDateString,
                endDateString,
                eventStart,
                eventEnd
              });
              return null;
            }
            
            // Calculate position index for this date
            const positionIndex = availabilityByDate[schedule.date].length;
            availabilityByDate[schedule.date].push(staff.id);
            
            // console.log('Availability event:', {
            //   staff: staff.full_name,
            //   date: schedule.date,
            //   start: schedule.start_time,
            //   end: schedule.end_time,
            //   positionIndex,
            //   eventStart: eventStart.toISOString(),
            //   eventEnd: eventEnd.toISOString()
            // });
            
            // Create class names - exclude positioning for resource views
            const classNames = ['availability-event'];
            // Only add positioning class for non-resource views (week view)
            // Resource views (day view) will handle positioning through columns
            classNames.push(`availability-position-${positionIndex}`);
            
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

      console.log('Final Availability:', availabilityEvents.filter(Boolean));

      // Add availability events to calendar
      const validAvailabilityEvents = availabilityEvents.flat().filter(Boolean);
      
      // INSERT DYNAMIC WIDTH CALCULATION HERE
      // Dynamic Width Calculation - Update positioning classes based on actual staff count per date/time
      const updatedAvailabilityEvents = validAvailabilityEvents.map(event => {
        const eventDate = event.start.split('T')[0];
        const eventStartTime = event.extendedProps.startTime;
        const eventEndTime = event.extendedProps.endTime;
        
        // Count how many staff are available at the same time slot on the same date
        const concurrentStaff = validAvailabilityEvents.filter(otherEvent => {
          const otherDate = otherEvent.start.split('T')[0];
          const otherStartTime = otherEvent.extendedProps.startTime;
          const otherEndTime = otherEvent.extendedProps.endTime;
          
          return otherDate === eventDate && 
                 otherStartTime === eventStartTime && 
                 otherEndTime === eventEndTime;
        });
        
        // Update class names based on actual concurrent staff count
        const updatedClassNames = ['availability-event'];
        
        if (concurrentStaff.length === 1) {
          // Single staff - use full width
          updatedClassNames.push('availability-single-staff');
        } else {
          // Multiple staff - use original positioning
          updatedClassNames.push(`availability-position-${event.extendedProps.positionIndex}`);
        }
        
        return {
          ...event,
          classNames: updatedClassNames
        };
      });
  
      setBookings(prevBookings => {
        // Filter out any existing availability events for the same staff
        const bookingEvents = prevBookings.filter(event => 
          !event.classNames?.includes('availability-event') || 
          !updatedAvailabilityEvents.some(newEvent => 
            newEvent.extendedProps.staffId === event.extendedProps.staffId
          )
        );
        const newBookings = [...bookingEvents, ...updatedAvailabilityEvents]; // Use updated events
        console.log('Final bookings state with availability:', newBookings);
        return newBookings;
      });
    } catch (error) {
      console.error('Error fetching staff availability:', error);
      toast.error('Failed to fetch staff availability');
    }
  }, []);

  useEffect(() => {
    const initData = async () => {
      // Initialize LocationService and get current location
      const locationService = LocationService.getInstance();
      const dbService = DatabaseService.getInstance();
      
      // Initialize locations if not already done
      await locationService.initializeLocations(dbService);
      
      // Set current location
      const selectedLocation = locationService.getSelectedLocation();
      setCurrentLocation(selectedLocation);
      
      // Add listener for location changes
      const handleLocationChange = async (location) => {
        setCurrentLocation(location);
        
        // Reload all data when location changes
        try {
          console.log('Location changed to:', location.name, 'Reloading data...');
          await fetchTableStats();
          const customersData = await fetchCustomers();
          await fetchServices();
          await fetchBookingsWithStaff(customersData);
          await fetchStaffAvailability();
        } catch (error) {
          console.error('Error reloading data after location change:', error);
          toast.error('Failed to reload data for new location');
        }
      };
      locationService.addLocationChangeListener(handleLocationChange);
      
      const businessHoursStr = await dbService.getSettingsByKey('system', 'businessHours');
      
      if (businessHoursStr) {
        const [start, end] = businessHoursStr.split('-');
        setBusinessHours({
          startTime: `${start}:00`,
          endTime: `${end}:00`
        });
      }

      await fetchTableStats();
      const customersData = await fetchCustomers();
      await fetchServices();
      await fetchBookingsWithStaff(customersData);
      await fetchStaffAvailability();
      
      // Cleanup function
      return () => {
        locationService.removeLocationChangeListener(handleLocationChange);
      };
    };
    initData();
  }, [fetchTableStats, fetchCustomers, fetchServices, fetchBookingsWithStaff, fetchStaffAvailability]);

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