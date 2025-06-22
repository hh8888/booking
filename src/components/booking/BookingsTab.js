import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ToastMessage from '../common/ToastMessage';
import Table from '../table/Table';
import EditBookingPopup from './EditBookingPopup';
import BookingService from '../../services/BookingService';
import DatabaseService from '../../services/DatabaseService';
import DateTimeFormatter from '../../utils/DateTimeFormatter';
import ErrorHandlingService from '../../services/ErrorHandlingService';
import withErrorHandling from '../common/withErrorHandling';
import LocationService from '../../services/LocationService';

function BookingsTab({ users, userId, staffMode = false, currentUserId }) {
  const errorHandler = ErrorHandlingService.getInstance();
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('today+');
  const [userFilter, setUserFilter] = useState('all');
  const [bookingTimeInterval, setBookingTimeInterval] = useState(30);
  const [showRecurringOptions, setShowRecurringOptions] = useState(false);
  const [hourOptions, setHourOptions] = useState([]);
  const [minuteOptions, setMinuteOptions] = useState([]);
  const [recurringOptions] = useState([
    { value: 'daily', label: 'Repeat Daily' },
    { value: 'weekly', label: 'Repeat Weekly' }
  ]);

  useEffect(() => {
    const initData = async () => {
      // Get booking time interval setting
      await fetchBookingTimeInterval();
      
      // Get business hours
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

      // Generate hour options
      const hours = [];
      for (let hour = startHour; hour <= endHour; hour++) {
        hours.push(hour.toString().padStart(2, '0'));
      }
      setHourOptions(hours);

      // Generate minute options based on interval
      const minutes = [];
      for (let minute = 0; minute < 60; minute += bookingTimeInterval) {
        minutes.push(minute.toString().padStart(2, '0'));
      }
      setMinuteOptions(minutes);
      
      const [customerData, serviceData] = await Promise.all([
        fetchCustomers(),
        fetchServices()
      ]);
      fetchBookings(serviceData, customerData);
    };
    initData();
  }, [timeFilter, bookingTimeInterval]); // Add timeFilter and bookingTimeInterval as dependencies

  // Get booking time interval setting
  const fetchBookingTimeInterval = async () => {
    try {
      const bookingService = BookingService.getInstance();
      const interval = await bookingService.getBookingTimeInterval();
      setBookingTimeInterval(interval);
    } catch (error) {
      errorHandler.handleDatabaseError(error, 'fetching', 'booking time interval');
      // Keep default value of 30 minutes
    }
  };

  // Use DateTimeFormatter to format date and time
  const formatDateTime = (dateTimeString) => {
    const formatter = DateTimeFormatter.getInstance();
    return formatter.formatDateTime(dateTimeString);
  };

  const fetchBookings = async (serviceData, customerData) => {
    try {
      const bookingService = BookingService.getInstance();
      const bookingsWithDetails = await bookingService.fetchBookings(serviceData || services, customerData || customers);
      let filteredBookings = bookingService.filterBookingsByTime(bookingsWithDetails, timeFilter);
      
      // Filter bookings by user ID if provided
      if (userId) {
        filteredBookings = filteredBookings.filter(booking => booking.customer_id === userId);
      }
      setBookings(filteredBookings);
    } catch (error) {
      const { message } = errorHandler.handleDatabaseError(error, 'fetching', 'bookings');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const dbService = DatabaseService.getInstance();
      const data = await dbService.fetchData('services');
      setServices(data);
      return data;
    } catch (error) {
      errorHandler.handleDatabaseError(error, 'fetching', 'services');
      return [];
    }
  };

  const fetchCustomers = async () => {
    try {
      if (users && users.length > 0) {
        const customerData = users.filter(user => user.role === 'customer')
          .map(user => ({ id: user.id, full_name: user.full_name }));
        setCustomers(customerData);
        return customerData;
      } else {
        const dbService = DatabaseService.getInstance();
        const data = await dbService.fetchSpecificColumns('users', 'id, full_name', { role: 'customer' });
        setCustomers(data);
        return data;
      }
    } catch (error) {
      errorHandler.handleDatabaseError(error, 'fetching', 'customers');
      return [];
    }
  };

  // Parse various duration formats to minutes
  const parseDuration = (duration) => {
    let durationInMinutes = 60; // Default 60 minutes
    
    // Ensure duration is a valid number
    if (typeof duration === 'number' && !isNaN(duration)) {
      durationInMinutes = duration;
    } else if (typeof duration === 'string') {
      // Handle PostgreSQL interval format
      if (duration.includes(':')) {
        // If duration is in time format (HH:MM:SS), convert to minutes
        const timeParts = duration.split(':');
        if (timeParts.length === 3) {
          // Convert hours:minutes:seconds to minutes
          durationInMinutes = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]) + parseInt(timeParts[2]) / 60;
        } else if (timeParts.length === 2) {
          // Convert minutes:seconds to minutes
          durationInMinutes = parseInt(timeParts[0]) + parseInt(timeParts[1]) / 60;
        }
      } else if (duration.includes('hour') || duration.includes('minute') || duration.includes('second')) {
        // Handle verbose interval format
        let minutes = 0;
        
        // Extract hours
        const hourMatch = duration.match(/(d+)\s+hour/i);
        if (hourMatch) minutes += parseInt(hourMatch[1]) * 60;
        
        // Extract minutes
        const minuteMatch = duration.match(/(d+)\s+minute/i);
        if (minuteMatch) minutes += parseInt(minuteMatch[1]);
        
        // Extract seconds (convert to fraction of minute)
        const secondMatch = duration.match(/(d+)\s+second/i);
        if (secondMatch) minutes += parseInt(secondMatch[1]) / 60;
        
        durationInMinutes = minutes;
      } else {
        // Try to parse number directly
        const parsedDuration = parseFloat(duration);
        if (!isNaN(parsedDuration)) {
          durationInMinutes = parsedDuration;
        }
      }
    }
    
    return durationInMinutes;
  };
  // Use DatabaseService singleton to save
  const [selectedTime, setSelectedTime] = useState('');

// Handle time change separately from form data
      const handleTimeChange = (dateTimeString) => {
        setSelectedTime(dateTimeString);
      };
  const handleSave = async (itemData) => {
    console.log('=== BookingsTab handleSave START ===');
    console.log('itemData received:', itemData);
    console.log('isCreating:', isCreating);
    console.log('editItem:', editItem);
    
    try {
      const dbService = DatabaseService.getInstance();
    
      // Remove extra display fields and ensure customer_id is included
      // Change this line:
      // const { service_name, customer_name, booking_time_formatted, created_at_formatted, show_recurring, ...dataToSave } = itemData;
      
      // To this (add provider_name to the destructuring):
      const { service_name, customer_name, provider_name, booking_time_formatted, created_at_formatted, show_recurring, ...dataToSave } = itemData;
    
      console.log('Data after removing display fields:', dataToSave);
    
      // Ensure ID is preserved in edit mode
      if (!isCreating && editItem) {
        dataToSave.id = editItem.id;
        console.log('Added ID for edit mode:', dataToSave.id);
      }
    
      // Only include recurring_parent_id if it exists and is valid
      if (!dataToSave.recurring_parent_id) {
        delete dataToSave.recurring_parent_id;
      }
      
      // If recurring options are hidden or not selected, remove recurring fields
      if (!isCreating || !dataToSave?.recurring_type) {
        delete dataToSave.recurring_type;
        delete dataToSave.recurring_count;
      } else {
        // Ensure recurring_count is at least 2 for recurring bookings (since 1 would be just the original)
        dataToSave.recurring_count = Math.max(2, parseInt(dataToSave.recurring_count) || 2);
      }

      // Validate required fields and ensure customer_id exists
      if (!dataToSave.customer_id) {
        console.error('Invalid customer_id:', dataToSave.customer_id);
        toast.error('Please select a valid customer');
        return;
      }
      console.log('Customer ID validation passed:', dataToSave.customer_id);
    
      // Validate if customer ID exists in users table
      console.log('Checking if customer exists in database...');
      const customerExists = await dbService.fetchSpecificColumns('users', 'id', { id: dataToSave.customer_id, role: 'customer' });
      console.log('Customer exists check result:', customerExists);
    
      if (!customerExists || customerExists.length === 0) {
        console.error('Customer not found in users table:', dataToSave.customer_id);
        toast.error('Please select a valid customer');
        return;
      }
    
      if (!dataToSave.service_id) {
        console.error('Missing service_id');
        toast.error('Please select a service');
        return;
      }
      console.log('Service ID validation passed:', dataToSave.service_id);
    
      // Calculate end_time, based on service duration
      const selectedService = services.find(service => service.id === dataToSave.service_id);
      console.log('Selected service:', selectedService);
    
      try {
        // Validate start time
        const startTime = new Date(dataToSave.start_time);
        console.log('Start time parsing:', {
          original: dataToSave.start_time,
          parsed: startTime,
          isValid: !isNaN(startTime.getTime())
        });
        
        if (isNaN(startTime.getTime())) {
          throw new Error('Invalid start time');
        }
        
        // Use duration from form data if available, otherwise parse from service
        let durationInMinutes;
        if (dataToSave.duration && !isNaN(parseInt(dataToSave.duration))) {
          durationInMinutes = parseInt(dataToSave.duration);
          console.log('Using form duration:', durationInMinutes);
        } else {
          durationInMinutes = parseDuration(selectedService?.duration);
          console.log('Using service duration:', durationInMinutes);
        }
        
        // Calculate end time
        const endTime = new Date(startTime.getTime() + durationInMinutes * 60000);
        console.log('End time calculation:', {
          startTime: startTime.toISOString(),
          durationMinutes: durationInMinutes,
          endTime: endTime.toISOString()
        });
        
        // Validate end time
        if (isNaN(endTime.getTime())) {
          throw new Error('Invalid end time calculation');
        }
        
        console.log('saving start time:', dataToSave.start_time);
        console.log('saving data:', dataToSave);
        
        // Add end_time to save data
        dataToSave.end_time = endTime.toISOString();
        // dataToSave.updated_at = new Date(Date.now()).toISOString();
        if (isCreating) {
          if (isCreating && itemData.recurring_type && itemData.recurring_count > 0) {
            
            // Update local state
            const staffData = await fetchServices();
            const customerData = await fetchCustomers();
            await fetchBookings(staffData, customerData);
            setIsCreating(false);
            setEditItem(null);
          } else {
            // Create a single new booking
            await dbService.createItem('bookings', dataToSave, 'Booking');
            
            // Update local state
            const staffData = await fetchServices();
            const customerData = await fetchCustomers();
            await fetchBookings(staffData, customerData);
            setIsCreating(false);
            setEditItem(null);
          }
        

        } else {
          // Update existing booking
          if (!dataToSave.id) {
            throw new Error('Missing booking ID for update');
          }
          console.log('updating booking:', dataToSave);
          await dbService.updateItem('bookings', dataToSave, 'Booking');
          
          // Update local state
          const staffData = await fetchServices();
          const customerData = await fetchCustomers();
          await fetchBookings(staffData, customerData);
          setIsCreating(false);
          setEditItem(null);
        }
      } catch (error) {
        console.error('Error calculating booking time:', error);
        toast.error(`Error calculating booking time: ${error.message}`);
        return;
      }
    } catch (error) {
      console.error('=== BookingsTab handleSave ERROR (outer) ===');
      console.error('Error:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  // Use DatabaseService singleton to cancel bookings
  const handleDeleteSelected = async () => {
    try {
      const dbService = DatabaseService.getInstance();
      await dbService.deleteItems('bookings', selectedRows, 'Booking');
      setBookings(bookings.filter((item) => !selectedRows.includes(item.id)));
    } catch (error) {
      errorHandler.handleDatabaseError(error, 'deleting', 'bookings');
    }
  };

  // Filter bookings by status and user
  const filteredBookings = bookings
    .filter(booking => statusFilter === 'all' ? true : booking.status === statusFilter)
    .filter(booking => userFilter === 'all' ? true : booking.customer_id === userFilter);

  // Calculate booking statistics
  const getBookingStats = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const todayBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.start_time);
      bookingDate.setHours(0, 0, 0, 0);
      return bookingDate.getTime() === now.getTime();
    });

    const futureBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.start_time);
      bookingDate.setHours(0, 0, 0, 0);
      return bookingDate > now;
    });

    const pastBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.start_time);
      bookingDate.setHours(0, 0, 0, 0);
      return bookingDate < now;
    });

    return {
      today: todayBookings.length,
      future: futureBookings.length,
      past: pastBookings.length
    };
  };

  // Handle card click event
  const handleCardClick = (filterType) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    switch(filterType) {
      case 'today':
        setTimeFilter('today+');
        break;
      case 'future':
        setTimeFilter('today+');
        break;
      case 'past':
        setTimeFilter('past');
        break;
      default:
        setTimeFilter('all');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const stats = getBookingStats();

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Manage Bookings</h2>

      <button
        onClick={async () => {
          setIsCreating(true);
          // Get tomorrow's date
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          // Get business hours for initial hour value
          const dbService = DatabaseService.getInstance();
          const businessHours = await dbService.getSettingsByKey('system', 'businessHours');
          
          // Parse business hours or use default (9:00)
          let startHour = 9;
          if (businessHours) {
            const [start] = businessHours.split('-');
            startHour = parseInt(start.split(':')[0]);
          }
          
          setEditItem({
            customer_id: '',
            service_id: '',
            provider_id: '',
            start_date: tomorrow.toISOString().split('T')[0],
            start_time_hour: startHour.toString().padStart(2, '0'),
            start_time_minute: '00',
            status: "pending",
            notes: "",
            recurring_type: null,
            recurring_count: 0
          });
        }}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 my-4"
      >
        Create New Booking
      </button>


      {/* Refresh button */}
      <button
        onClick={async () => {
          console.log('Refreshing bookings data...');
          const initData = async () => {
            // Get booking time interval setting
            await fetchBookingTimeInterval();
            
            // Get business hours
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

            // Generate hour options
            const hours = [];
            for (let hour = startHour; hour <= endHour; hour++) {
              hours.push(hour.toString().padStart(2, '0'));
            }
            setHourOptions(hours);

            // Generate minute options based on interval
            const minutes = [];
            for (let minute = 0; minute < 60; minute += bookingTimeInterval) {
              minutes.push(minute.toString().padStart(2, '0'));
            }
            setMinuteOptions(minutes);
            
            const [customerData, serviceData] = await Promise.all([
              fetchCustomers(),
              fetchServices()
            ]);
            fetchBookings(serviceData, customerData);
          };
          await initData();
          console.log('Bookings data refreshed successfully');
        }}
        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 my-4 ml-2"
      >
        Refresh
      </button>

      {/* Delete Selected button */}
      <button
        onClick={handleDeleteSelected}
        className={`${selectedRows.length === 0 ? 'bg-gray-400 hover:bg-gray-500' : 'bg-red-500 hover:bg-red-600'} text-white px-4 py-2 rounded-lg my-4 ml-2`}
        disabled={selectedRows.length === 0}
      >
        Cancel Selected
      </button>
      {/* Filter Controls */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        {/* Status filter */}
        <div>
          <label className="mr-2 font-medium">Status Filter:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Time filter */}
        <div>
          <label className="mr-2 font-medium">Time Filter:</label>
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="today+">Today & Future</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="past">Past Bookings</option>
          </select>
        </div>

        {/* Only show User Filter for non-staff users */}
        {!staffMode && (
          <div>
            <label className="mr-2 font-medium">User Filter:</label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Users</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>{customer.full_name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Bookings Table */}
      <Table
        columns={[
          { key: "customer_name", label: "Customer" },
          { key: "service_name", label: "Service" },
          { key: "booking_time_formatted", label: "Booking Time" },
          { key: "duration", label: "Duration (mins)" },
          // This will now work properly
          { 
            key: "location", 
            label: "Location",
            formatter: (locationId) => {
              const locationService = LocationService.getInstance();
              return locationService.getLocationNameById(locationId);
            }
          },
          { key: "status", label: "Status" },
          { key: "recurring_type", label: "Recurring Type", 
            formatter: (value) => {
              if (value === null || value === undefined || value === '') return 'One-time';
              switch(value) {
                case 'daily': return 'Daily';
                case 'weekly': return 'Weekly';
                case 'monthly': return 'Monthly';
                default: return '';
              }
            }
          },
          { key: "recurring_count", label: "Repeat Count" },
          { key: "notes", label: "Notes" },
          { key: "created_at_formatted", label: "Created At" },
        ]}
        data={filteredBookings}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        onEdit={(booking) => {
          setIsCreating(false);
          // Format start_time for date and time inputs
          const bookingDate = new Date(booking.start_time);
          const formattedBooking = {
            ...booking,
            start_date: bookingDate.toISOString().split('T')[0],
            start_time_hour: bookingDate.getHours(),
            start_time_minute: bookingDate.getMinutes()
          };
          setEditItem(formattedBooking);
        }}
        onResetPassword={null}
      />

      {/* Edit/Create popup */}
      {(editItem || isCreating) && (
        <EditBookingPopup
          booking={editItem}
          onSave={handleSave}
          onCancel={() => {
            setEditItem(null);
            setIsCreating(false);
          }}
          isCreating={isCreating}
        />
      )}

      {/* Toast Container */}
      <ToastMessage/>
    </div>
  );
}

export default withErrorHandling(BookingsTab, 'Booking');