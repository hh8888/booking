import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Table from './Table';
import GenericForm from './GenericForm';
import TimeSlotPicker from './TimeSlotPicker';
import BookingService from '../services/BookingService';
import DatabaseService from '../services/DatabaseService';
import DateTimeFormatter from '../utils/DateTimeFormatter';
import withErrorHandling from './withErrorHandling';

function BookingsTab({ users, handleError }) {
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
  const [bookingTimeInterval, setBookingTimeInterval] = useState(30);
  const [showRecurringOptions, setShowRecurringOptions] = useState(false);
  const [recurringOptions] = useState([
    { value: 'daily', label: 'Repeat Daily' },
    { value: 'weekly', label: 'Repeat Weekly' }
  ]);

  useEffect(() => {
    const initData = async () => {
      // Get booking time interval setting
      await fetchBookingTimeInterval();
      
      const [customerData, serviceData] = await Promise.all([
        fetchCustomers(),
        fetchServices()
      ]);
      fetchBookings(serviceData, customerData);
    };
    initData();
  }, [timeFilter]); // Add timeFilter as dependency

  // Get booking time interval setting
  const fetchBookingTimeInterval = async () => {
    try {
      const bookingService = BookingService.getInstance();
      const interval = await bookingService.getBookingTimeInterval();
      setBookingTimeInterval(interval);
    } catch (error) {
      handleError('fetching', () => Promise.reject(error));
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
      const filteredBookings = bookingService.filterBookingsByTime(bookingsWithDetails, timeFilter);
      setBookings(filteredBookings);
    } catch (error) {
      const errorMessage = await handleError('fetching', () => Promise.reject(error));
      setError(errorMessage);
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
      console.error('Error fetching services:', error.message);
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
      console.error('Error fetching customers:', error.message);
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
  const handleSave = async (itemData) => {
    try {
      const dbService = DatabaseService.getInstance();
      
      // Remove extra display fields and ensure customer_id is included
      const { service_name, customer_name, booking_time_formatted, created_at_formatted, duration, show_recurring, ...dataToSave } = itemData;

      // Ensure ID is preserved in edit mode
      if (!isCreating && editItem) {
        dataToSave.id = editItem.id;
      }
      
      // Only include recurring_parent_id if it exists and is valid
      if (!dataToSave.recurring_parent_id) {
        delete dataToSave.recurring_parent_id;
      }
      
      // If no recurring type is selected, ensure recurring fields are not included
      if (!dataToSave.recurring_type || dataToSave.recurring_type === 'none') {
        dataToSave.recurring_type = 'none';
        dataToSave.recurring_count = 0;
      }

      // Validate required fields and ensure customer_id exists
      if (!dataToSave.customer_id) {
        console.error('Invalid customer_id:', dataToSave.customer_id);
        toast.error('Please select a valid customer');
        return;
      }

      // Validate if customer ID exists in users table
      const customerExists = await dbService.fetchSpecificColumns('users', 'id', { id: dataToSave.customer_id, role: 'customer' });
      if (!customerExists || customerExists.length === 0) {
        console.error('Customer not found in users table:', dataToSave.customer_id);
        toast.error('Please select a valid customer');
        return;
      }
      
      if (!dataToSave.service_id) {
        toast.error('Please select a service');
        return;
      }
      
      // Calculate end_time, based on service duration
      const selectedService = services.find(service => service.id === dataToSave.service_id);
      
      try {
        // Validate start time
        const startTime = new Date(dataToSave.start_time);
        if (isNaN(startTime.getTime())) {
          throw new Error('Invalid start time');
        }
        
        // Use unified parseDuration function to parse duration
        let durationInMinutes = parseDuration(selectedService?.duration);
        
        // Calculate end time
        const endTime = new Date(startTime.getTime() + durationInMinutes * 60000); // 60000 milliseconds = 1 minute
        
        // Validate end time
        if (isNaN(endTime.getTime())) {
          throw new Error('Invalid end time calculation');
        }
        
        // Format times with +11 timezone offset
        //dataToSave.start_time = startTime.toLocaleString('en-US', { timeZone: 'Australia/Sydney' });
        //dataToSave.end_time = endTime.toLocaleString('en-US', { timeZone: 'Australia/Sydney' });
        console.log('saving start time:', dataToSave.start_time);
        
        // Add end_time to save data
        dataToSave.end_time = endTime.toISOString();
        // dataToSave.updated_at = new Date(Date.now()).toISOString();

        // Handle recurring bookings
        if (isCreating && itemData.recurring_type && itemData.recurring_count > 0) {
          // Create multiple bookings
          const bookingsToCreate = [];
          
          // Add the first booking (original booking)
          bookingsToCreate.push({...dataToSave});
          
          // Create additional bookings based on recurring type
          for (let i = 1; i <= parseInt(itemData.recurring_count); i++) {
            const newBooking = {...dataToSave};
            const newStartTime = new Date(startTime);
            const newEndTime = new Date(endTime);
            
            if (itemData.recurring_type === 'daily') {
              // Repeat daily
              newStartTime.setDate(newStartTime.getDate() + i);
              newEndTime.setDate(newEndTime.getDate() + i);
            } else if (itemData.recurring_type === 'weekly') {
              // Repeat weekly
              newStartTime.setDate(newStartTime.getDate() + (i * 7));
              newEndTime.setDate(newEndTime.getDate() + (i * 7));
            }
            
            newBooking.start_time = newStartTime.toISOString();
            newBooking.end_time = newEndTime.toISOString();
            newBooking.recurring_parent_id = null; // Can set a parent booking ID to link recurring bookings
            
            bookingsToCreate.push(newBooking);
          }
          
          // Batch create bookings
          for (const booking of bookingsToCreate) {
            await dbService.createItem('bookings', booking, 'Booking');
          }
          
          toast.success(`Successfully created ${bookingsToCreate.length} bookings`);
          
          // Update local state
          const staffData = await fetchServices();
          const customerData = await fetchCustomers();
          await fetchBookings(staffData, customerData);
          setIsCreating(false);
        } else if (isCreating) {
          // Create a single new booking
          await dbService.createItem('bookings', dataToSave, 'Booking');
          
          // Update local state
          const staffData = await fetchServices();
          const customerData = await fetchCustomers();
          await fetchBookings(staffData, customerData);
          setIsCreating(false);
          setEditItem(null);
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
      console.error('Error:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  // Use DatabaseService singleton to delete
  const handleDeleteSelected = async () => {
    try {
      const dbService = DatabaseService.getInstance();
      
      // Delete selected bookings
      await dbService.deleteItems('bookings', selectedRows, 'Booking');
      
      // Update local state
      setBookings(bookings.filter((item) => !selectedRows.includes(item.id)));
      setSelectedRows([]);
    } catch (error) {
      console.error('Error deleting bookings:', error);
      // Error handling is already displayed via toast in DatabaseService
    }
  };

  // Filter bookings by status
  const filteredBookings = statusFilter === 'all' 
    ? bookings 
    : bookings.filter(booking => booking.status === statusFilter);

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
        onClick={() => {
          setIsCreating(true);
          setEditItem({
            customer_id: customers.length > 0 ? customers[0].id : null,
            service_id: services.length > 0 ? services[0].id : null,
            start_time: new Date().toISOString().slice(0, 16),
            status: "pending",
            notes: "",
            recurring_type: null,
            recurring_count: 1
          });
        }}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 my-4"
      >
        Create New Booking
      </button>

      {/* Delete Selected button */}
      <button
        onClick={handleDeleteSelected}
        className={`${selectedRows.length === 0 ? 'bg-gray-400 hover:bg-gray-500' : 'bg-red-500 hover:bg-red-600'} text-white px-4 py-2 rounded-lg my-4 ml-2`}
        disabled={selectedRows.length === 0}
      >
        Delete Selected
      </button>

      {/* Status filter and time filter */}
      <div className="my-4 flex items-center space-x-4">
        <div>
          <label className="mr-2 font-medium">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
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
            <option value="all">All Bookings</option>
            <option value="today+">Today & Future</option>
            <option value="past">Past Bookings</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <Table
        columns={[
          { key: "customer_name", label: "Customer" },
          { key: "service_name", label: "Service" },
          { key: "booking_time_formatted", label: "Booking Time" },
          { key: "duration", label: "Duration (mins)" },
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
          // Ensure start_time is formatted for datetime-local input (YYYY-MM-DDThh:mm)
          const formattedBooking = {
            ...booking,
            start_time: booking.start_time ? new Date(booking.start_time).toISOString().slice(0, 16) : ''
          };
          setEditItem(formattedBooking);
        }}
      />

      {/* Edit/Create popup */}
      {(editItem || isCreating) && (
        <GenericForm
          data={editItem}
          onSave={handleSave}
          onCancel={() => {
            setEditItem(null);
            setIsCreating(false);
          }}
          title={isCreating ? "Create New Booking" : "Edit Booking"}
          fields={[
            { 
              key: "customer_id", 
              label: "Customer", 
              type: "select",
              required: true,
              options: customers.map(customer => ({
                value: customer.id,
                label: customer.full_name
              })),
              placeholder: "Select Customer"
            },
            { 
              key: "service_id", 
              label: "Service", 
              type: "select",
              required: true,
              options: services.map(service => ({
                value: service.id,
                label: service.name
              })),
              placeholder: "Select Service"
            },
            { 
              key: "status", 
              label: "Status", 
              type: "select",
              required: true,
              options: [
                { value: "pending", label: "Pending" },
                { value: "confirmed", label: "Confirmed" },
                { value: "completed", label: "Completed" },
                { value: "cancelled", label: "Cancelled" }
              ]
            },
            { 
              key: "notes", 
              label: "Notes", 
              type: "textarea" 
            },
            { 
              key: "start_time", 
              label: "Booking Time", 
              type: "custom",
              required: true,
              renderField: () => (
                <TimeSlotPicker
                  value={editItem?.start_time || ''}
                  onChange={(e) => {
                    const updatedItem = { ...editItem, start_time: e.target.value };
                    setEditItem(updatedItem);
                  }}
                  interval={bookingTimeInterval}
                  required={true}
                />
              )
            },
            { 
              key: "show_recurring", 
              text: "Recurring booking", 
              type: "checkbox",
              onChange: (e) => {
                if (!e.target.checked) {
                  const updatedItem = { 
                    ...editItem, 
                    recurring_type: null, 
                    recurring_count: 1,
                    show_recurring: false
                  };
                  setEditItem(updatedItem);
                } else {
                  setEditItem({ ...editItem, show_recurring: true });
                }
              }
            },
            { 
              key: "recurring_type", 
              label: "Recurring Type", 
              type: "select",
              options: recurringOptions,
              placeholder: "Select recurring type",
              dependsOn: {
                field: "show_recurring",
                value: true
              }
            },
            { 
              key: "recurring_count", 
              label: "Number of Occurrences", 
              type: "number",
              min: 2,
              max: 52,
              defaultValue: 2,
              dependsOn: {
                field: "show_recurring",
                value: true
              }
            },
          ]}
        />
      )}

      {/* Toast Container */}
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}

export default withErrorHandling(BookingsTab, 'Booking');