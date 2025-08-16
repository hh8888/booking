import React from 'react';
import DateTimeFormatter from '../../utils/DateTimeFormatter';
import LocationService from '../../services/LocationService';
import { getBookingStatusClass, isUpcomingBooking, isPendingBooking } from '../../utils';
import { useLanguage } from '../../contexts/LanguageContext';
import { USER_ROLES } from '../../constants';
import useDashboardUser from '../../hooks/useDashboardUser';

const BookingCard = ({ 
  booking, 
  showActions = false, 
  showCreatedAt = false, 
  showUpcomingBadge = false,
  showStaffComments = false,
  onEdit = null, 
  onCancel = null 
}) => {
  const { t } = useLanguage();
  const { user: currentUser } = useDashboardUser();
  
  const getLocationName = (locationId) => {
    const locationService = LocationService.getInstance();
    if (!locationId || (typeof locationId === 'string' && locationId.trim() === '')) {
      return t('bookings.locationTBD');
    }
    const locationName = locationService.getLocationNameById(locationId);
    return locationName === 'Unknown Location' ? t('bookings.locationTBD') : locationName;
  };

  const bookingDate = new Date(booking.start_date || booking.start_time);
  const isUpcoming = isUpcomingBooking(booking) || bookingDate > new Date();
  const canEdit = showActions && isUpcoming && isPendingBooking(booking);
  
  // Check if booking is in the past
  const isPastBooking = bookingDate < new Date() && !isUpcoming;
  
  // Check if current user can see staff comments
  const canViewStaffComments = currentUser && (
    currentUser.role === USER_ROLES.STAFF || 
    currentUser.role === USER_ROLES.MANAGER || 
    currentUser.role === USER_ROLES.ADMIN
  );
  
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition duration-200">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-gray-900">{booking.service_name}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBookingStatusClass(booking.status)}`}>
              {booking.status}
            </span>
            {showUpcomingBadge && isUpcoming && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {t('bookings.upcoming')}
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="calendar-icon">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>
                {booking.start_time 
                  ? DateTimeFormatter.getInstance().formatDate(booking.start_time)
                  : bookingDate.toLocaleDateString()
                }
              </span>
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
            
            {/* Customer Information (for staff/admin view) */}
            {booking.customer_name && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="customer-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>{t('bookings.customer')}: {booking.customer_name}</span>
              </div>
            )}
            
            {/* Customer Email */}
            {booking.customer_email && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="email-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>{t('bookings.email')}: {booking.customer_email}</span>
              </div>
            )}
            
            {/* Customer Phone */}
            {booking.customer_phone && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="phone-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>{t('bookings.phone')}: {booking.customer_phone}</span>
              </div>
            )}
            
            {/* Service Price */}
            {booking.price && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="price-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span>{t('bookings.price')}: ${booking.price}</span>
              </div>
            )}
            
            {showCreatedAt && booking.created_at && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{t('bookings.createdAt')}: {DateTimeFormatter.getInstance().formatDate(booking.created_at)}</span>
              </div>
            )}
            
            {/* Remove the Booking ID section - comment out or delete these lines */}
            {/* {booking.id && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="id-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                <span>{t('bookings.bookingId')}: #{booking.id}</span>
              </div>
            )} */}
          </div>
          
          {/* Customer Notes - Always show, even if empty */}
          <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
            <strong>{t('common.notes')}:</strong> {booking.notes || t('common.notProvided')}
          </div>
          
          {/* Staff Comments - Always show for authorized users, even if empty */}
          {(showStaffComments || canViewStaffComments) && (
            <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-gray-700">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                
                <strong className="text-blue-800">{t('bookings.staffComments')}:</strong>
              <div className="text-blue-700">{booking.staff_comments || t('common.notProvided')}</div>
            </div>
          )}
        </div>
        
        {showActions && !isPastBooking && (
          <div className="flex gap-2 ml-4 w-20 justify-end">
            {canEdit ? (
              <>
                <button 
                  onClick={() => onEdit(booking)}
                  className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition duration-200"
                  title={t('bookings.editBookingTitle')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                
                <button 
                  onClick={() => onCancel(booking.id)}
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
        )}
      </div>
    </div>
  );
};

export default BookingCard;