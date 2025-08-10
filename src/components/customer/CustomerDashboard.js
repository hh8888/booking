import React, { useState, useEffect, useRef,useCallback } from 'react';
import { useUser } from '../../hooks/useUser';
import { useNavigate } from 'react-router-dom';
import DatabaseService from '../../services/DatabaseService';
import LocationService from '../../services/LocationService';
import BookingService from '../../services/BookingService';
import { toast } from 'react-toastify';
import CustomerProfile from './CustomerProfile';
import CustomerBookingsList from './CustomerBookingsList';
import CustomerBooking from './CustomerBooking';
import BookingSteps from './BookingSteps';
import ToastMessage from '../common/ToastMessage';
import LocationSelector from '../common/LocationSelector';
import UserDropdown from '../common/UserDropdown';
import SessionIndicator from '../common/SessionIndicator';
import { supabase } from '../../supabaseClient';
import LoadingSpinner from '../common/LoadingSpinner';
import { useBusinessInfo } from '../../hooks/useBusinessInfo';
import { useLanguage } from '../../contexts/LanguageContext';
import useDashboardUser from '../../hooks/useDashboardUser';
import useCustomerRealtime from '../../hooks/useCustomerRealtime';
// Remove this line:
// import useLocationManager from '../../hooks/useLocationManager';
import { BOOKING_STATUS, TABLES, SUCCESS_MESSAGES, ERROR_MESSAGES, QUERY_FILTERS } from '../../constants';

// Remove the useUser import at the top
// import { useUser } from '../../hooks/useUser';

const CustomerDashboard = () => {
  console.log('🔄 CustomerDashboard: Component render started');
  
  // Remove this line
  // const { user, loading: userLoading } = useUser();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [customerData, setCustomerData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('profile');
  const [editingBooking, setEditingBooking] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  
  // Use custom hooks for shared logic
  const { businessName } = useBusinessInfo();
  // Get all user data from useDashboardUser
  const { userEmail, userRole, userName, currentUserId, loading: userLoading } = useDashboardUser();
  
  console.log('🔄 CustomerDashboard: State values:', {
    userLoading,
    loading,
    customerDataId: customerData?.id,
    currentUserId,
    bookingsCount: bookings.length
  });
  
  // Remove this entire block (lines 41-46):
  // useLocationManager({
  //   userId: customerData?.id,
  //   lastLocation: customerData?.last_location,
  //   userLoading,
  //   userType: 'customer'
  // });


  // Define fetchCustomerBookings function with useCallback to prevent recreation
  const fetchCustomerBookings = useCallback(async () => {
    console.log('📊 fetchCustomerBookings: Starting fetch', {
      customerDataId: customerData?.id,
      hasCustomerData: !!customerData
    });
    
    if (customerData) {
      try {
        const dbService = DatabaseService.getInstance();
        const locationService = LocationService.getInstance();
        const bookingService = new BookingService();
        
        // Get current selected location
        const currentLocationId = locationService.getSelectedLocationId();
        console.log('📊 fetchCustomerBookings: Current location ID:', currentLocationId);
        
        // Build filter object with customer_id and optionally location
        const filter = { customer_id: customerData.id };
        if (currentLocationId) {
          filter.location = currentLocationId;
        }
        console.log('📊 fetchCustomerBookings: Filter object:', filter);
        
        // Fetch customer's bookings filtered by location
        const customerBookings = await dbService.fetchData(TABLES.BOOKINGS, 'start_time', false, filter);
        console.log('📊 fetchCustomerBookings: Raw bookings fetched:', customerBookings.length);
        
        // Get services and staff data for booking details
        const [servicesData, staffData] = await Promise.all([
          dbService.fetchData(TABLES.SERVICES, 'name'),
          dbService.fetchData(TABLES.USERS, 'full_name', false, QUERY_FILTERS.ROLE_STAFF)
        ]);
        console.log('📊 fetchCustomerBookings: Services and staff data fetched');
        
        // Process bookings with additional details
        const processedBookings = bookingService.processBookingsData(
          customerBookings, 
          servicesData, 
          [customerData],
          staffData
        );
        console.log('📊 fetchCustomerBookings: Processed bookings:', processedBookings.length);
        
        setBookings(processedBookings);
        console.log('📊 fetchCustomerBookings: Bookings state updated');
      } catch (error) {
        console.error('❌ fetchCustomerBookings: Error:', error);
        toast.error(ERROR_MESSAGES.FAILED_LOAD_BOOKINGS);
      }
    } else {
      console.log('📊 fetchCustomerBookings: No customer data, skipping fetch');
    }
  }, [customerData]); // Add customerData as dependency

  // Define refreshBookings function
  const refreshBookings = async () => {
    console.log('🔄 refreshBookings: Starting refresh');
    
    if (customerData) {
      try {
        const dbService = DatabaseService.getInstance();
        const locationService = LocationService.getInstance();
        const bookingService = new BookingService();
        
        const currentLocationId = locationService.getSelectedLocationId();
        console.log('🔄 refreshBookings: Current location ID:', currentLocationId);
        
        const filter = { customer_id: customerData.id };
        if (currentLocationId) {
          filter.location = currentLocationId;
        }
        console.log('🔄 refreshBookings: Filter object:', filter);
        
        const customerBookings = await dbService.fetchData(TABLES.BOOKINGS, 'start_time', false, filter);
        console.log('🔄 refreshBookings: Raw bookings fetched:', customerBookings.length);
        
        const [servicesData, staffData] = await Promise.all([
          dbService.fetchData(TABLES.SERVICES, 'name'),
          dbService.fetchData(TABLES.USERS, 'full_name', false, QUERY_FILTERS.ROLE_STAFF)
        ]);
        
        const processedBookings = bookingService.processBookingsData(
          customerBookings, 
          servicesData, 
          [customerData],
          staffData
        );
        console.log('🔄 refreshBookings: Processed bookings:', processedBookings.length);
        
        setBookings(processedBookings);
        console.log('🔄 refreshBookings: Bookings state updated');
      } catch (error) {
        console.error('❌ refreshBookings: Error:', error);
        toast.error(ERROR_MESSAGES.FAILED_REFRESH_BOOKINGS);
      }
    } else {
      console.log('🔄 refreshBookings: No customer data, skipping refresh');
    }
  };

  // Initialize customer data
  useEffect(() => {
    console.log('🚀 useEffect[initCustomerData]: Triggered', {
      userId: currentUserId,
      hasUser: !!currentUserId
    });
    
    const initCustomerData = async () => {
      if (!currentUserId) {
        console.log('🚀 initCustomerData: No user or user ID, returning early');
        return;
      }
      
      console.log('=== CustomerDashboard initCustomerData START ===');
      console.log('User ID:', currentUserId);
      
      try {
        const dbService = DatabaseService.getInstance();
        console.log('DatabaseService instance:', dbService);
        
        // Get or create customer record for current user
        let customer = await dbService.fetchData(TABLES.USERS, 'created_at', false, { 
          id: currentUserId
        });
        
        console.log('🚀 initCustomerData: Fetched customer:', customer);
        
        if (customer.length === 0) {
          // Create customer record if doesn't exist
          const newCustomer = {
            id: currentUserId,
            email: userEmail || null,
            phone_number: null, // We don't have phone from useDashboardUser
            full_name: userName || userEmail,
            post_code: null, // We don't have post_code from useDashboardUser
            birthday: null, // We don't have birthday from useDashboardUser
            gender: null, // We don't have gender from useDashboardUser
            role: 'customer'
          };
          
          console.log('🚀 initCustomerData: Creating new customer:', newCustomer);
          const created = await dbService.createItem(TABLES.USERS, newCustomer);
          console.log('🚀 initCustomerData: Created customer:', created);
          setCustomerData(created[0]);
          console.log('🚀 initCustomerData: Customer data state set to new customer');
        } else {
          const existingCustomer = customer[0];
          console.log('🚀 initCustomerData: Setting existing customer:', existingCustomer);
          setCustomerData(existingCustomer);
          console.log('🚀 initCustomerData: Customer data state set to existing customer');
        }
      } catch (error) {
        console.error('❌ initCustomerData: Error:', error);
        setError(`${ERROR_MESSAGES.FAILED_LOAD_CUSTOMER_INFO}: ${error.message}`);
        toast.error(ERROR_MESSAGES.FAILED_LOAD_CUSTOMER_INFO);
      } finally {
        console.log('🚀 initCustomerData: Setting loading to false');
        setLoading(false);
      }
      
      console.log('=== CustomerDashboard initCustomerData END ===');
    };

    initCustomerData();
  }, [currentUserId]); // Changed from user?.id to currentUserId

  // Fetch customer bookings when customerData changes
  useEffect(() => {
    console.log('📊 useEffect[fetchCustomerBookings]: Triggered', {
      customerDataId: customerData?.id,
      hasCustomerData: !!customerData
    });
    
    fetchCustomerBookings();
  }, [customerData]);

  // Add location change listener to refetch bookings
  useEffect(() => {
    console.log('🌍 useEffect[locationListener]: Setting up location change listener');
    
    const locationService = LocationService.getInstance();
    
    // Add listener for location changes
    const removeListener = locationService.addLocationChangeListener(async (newLocation) => {
      console.log('🌍 Location change detected:', {
        newLocationId: newLocation?.id,
        newLocationName: newLocation?.name,
        customerDataId: customerData?.id
      });
      
      console.log('🌍 Calling fetchCustomerBookings due to location change...');
      fetchCustomerBookings();
    });
    
    console.log('🌍 Location change listener added');
    
    // Cleanup listener on unmount
    return () => {
      console.log('🌍 Cleaning up location change listener');
      removeListener();
    };
  }, []); // Remove customerData dependency - only set up listener once

  // Use the custom real-time hook
  useCustomerRealtime({
    customerData,
    refreshBookings,
    setCustomerData
  });

  // Error state handling
  if (error) {
    console.log('❌ CustomerDashboard: Rendering error state:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (userLoading || loading) {
    console.log('⏳ CustomerDashboard: Rendering loading state', { userLoading, loading });
    return <LoadingSpinner fullScreen={true} text={t('common.loading')} />;
  }

  // Authentication check
  if (!customerData) {
    console.log('🚫 CustomerDashboard: No customer data, rendering auth error');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-red-600">{t('messages.error.pleaseLogin')}</div>
      </div>
    );
  }

  console.log('✅ CustomerDashboard: Rendering main component');

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
        //toast.success(SUCCESS_MESSAGES.BOOKING_UPDATED);
      } else {
        console.log('Creating new booking...');
        const result = await bookingService.createBooking(bookingWithCustomer);
        console.log('Create result:', result);
        //toast.success(SUCCESS_MESSAGES.BOOKING_CREATED);
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
      toast.error(`${ERROR_MESSAGES.BOOKING_SAVE_ERROR}: ${error.message}`);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (window.confirm(t('bookings.confirmCancelBooking'))) {
      try {
        const dbService = DatabaseService.getInstance();
        await dbService.updateItem(TABLES.BOOKINGS, { id: bookingId, status: BOOKING_STATUS.CANCELLED }, 'Booking');
        toast.success(SUCCESS_MESSAGES.BOOKING_CANCELLED);
        
        // Refresh bookings
        setBookings(prev => prev.map(booking => 
          booking.id === bookingId ? { ...booking, status: BOOKING_STATUS.CANCELLED } : booking
        ));
      } catch (error) {
        console.error('Error cancelling booking:', error);
        toast.error(ERROR_MESSAGES.FAILED_CANCEL_BOOKING);
      }
    }
  };

  const handleNewBooking = () => {
    console.log('➕ handleNewBooking: Called');
    setEditingBooking(null);
    setShowBookingForm(true);
  };

  const handleEditBooking = (booking) => {
    console.log('✏️ handleEditBooking: Called with booking:', booking?.id);
    setEditingBooking(booking);
    setShowBookingForm(true);
  };

  const handleCloseBookingForm = () => {
    console.log('❌ handleCloseBookingForm: Called');
    setShowBookingForm(false);
    setEditingBooking(null);
  };

  const handleProfileUpdate = async () => {
    console.log('👤 handleProfileUpdate: Called');
    // Refresh customer data when profile is updated
    if (currentUserId) {
      try {
        const dbService = DatabaseService.getInstance();
        const customer = await dbService.fetchData(TABLES.USERS, 'created_at', false, { 
          id: currentUserId
        });
        
        if (customer.length > 0) {
          console.log('👤 handleProfileUpdate: Updated customer data:', customer[0]);
          setCustomerData(customer[0]);
        }
      } catch (error) {
        console.error('❌ handleProfileUpdate: Error:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">{businessName}</h1>
              <p className="text-gray-600">{t('customer.welcomeMessage', { name: customerData.full_name && !customerData.full_name.includes('@') ? customerData.full_name : (customerData.full_name ? customerData.full_name.split('@')[0] : t('customer.welcome')) })}</p>
              <LocationSelector />
            </div>
            <div className="flex items-center space-x-3 mt-4 sm:mt-0">
              <SessionIndicator />
              <UserDropdown 
                userEmail={userEmail}
                userRole={userRole}
                userName={userName}
                currentUserId={currentUserId}
                onProfileUpdate={handleProfileUpdate}
              />
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