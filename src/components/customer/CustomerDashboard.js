import React, { useState, useEffect } from 'react';
import { useUser } from '../../hooks/useUser';
import { useNavigate } from 'react-router-dom';
import DatabaseService from '../../services/DatabaseService';
import BookingService from '../../services/BookingService';
import { toast } from 'react-toastify';
import CustomerProfile from './CustomerProfile';
import CustomerBookingsList from './CustomerBookingsList';
import CustomerBooking from './CustomerBooking';
import BookingSteps from './BookingSteps';
import ToastMessage from '../common/ToastMessage';
import LocationSelector from '../common/LocationSelector';
import { supabase } from '../../supabaseClient';
import LoadingSpinner from '../common/LoadingSpinner';

const CustomerDashboard = () => {
  const { user } = useUser();
  const navigate = useNavigate(); // Add this hook
  const [customerData, setCustomerData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initCustomerData = async () => {
      console.log('=== CustomerDashboard initCustomerData START ===');
      console.log('User:', user);
      
      if (user) {
        try {
          const dbService = DatabaseService.getInstance();
          console.log('DatabaseService instance:', dbService);
          
          // Get or create customer record for current user
          let customer = await dbService.fetchData('users', 'created_at', false, { 
            id: user.id  // Use user ID instead of email
          });
          
          console.log('Fetched customer:', customer);
          
          if (customer.length === 0) {
            // Create customer record if doesn't exist
            const newCustomer = {
              id: user.id,
              email: user.email || null,
              phone_number: user.phone || null,  // Add phone number from auth user
              full_name: user.user_metadata?.full_name || user.email || user.phone,
              post_code: user.user_metadata?.post_code || null,
              birthday: user.user_metadata?.birthday || null,
              gender: user.user_metadata?.gender || null,
              role: 'customer'
            };
            console.log('Creating new customer:', newCustomer);
            const created = await dbService.createItem('users', newCustomer);
            console.log('Created customer:', created);
            setCustomerData(created[0]);
          } else {
            setCustomerData(customer[0]);
          }
        } catch (error) {
          console.error('Error initializing customer data:', error);
          setError('Failed to load customer information: ' + error.message);
          toast.error('Failed to load customer information');
        }
      }
      setLoading(false);
      console.log('=== CustomerDashboard initCustomerData END ===');
    };

    initCustomerData();
  }, [user]);

  // Add error state handling
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const fetchCustomerBookings = async () => {
      if (customerData) {
        try {
          const dbService = DatabaseService.getInstance();
          const bookingService = new BookingService();
          
          // Fetch customer's bookings
          const customerBookings = await dbService.fetchData('bookings', 'start_time', false, {
            customer_id: customerData.id
          });
          
          // Get services and staff data for booking details
          const [servicesData, staffData] = await Promise.all([
            dbService.fetchData('services', 'name'),
            dbService.fetchData('users', 'full_name', false, { role: 'staff' })
          ]);
          
          // Process bookings with additional details
          const processedBookings = bookingService.processBookingsData(
            customerBookings, 
            servicesData, 
            [customerData],
            staffData
          );
          
          setBookings(processedBookings);
        } catch (error) {
          console.error('Error fetching bookings:', error);
          toast.error('Failed to load bookings');
        }
      }
    };

    fetchCustomerBookings();
  }, [customerData]);

  const refreshBookings = async () => {
    if (customerData) {
      try {
        const dbService = DatabaseService.getInstance();
        const bookingService = new BookingService();
        const customerBookings = await dbService.fetchData('bookings', 'start_time', false, {
          customer_id: customerData.id
        });
        const [servicesData, staffData] = await Promise.all([
          dbService.fetchData('services', 'name'),
          dbService.fetchData('users', 'full_name', false, { role: 'staff' })
        ]);
        const processedBookings = bookingService.processBookingsData(
          customerBookings, 
          servicesData, 
          [customerData],
          staffData
        );
        setBookings(processedBookings);
      } catch (error) {
        console.error('Error refreshing bookings:', error);
        toast.error('Failed to refresh bookings');
      }
    }
  };

  const handleBookingSave = async (bookingData) => {
    console.log('=== CustomerDashboard handleBookingSave CALLED ===');
    console.log('Received bookingData:', bookingData);
    console.log('Customer data:', customerData);
    console.log('Editing booking:', editingBooking);
    
    try {
      const bookingService = BookingService.getInstance();
      
      const bookingWithCustomer = {
        ...bookingData,
        customer_id: customerData.id
      };
      
      console.log('Final booking data to save:', bookingWithCustomer);
      
      // Actually save the booking to the database
      if (editingBooking) {
        console.log('Updating existing booking with ID:', editingBooking.id);
        const bookingWithId = {
          ...bookingWithCustomer,
          id: editingBooking.id
        };
        await bookingService.updateBooking(bookingWithId);
        console.log('Update completed');
        toast.success('Booking updated successfully!');
      } else {
        console.log('Creating new booking...');
        const result = await bookingService.createBooking(bookingWithCustomer);
        console.log('Create result:', result);
        toast.success('Booking created successfully!');
      }
      
      console.log('Closing booking form and refreshing...');
      setShowBookingForm(false);
      setEditingBooking(null);
      
      // Refresh bookings list
      await refreshBookings();
      console.log('=== CustomerDashboard handleBookingSave SUCCESS ===');
    } catch (error) {
      console.error('=== CustomerDashboard handleBookingSave ERROR ===');
      console.error('Error saving booking:', error);
      console.error('Error stack:', error.stack);
      toast.error(`Failed to save booking: ${error.message}`);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      try {
        const dbService = DatabaseService.getInstance();
        await dbService.updateItem('bookings', { id: bookingId, status: 'cancelled' }, 'Booking');
        toast.success('Booking cancelled successfully');
        
        // Refresh bookings
        setBookings(prev => prev.map(booking => 
          booking.id === bookingId ? { ...booking, status: 'cancelled' } : booking
        ));
      } catch (error) {
        console.error('Error cancelling booking:', error);
        toast.error('Failed to cancel booking');
      }
    }
  };

  const handleNewBooking = () => {
    setEditingBooking(null);
    setShowBookingForm(true);
  };

  const handleEditBooking = (booking) => {
    setEditingBooking(booking);
    setShowBookingForm(true);
  };

  const handleCloseBookingForm = () => {
    setShowBookingForm(false);
    setEditingBooking(null);
  };

  // Add logout function
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error signing out: ' + error.message);
    } else {
      navigate('/'); // Navigate to home page instead of reloading
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen={true} text="Loading dashboard..." />;
  }

  if (!customerData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-red-600">Please log in to access your dashboard</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {customerData.full_name}!</h1>
              <p className="text-gray-600">Manage your appointments and book new services</p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-4">
              <LocationSelector />
              <button
                onClick={handleSignOut}
                className="bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition duration-200 text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Booking Steps Section */}
        <BookingSteps />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Personal Information */}
          <div className="lg:col-span-1">
            <CustomerProfile customerData={customerData} />
          </div>

          {/* Bookings Section */}
          <div className="lg:col-span-2">
            <CustomerBookingsList 
              bookings={bookings}
              onNewBooking={handleNewBooking}
              onEditBooking={handleEditBooking}
              onCancelBooking={handleCancelBooking}
            />
          </div>
        </div>
      </div>

      {/* Booking Form Modal */}
      {showBookingForm && (
        <CustomerBooking
          customerData={customerData}
          editingBooking={editingBooking}
          onSave={handleBookingSave}
          onCancel={handleCloseBookingForm}
        />
      )}
      
      {/* Add ToastMessage component */}
      <ToastMessage />
    </div>
  );
};

export default CustomerDashboard;