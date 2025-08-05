import React, { useState, useEffect } from 'react';
import BookingCard from '../common/BookingCard';
import LocationService from '../../services/LocationService';
import { CSS_CLASSES } from '../../constants';
import { useLanguage } from '../../contexts/LanguageContext';

const CustomerBookingsList = ({ bookings, onNewBooking, onEditBooking, onCancelBooking }) => {
  const { t } = useLanguage();
  const [showPastBookings, setShowPastBookings] = useState(false);
  const [locations, setLocations] = useState([]);
  
  // Fetch locations for display
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const locationService = LocationService.getInstance();
        // Initialize locations if not already done
        await locationService.initializeLocations();
        const locationData = locationService.getLocations();
        setLocations(locationData);
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    };
    
    fetchLocations();
  }, []);
  
  // Helper function to get location name by ID
  const getLocationName = (locationId) => {
    const locationService = LocationService.getInstance();
    if (!locationId || (typeof locationId === 'string' && locationId.trim() === '')) {
      return t('bookings.locationTBD');
    }
    const locationName = locationService.getLocationNameById(locationId);
    return locationName === 'Unknown Location' ? t('bookings.locationTBD') : locationName;
  };
  
  // Using centralized utility function for status colors
  // const getStatusColor = getBookingStatusClass; // Now imported from utils

  // Helper function to check if a date is today
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Helper function to sort bookings by time
  const sortBookingsByTime = (bookings) => {
    return bookings.sort((a, b) => {
      const timeA = parseInt(a.start_time_hour) * 60 + parseInt(a.start_time_minute);
      const timeB = parseInt(b.start_time_hour) * 60 + parseInt(b.start_time_minute);
      return timeA - timeB;
    });
  };

  // Separate bookings into today, upcoming, and past
  const now = new Date();
  const todayBookings = sortBookingsByTime(
    bookings.filter(booking => {
      const bookingDate = new Date(booking.start_date);
      return isToday(bookingDate);
    })
  );
  
  const upcomingBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.start_date);
    return bookingDate > now && !isToday(bookingDate);
  });
  
  const pastBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.start_date);
    return bookingDate < now && !isToday(bookingDate);
  });

  const renderBooking = (booking) => (
    <BookingCard
      key={booking.id}
      booking={booking}
      showActions={true}
      onEdit={onEditBooking}
      onCancel={onCancelBooking}
    />
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{t('bookings.yourBookings')}</h2>
        <button 
          onClick={onNewBooking}
          className={`${CSS_CLASSES.BUTTON_PRIMARY} flex items-center gap-2`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('bookings.newBooking')}
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-12 min-h-[200px] flex flex-col justify-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4v10a2 2 0 002 2h4a2 2 0 002-2V11m-6 0h8m-8 0V7a2 2 0 012-2h4a2 2 0 012 2v4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('bookings.noBookingsYet')}</h3>
          <p className="text-gray-500 mb-4">{t('bookings.startByCreating')}</p>
          <button 
            onClick={onNewBooking}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
          >
            {t('customer.bookNow')}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Today's Bookings - Sorted by time */}
          {todayBookings.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('bookings.todaysBookings')}</h3>
              <div className="space-y-4">
                {todayBookings.map(renderBooking)}
              </div>
            </div>
          )}
          
          {/* Upcoming Bookings */}
          {upcomingBookings.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('bookings.upcomingBookings')}</h3>
              <div className="space-y-4">
                {upcomingBookings.map(renderBooking)}
              </div>
            </div>
          )}
          
          {/* Past Bookings - Collapsible */}
          {pastBookings.length > 0 && (
            <div>
              <button
                onClick={() => setShowPastBookings(!showPastBookings)}
                className="flex items-center gap-2 text-lg font-medium text-gray-900 hover:text-gray-700 transition duration-200 mb-4"
              >
                <svg 
                  className={`w-5 h-5 transition-transform duration-200 ${showPastBookings ? 'rotate-90' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {t('bookings.pastBookings')} ({pastBookings.length})
              </button>
              
              {showPastBookings && (
                <div className="space-y-4">
                  {pastBookings.map(renderBooking)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerBookingsList;