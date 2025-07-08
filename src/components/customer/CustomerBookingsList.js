import React, { useState, useEffect } from 'react';
import DateTimeFormatter from '../../utils/DateTimeFormatter';
import LocationService from '../../services/LocationService';
import { BOOKING_STATUS, CSS_CLASSES } from '../../constants';
import { getBookingStatusClass, isUpcomingBooking, isPendingBooking } from '../../utils';
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

  const renderBooking = (booking) => {
    const bookingDate = new Date(booking.start_date);
    const isUpcoming = isUpcomingBooking(booking) || isToday(bookingDate);
    
    return (
      <div key={booking.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition duration-200">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-gray-900">{booking.service_name}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBookingStatusClass(booking.status)}`}>
                {booking.status}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="calendar-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4v10a2 2 0 002 2h4a2 2 0 002-2V11m-6 0h8m-8 0V7a2 2 0 012-2h4a2 2 0 012 2v4" />
                </svg>
                <span>{bookingDate.toLocaleDateString()}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="clock-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  {(() => {
                    const hour = parseInt(booking.start_time_hour);
                    const minute = parseInt(booking.start_time_minute);
                    const period = hour >= 12 ? 'PM' : 'AM';
                    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                    return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
                  })()} 
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="user-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>{t('bookings.provider')}: {booking.provider_name && booking.provider_name.trim() ? booking.provider_name : t('bookings.providerTBD')}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="duration-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>{booking.duration} {t('bookings.minutes')}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="location-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{t('bookings.location')}: {getLocationName(booking.location)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 ml-4 w-20 justify-end">
            {isUpcoming && isPendingBooking(booking) ? (
              <>
                <button 
                  onClick={() => onEditBooking(booking)}
                  className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition duration-200"
                  title={t('bookings.editBookingTitle')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                
                <button 
                  onClick={() => onCancelBooking(booking.id)}
                  className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition duration-200"
                  title={t('bookings.cancelBookingTitle')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                <button 
                  disabled
                  className="text-gray-300 p-2 rounded-lg cursor-not-allowed"
                  title={t('bookings.editNotAvailable')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                
                <button 
                  disabled
                  className="text-gray-300 p-2 rounded-lg cursor-not-allowed"
                  title={t('bookings.cancelNotAvailable')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

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