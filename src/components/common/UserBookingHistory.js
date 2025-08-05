import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import BookingCard from './BookingCard';
import DatabaseService from '../../services/DatabaseService';
import BookingService from '../../services/BookingService';
import LocationService from '../../services/LocationService';
import DateTimeFormatter from '../../utils/DateTimeFormatter';
import { TABLES, BOOKING_STATUS } from '../../constants';
import { getBookingStatusClass } from '../../utils/bookingUtils';
import { useLanguage } from '../../contexts/LanguageContext';
import LoadingSpinner from './LoadingSpinner';

const UserBookingHistory = ({ user, onClose }) => {
  const { t } = useLanguage();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserBookings();
  }, [user.id]);

  const fetchUserBookings = async () => {
    try {
      setLoading(true);
      const dbService = DatabaseService.getInstance();
      const bookingService = new BookingService();
      
      // Fetch user's bookings
      const userBookings = await dbService.fetchData(
        TABLES.BOOKINGS, 
        'start_time', 
        false, 
        { customer_id: user.id }
      );
      
      // Get services and staff data for booking details
      const [servicesData, staffData] = await Promise.all([
        dbService.fetchData(TABLES.SERVICES, 'name'),
        dbService.fetchData(TABLES.USERS, 'full_name')
      ]);
      
      // Process bookings with additional details
      const processedBookings = bookingService.processBookingsData(
        userBookings,
        servicesData,
        [user],
        staffData
      );
      
      // Sort bookings by date (newest first)
      const sortedBookings = processedBookings.sort((a, b) => 
        new Date(b.start_time) - new Date(a.start_time)
      );
      
      setBookings(sortedBookings);
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      setError('Failed to load booking history');
    } finally {
      setLoading(false);
    }
  };

  const getLocationName = (locationId) => {
    if (!locationId) return t('bookings.locationTBD');
    const locationService = LocationService.getInstance();
    return locationService.getLocationNameById(locationId) || t('bookings.locationTBD');
  };

  const renderBookingCard = (booking) => (
    <BookingCard
      key={booking.id}
      booking={booking}
      showCreatedAt={true}
      showUpcomingBadge={true}
      showStaffComments={true}
    />
  );

  // Separate bookings into categories
  const now = new Date();
  const upcomingBookings = bookings.filter(booking => new Date(booking.start_time) > now);
  const pastBookings = bookings.filter(booking => new Date(booking.start_time) <= now);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('bookings.bookingHistory')} - {user.full_name || user.email}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <LoadingSpinner text={t('bookings.loadingBookings')} />
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-4">{error}</div>
              <button 
                onClick={fetchUserBookings}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                {t('common.retry')}
              </button>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('bookings.noBookingsFound')}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Upcoming Bookings */}
              {upcomingBookings.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {t('bookings.upcomingBookings')} ({upcomingBookings.length})
                  </h3>
                  <div className="space-y-4">
                    {upcomingBookings.map(renderBookingCard)}
                  </div>
                </div>
              )}
              
              {/* Past Bookings */}
              {pastBookings.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {t('bookings.pastBookings')} ({pastBookings.length})
                  </h3>
                  <div className="space-y-4">
                    {pastBookings.map(renderBookingCard)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserBookingHistory;