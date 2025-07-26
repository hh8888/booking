import React, { useState, useEffect, useRef } from 'react';
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
// Change this line:
// import { useDashboardUser } from '../../hooks/useDashboardUser';
// To:
import useDashboardUser from '../../hooks/useDashboardUser';
import { BOOKING_STATUS, TABLES, SUCCESS_MESSAGES, ERROR_MESSAGES, QUERY_FILTERS } from '../../constants';

const CustomerDashboard = () => {
  const { user, loading: userLoading } = useUser();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [customerData, setCustomerData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('profile');
  const [editingBooking, setEditingBooking] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  
  // Add this line to declare the ref
  const initializationRef = useRef(false);
  // Add a new ref to track location restoration
  const locationRestorationRef = useRef(false);
  
  // Use custom hooks for shared logic
  const { businessName } = useBusinessInfo();
  const { userEmail, userRole, userName, currentUserId } = useDashboardUser();

  // Define fetchCustomerBookings function
  const fetchCustomerBookings = async () => {
    if (customerData) {
      try {
        const dbService = DatabaseService.getInstance();
        const locationService = LocationService.getInstance();
        const bookingService = new BookingService();
        
        // Get current selected location
        const currentLocationId = locationService.getSelectedLocationId();
        
        // Build filter object with customer_id and optionally location
        const filter = { customer_id: customerData.id };
        if (currentLocationId) {
          filter.location = currentLocationId;
        }
        
        // Fetch customer's bookings filtered by location
        const customerBookings = await dbService.fetchData(TABLES.BOOKINGS, 'start_time', false, filter);
        
        // Get services and staff data for booking details
        const [servicesData, staffData] = await Promise.all([
          dbService.fetchData(TABLES.SERVICES, 'name'),
          dbService.fetchData(TABLES.USERS, 'full_name', false, QUERY_FILTERS.ROLE_STAFF)
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
        toast.error(ERROR_MESSAGES.FAILED_LOAD_BOOKINGS);
      }
    }
  };

  // Define refreshBookings function
  const refreshBookings = async () => {
    if (customerData) {
      try {
        const dbService = DatabaseService.getInstance();
        const locationService = LocationService.getInstance();
        const bookingService = new BookingService();
        
        const currentLocationId = locationService.getSelectedLocationId();
        const filter = { customer_id: customerData.id };
        if (currentLocationId) {
          filter.location = currentLocationId;
        }
        
        const customerBookings = await dbService.fetchData(TABLES.BOOKINGS, 'start_time', false, filter);
        
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
        setBookings(processedBookings);
      } catch (error) {
        console.error('Error refreshing bookings:', error);
        toast.error(ERROR_MESSAGES.FAILED_REFRESH_BOOKINGS);
      }
    }
  };

  // MOVE ALL useEffect HOOKS HERE - BEFORE ANY CONDITIONAL RETURNS
  useEffect(() => {
    const initCustomerData = async () => {
      // Prevent multiple initializations
      if (initializationRef.current || !user || !user.id) {
        return;
      }
      
      initializationRef.current = true;
      
      console.log('=== CustomerDashboard initCustomerData START ===');
      console.log('User:', user);
      
      try {
        const dbService = DatabaseService.getInstance();
        console.log('DatabaseService instance:', dbService);
        
        // Get or create customer record for current user
        let customer = await dbService.fetchData(TABLES.USERS, 'created_at', false, { 
          id: user.id
        });
        
        console.log('Fetched customer:', customer);
        
        if (customer.length === 0) {
          // Create customer record if doesn't exist
          const newCustomer = {
            id: user.id,
            email: user.email || null,
            phone_number: user.phone || null,
            full_name: user.user_metadata?.full_name || user.email || user.phone,
            post_code: user.user_metadata?.post_code || null,
            birthday: user.user_metadata?.birthday || null,
            gender: user.user_metadata?.gender || null,
            role: 'customer'
          };
          console.log('Creating new customer:', newCustomer);
          const created = await dbService.createItem(TABLES.USERS, newCustomer);
          console.log('Created customer:', created);
          setCustomerData(created[0]);
        } else {
          const existingCustomer = customer[0];
          setCustomerData(existingCustomer);

          // Restore last selected location if available
          if (existingCustomer.last_location) {
            locationRestorationRef.current = true; // Set flag before restoration
            const locationService = LocationService.getInstance();
            // Initialize locations first, then set the selected location
            await locationService.initializeLocations(dbService);
            
            // Find the location object by ID
            const locations = locationService.getLocations();
            const savedLocation = locations.find(loc => loc.id === existingCustomer.last_location);
            
            if (savedLocation) {
              locationService.setSelectedLocation(savedLocation);
              console.log('Restored last location:', savedLocation);
            }
            
            // Reset flag after a short delay to allow for any pending location changes
            setTimeout(() => {
              locationRestorationRef.current = false;
            }, 100);
          }
        }
      } catch (error) {
        console.error('Error initializing customer data:', error);
        setError(`${ERROR_MESSAGES.FAILED_LOAD_CUSTOMER_INFO}: ${error.message}`);
        toast.error(ERROR_MESSAGES.FAILED_LOAD_CUSTOMER_INFO);
      } finally {
        setLoading(false);
      }
      
      console.log('=== CustomerDashboard initCustomerData END ===');
    };

    initCustomerData();
  }, [user?.id]);

  // Fetch customer bookings when customerData changes
  useEffect(() => {
    fetchCustomerBookings();
  }, [customerData]);

  // Add location change listener to save location
  useEffect(() => {
    const locationService = LocationService.getInstance();
    
    // Add listener for location changes
    const removeListener = locationService.addLocationChangeListener(async (newLocation) => {
      console.log('Location changed, refetching bookings...');
      fetchCustomerBookings();
      
      // Save the new location to user's last_location field only if:
      // 1. Loading is finished
      // 2. Not during location restoration
      // 3. This is a user-initiated change
      if (customerData && newLocation && !userLoading && !loading && 
          initializationRef.current && !locationRestorationRef.current) {
        // Additional check: only save if the location is actually different from current
        if (customerData.last_location !== newLocation.id) {
          try {
            const dbService = DatabaseService.getInstance();
            await dbService.updateItem(TABLES.USERS, {
              id: customerData.id,
              last_location: newLocation.id
            }, 'User');
            console.log('Saved user last_location:', newLocation.id);
            
            // Update local customerData state
            setCustomerData(prev => ({
              ...prev,
              last_location: newLocation.id
            }));
          } catch (error) {
            console.error('Error saving user location:', error);
          }
        } else {
          console.log('Location unchanged, skipping save');
        }
      } else {
        console.log('Skipping location save - loading in progress, initialization not complete, or during restoration');
      }
    });
    
    // Cleanup listener on unmount
    return () => {
      removeListener();
    };
  }, [customerData, userLoading, loading]);

  // NOW CONDITIONAL RETURNS CAN HAPPEN AFTER ALL HOOKS
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
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  // Update the loading condition to include userLoading
  if (userLoading || loading) {
    return <LoadingSpinner fullScreen={true} text={t('common.loading')} />;
  }

  if (!customerData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-red-600">{t('messages.error.pleaseLogin')}</div>
      </div>
    );
  }

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
        toast.success(SUCCESS_MESSAGES.BOOKING_UPDATED);
      } else {
        console.log('Creating new booking...');
        const result = await bookingService.createBooking(bookingWithCustomer);
        console.log('Create result:', result);
        toast.success(SUCCESS_MESSAGES.BOOKING_CREATED);
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

  const handleProfileUpdate = async () => {
    // Refresh customer data when profile is updated
    if (user) {
      try {
        const dbService = DatabaseService.getInstance();
        const customer = await dbService.fetchData(TABLES.USERS, 'created_at', false, { 
          id: user.id
        });
        
        if (customer.length > 0) {
          setCustomerData(customer[0]);
        }
      } catch (error) {
        console.error('Error refreshing customer data:', error);
      }
    }
  };



  // Update the loading condition to include userLoading
  if (userLoading || loading) {
    return <LoadingSpinner fullScreen={true} text={t('common.loading')} />;
  }

  if (!customerData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-red-600">{t('messages.error.pleaseLogin')}</div>
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