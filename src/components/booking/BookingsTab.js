import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ToastMessage from '../common/ToastMessage';
import Table from '../table/Table';
import { useLanguage } from '../../contexts/LanguageContext';
import EditBookingPopup from './EditBookingPopup';
import BookingService from '../../services/BookingService';
import DatabaseService from '../../services/DatabaseService';
import DateTimeFormatter from '../../utils/DateTimeFormatter';
import ErrorHandlingService from '../../services/ErrorHandlingService';
import withErrorHandling from '../common/withErrorHandling';
import LocationService from '../../services/LocationService';
import { BOOKING_STATUS, USER_ROLES, TABLES, QUERY_FILTERS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../constants';
import { filterUsersByRole, isUpcomingBooking, isPendingBooking } from '../../utils';

function BookingsTab({ users, userId, staffMode = false, currentUserId }) {
  const { t } = useLanguage();
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
  const [searchFilter, setSearchFilter] = useState(''); // Add this line
  const [bookingTimeInterval, setBookingTimeInterval] = useState(30);
  const [showRecurringOptions, setShowRecurringOptions] = useState(false);
  const [hourOptions, setHourOptions] = useState([]);
  const [minuteOptions, setMinuteOptions] = useState([]);
  const [recurringOptions] = useState([
    { value: 'daily', label: t('bookings.repeatDaily') },
    { value: 'weekly', label: t('bookings.repeatWeekly') }
  ]);

  // Use ref to track if initial load is complete
  const initialLoadComplete = useRef(false);

  // Stabilize fetchCustomers with useCallback
  const fetchCustomers = useCallback(async () => {
    console.log('🔄 fetchCustomers called');
    try {
      if (users && users.length > 0) {
        console.log('📊 Using users prop, length:', users.length);
        const customerData = filterUsersByRole(users, [USER_ROLES.CUSTOMER])
          .map(user => ({ id: user.id, full_name: user.full_name }));
        setCustomers(customerData);
        console.log('✅ fetchCustomers completed (from users prop)');
        return customerData;
      } else {
        console.log('🗄️ Fetching customers from database');
        const dbService = DatabaseService.getInstance();
        const data = await dbService.fetchSpecificColumns(TABLES.USERS, 'id, full_name', QUERY_FILTERS.ROLE_CUSTOMER);
        setCustomers(data);
        console.log('✅ fetchCustomers completed (from database)');
        return data;
      }
    } catch (error) {
      console.error('❌ fetchCustomers error:', error);
      errorHandler.handleDatabaseError(error, 'fetching', 'customers');
      return [];
    }
  }, [users]); // Only depend on users

  // Stabilize fetchServices with useCallback
  const fetchServices = useCallback(async () => {
    console.log('🔄 fetchServices called');
    try {
      const dbService = DatabaseService.getInstance();
      const data = await dbService.fetchData(TABLES.SERVICES);
      setServices(data);
      console.log('✅ fetchServices completed, services count:', data.length);
      return data;
    } catch (error) {
      console.error('❌ fetchServices error:', error);
      errorHandler.handleDatabaseError(error, 'fetching', 'services');
      return [];
    }
  }, []);

  // Stabilize fetchBookings with useCallback
  const fetchBookings = useCallback(async (serviceData, customerData) => {
    console.log('🔄 fetchBookings called with:', {
      serviceData: serviceData ? `${serviceData.length} services` : 'using state',
      customerData: customerData ? `${customerData.length} customers` : 'using state',
      timeFilter,
      userId
    });
    try {
      const bookingService = BookingService.getInstance();
      const bookingsWithDetails = await bookingService.fetchBookings(serviceData || services, customerData || customers);
      let filteredBookings = bookingService.filterBookingsByTime(bookingsWithDetails, timeFilter);
      
      // Filter bookings by user ID if provided
      if (userId) {
        filteredBookings = filteredBookings.filter(booking => booking.customer_id === userId);
      }
      setBookings(filteredBookings);
      console.log('✅ fetchBookings completed, bookings count:', filteredBookings.length);
    } catch (error) {
      console.error('❌ fetchBookings error:', error);
      const { message } = errorHandler.handleDatabaseError(error, 'fetching', 'bookings');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [services, customers, timeFilter, userId]);

  // Get booking time interval setting
  const fetchBookingTimeInterval = useCallback(async () => {
    console.log('🔄 fetchBookingTimeInterval called');
    try {
      const bookingService = BookingService.getInstance();
      const interval = await bookingService.getBookingTimeInterval();
      console.log('✅ fetchBookingTimeInterval completed, interval:', interval);
      setBookingTimeInterval(interval);
    } catch (error) {
      console.error('❌ fetchBookingTimeInterval error:', error);
      errorHandler.handleDatabaseError(error, 'fetching', 'booking time interval');
      // Keep default value of 30 minutes
    }
  }, []);

  // Initial data loading - only run once
  useEffect(() => {
    console.log('🚀 Initial useEffect triggered, initialLoadComplete:', initialLoadComplete.current);
    if (!initialLoadComplete.current) {
      const initData = async () => {
        console.log('🔧 Starting initial data load...');
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
        
        const [customerData, serviceData] = await Promise.all([
          fetchCustomers(),
          fetchServices()
        ]);
        await fetchBookings(serviceData, customerData);
        
        initialLoadComplete.current = true;
        console.log('✅ Initial data load completed');
      };
      initData();
    }
  }, []); // Empty dependency array - only run once

  // Handle timeFilter changes separately
  useEffect(() => {
    console.log('⏰ timeFilter useEffect triggered, timeFilter:', timeFilter, 'initialLoadComplete:', initialLoadComplete.current);
    if (initialLoadComplete.current) {
      console.log('🔄 Refetching bookings due to timeFilter change');
      // Only refetch bookings when timeFilter changes after initial load
      fetchBookings();
    }
  }, [timeFilter, fetchBookings]);

  // Handle users changes separately
  useEffect(() => {
    console.log('👥 users useEffect triggered, users length:', users?.length, 'initialLoadComplete:', initialLoadComplete.current);
    if (initialLoadComplete.current) {
      console.log('🔄 Refetching customers and bookings due to users change');
      // Only refetch customers and bookings when users change after initial load
      const updateCustomersAndBookings = async () => {
        const customerData = await fetchCustomers();
        await fetchBookings(undefined, customerData); // Let fetchBookings use its internal services state
      };
      updateCustomersAndBookings();
    }
  }, [users, fetchCustomers, fetchBookings]); // Remove services from dependency array

  // Handle bookingTimeInterval changes
  useEffect(() => {
    console.log('⏱️ bookingTimeInterval useEffect triggered, interval:', bookingTimeInterval);
    if (bookingTimeInterval > 0) {
      console.log('🔄 Regenerating minute options for interval:', bookingTimeInterval);
      // Regenerate minute options when interval changes
      const minutes = [];
      for (let minute = 0; minute < 60; minute += bookingTimeInterval) {
        minutes.push(minute.toString().padStart(2, '0'));
      }
      setMinuteOptions(minutes);
      console.log('✅ Minute options updated, count:', minutes.length);
    }
  }, [bookingTimeInterval]);

  // Use DateTimeFormatter to format date and time
  const formatDateTime = (dateTimeString) => {
    const formatter = DateTimeFormatter.getInstance();
    return formatter.formatDateTime(dateTimeString);
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
      const { service_name, customer_name, provider_name, booking_time_formatted, created_at_formatted, show_recurring, start_date,start_time_hour,start_time_minute,created_at, ...dataToSave } = itemData;
    
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
        toast.error(ERROR_MESSAGES.INVALID_CUSTOMER);
        return;
      }
      console.log('Customer ID validation passed:', dataToSave.customer_id);
    
      // Validate if customer ID exists in users table
      console.log('Checking if customer exists in database...');
      const customerExists = await dbService.fetchSpecificColumns(TABLES.USERS, 'id', { id: dataToSave.customer_id, role: USER_ROLES.CUSTOMER });
      console.log('Customer exists check result:', customerExists);
    
      if (!customerExists || customerExists.length === 0) {
        console.error('Customer not found in users table:', dataToSave.customer_id);
        toast.error(ERROR_MESSAGES.INVALID_CUSTOMER);
        return;
      }
    
      if (!dataToSave.service_id) {
        console.error('Missing service_id');
        toast.error(ERROR_MESSAGES.INVALID_SERVICE);
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
            await dbService.createItem(TABLES.BOOKINGS, dataToSave, 'Booking');
            
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
          await dbService.updateItem(TABLES.BOOKINGS, dataToSave, 'Booking');
          
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
      await dbService.deleteItems(TABLES.BOOKINGS, selectedRows, 'Booking');
      setBookings(bookings.filter((item) => !selectedRows.includes(item.id)));
    } catch (error) {
      errorHandler.handleDatabaseError(error, 'deleting', 'bookings');
    }
  };

  // Filter bookings by status, user, and search term
  const filteredBookings = bookings
    .filter(booking => statusFilter === 'all' ? true : booking.status === statusFilter)
    .filter(booking => userFilter === 'all' ? true : booking.customer_id === userFilter)
    .filter(booking => {
      const searchTerm = searchFilter.toLowerCase();
      return searchTerm === '' ||
        booking.customer_name?.toLowerCase().includes(searchTerm) ||
        booking.service_name?.toLowerCase().includes(searchTerm) ||
        booking.notes?.toLowerCase().includes(searchTerm);
    });

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

  if (loading) return <div>{t('common.loading')}</div>;
  if (error) return <div>Error: {error}</div>;

  const stats = getBookingStats();

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">{t('bookings.manageBookings')}</h2>

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
            status: BOOKING_STATUS.PENDING,
            notes: "",
            recurring_type: null,
            recurring_count: 0
          });
        }}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 my-4"
      >
{t('bookings.createNewBooking')}
      </button>


      {/* Refresh button */}
      <button
        onClick={async () => {
          console.log('Refreshing bookings data...');
          const initData = async () => {
            // Get booking time interval setting
            await fetchBookingTimeInterval(); // ← This updates bookingTimeInterval
            
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
            for (let minute = 0; minute < 60; minute += bookingTimeInterval) { // ← Using stale value!
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
{t('common.refresh')}
      </button>

      {/* Delete Selected button */}
      <button
        onClick={handleDeleteSelected}
        className={`${selectedRows.length === 0 ? 'bg-gray-400 hover:bg-gray-500' : 'bg-red-500 hover:bg-red-600'} text-white px-4 py-2 rounded-lg my-4 ml-2`}
        disabled={selectedRows.length === 0}
      >
{t('bookings.cancelSelected')}
      </button>
      {/* Filter Controls */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        {/* Status filter */}
        <div>
          <label className="mr-2 font-medium">{t('bookings.statusFilter')}:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">{t('bookings.allStatuses')}</option>
            <option value={BOOKING_STATUS.PENDING}>{t('bookings.pending')}</option>
            <option value={BOOKING_STATUS.CONFIRMED}>{t('bookings.confirmed')}</option>
            <option value={BOOKING_STATUS.CANCELLED}>{t('bookings.cancelled')}</option>
            <option value={BOOKING_STATUS.COMPLETED}>{t('bookings.completed')}</option>
          </select>
        </div>

        {/* Time filter */}
        <div>
          <label className="mr-2 font-medium">{t('bookings.timeFilter')}:</label>
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">{t('bookings.allTime')}</option>
            <option value="today">{t('dashboard.today')}</option>
            <option value="today+">{t('bookings.todayAndFuture')}</option>
            <option value="week">{t('bookings.thisWeek')}</option>
            <option value="month">{t('bookings.thisMonth')}</option>
            <option value="past">{t('bookings.pastBookings')}</option>
          </select>
        </div>

        {/* Only show User Filter for non-staff users */}
        {!staffMode && (
          <div>
            <label className="mr-2 font-medium">{t('bookings.userFilter')}:</label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">{t('bookings.allUsers')}</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>{customer.full_name}</option>
              ))}
            </select>
          </div>
        )}
        
        {/* Search filter - Add this section */}
        <div className="flex items-center">
          <label className="mr-2 font-medium">{t('bookings.search')}:</label>
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder={t('bookings.searchPlaceholder')}
            className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500 w-64"
          />
        </div>
      </div>

      {/* Bookings Table */}
      <Table
        columns={[
          { key: "customer_name", label: t('bookings.customer') },
          { key: "service_name", label: t('bookings.service') },
          { key: "booking_time_formatted", label: t('bookings.bookingTime') },
          { key: "duration", label: t('bookings.duration') },
          // This will now work properly
          { 
            key: "location", 
            label: t('bookings.location'),
            formatter: (locationId) => {
              const locationService = LocationService.getInstance();
              return locationService.getLocationNameById(locationId);
            }
          },
          { key: "status", label: t('bookings.status') },
          { key: "recurring_type", label: t('bookings.recurringType'), 
            formatter: (value) => {
              if (value === null || value === undefined || value === '') return null;
              switch(value) {
                case 'daily': return t('bookings.daily');
                case 'weekly': return t('bookings.weekly');
                case 'monthly': return t('bookings.monthly');
                default: return null;
              }
            }
          },
          { key: "recurring_count", label: t('bookings.repeatCount') },
          { key: "notes", label: t('bookings.notes') },
          { key: "created_at_formatted", label: t('bookings.createdAt') },
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