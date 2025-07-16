import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import DashboardStats from './DashboardStats';
import BookingCalendar from './BookingCalendar';
import CalendarControls from './CalendarControls';
import { useLanguage } from '../../contexts/LanguageContext';
// Remove this import line
// import StaffLegend from './StaffLegend';
import EventModal from './EventModal';
import EditBookingPopup from '../booking/EditBookingPopup';
import ToastMessage from '../common/ToastMessage';
import { useDashboardData } from '../../hooks/useDashboardData';
import DatabaseService from '../../services/DatabaseService';
import BookingService from '../../services/BookingService';
import { BOOKING_STATUS, USER_ROLES, TABLES, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../constants';
import '../../styles/calendar.css';

export default function DashboardTab() {
  const { t } = useLanguage();
  
  // UI state
  const [showAvailability, setShowAvailability] = useState(true);
  const [showBookings, setShowBookings] = useState(true);
  const [showNonWorkingHours, setShowNonWorkingHours] = useState(false);
  const [showPast, setShowPast] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [defaultTime, setDefaultTime] = useState(null);
  
  // Data from custom hook
  const {
    loading,
    tableStats,
    bookings,
    services,
    customers,
    staffColors,
    currentLocation,
    businessHours,
    fetchBookingsWithStaff,
    fetchStaffAvailability,
    staffData // Add this to get staff data from the hook
  } = useDashboardData();

  // Event handlers
  const handleEventClick = (info) => {
    if (info.event.extendedProps.isAvailability) {
      // If clicking on availability slot, open create booking form with prefilled provider
      const clickedDate = info.event.start;
      const clickedTime = clickedDate.toTimeString().slice(0, 5); // HH:MM format
      
      setSelectedDate(clickedDate);
      setDefaultTime(clickedTime);
      setSelectedEvent({
        providerId: info.event.extendedProps.staffId,
        providerName: info.event.extendedProps.staffName
      });
      setShowEditPopup(true);
    } else {
      // For booking events, show event details
      setSelectedEvent(info.event);
      setShowEventModal(true);
    }
  };

  const handleDateClick = ({ date }) => {
    // Open create booking form with prefilled date and time
    const clickedTime = date.toTimeString().slice(0, 5); // HH:MM format
    
    setSelectedDate(date);
    setDefaultTime(clickedTime);
    setSelectedEvent(null); // No specific provider selected
    setShowEditPopup(true);
  };

  const handleEditSave = async (bookingData) => {
    console.log('=== DashboardTab handleEditSave START ===');
    console.log('bookingData received:', bookingData);
    
    try {
      const dbService = DatabaseService.getInstance();
      const bookingService = BookingService.getInstance();
      
      // Remove extra display fields
      const { service_name, customer_name, booking_time_formatted, created_at_formatted, show_recurring, start_date, start_time_hour, start_time_minute, bookings_pkey, ...dataToSave } = bookingData;
      
      console.log('Data after removing display fields:', dataToSave);
      
      // Validate required fields
      if (!dataToSave.customer_id) {
        console.error('Invalid customer_id:', dataToSave.customer_id);
        toast.error(ERROR_MESSAGES.INVALID_CUSTOMER);
        return;
      }
      
      if (!dataToSave.service_id) {
        console.error('Missing service_id');
        toast.error(ERROR_MESSAGES.INVALID_SERVICE);
        return;
      }
      
      if (!dataToSave.provider_id) {
        console.error('Missing provider_id');
        toast.error(ERROR_MESSAGES.INVALID_PROVIDER);
        return;
      }
      
      // Validate if customer exists
      const customerExists = await dbService.fetchSpecificColumns(TABLES.USERS, 'id', { id: dataToSave.customer_id, role: USER_ROLES.CUSTOMER });
      if (!customerExists || customerExists.length === 0) {
        console.error('Customer not found in users table:', dataToSave.customer_id);
        toast.error(ERROR_MESSAGES.INVALID_CUSTOMER);
        return;
      }
      
      // Calculate end_time based on duration
      const startTime = new Date(dataToSave.start_time);
      if (isNaN(startTime.getTime())) {
        console.error('Invalid start time:', dataToSave.start_time);
        toast.error(ERROR_MESSAGES.INVALID_START_TIME);
        return;
      }
      
      // Use duration from form data if available, otherwise get from service
      let durationInMinutes;
      if (dataToSave.duration && !isNaN(parseInt(dataToSave.duration))) {
        durationInMinutes = parseInt(dataToSave.duration);
        console.log('Using form duration:', durationInMinutes);
      } else {
        // Get service duration using BookingService instance
        const selectedService = services.find(service => service.id === dataToSave.service_id);
        durationInMinutes = bookingService.parseDuration(selectedService?.duration) || 60;
        console.log('Using service duration:', durationInMinutes);
      }
      
      // Calculate end time
      const endTime = new Date(startTime.getTime() + durationInMinutes * 60000);
      dataToSave.end_time = endTime.toISOString();
      dataToSave.duration = durationInMinutes;
      dataToSave.status = dataToSave.status || BOOKING_STATUS.PENDING;
      
      console.log('Final data to save:', dataToSave);
      
      // Check if this is an update (has ID) or create operation
      if (dataToSave.id) {
        // Update existing booking using BookingService
        await bookingService.updateBooking(dataToSave);
        console.log('Booking updated successfully');
        toast.success(SUCCESS_MESSAGES.BOOKING_UPDATED);
      } else {
        // Create new booking using BookingService
        await bookingService.createBooking(dataToSave);
        console.log('Booking created successfully');
        toast.success(SUCCESS_MESSAGES.BOOKING_CREATED);
      }
      
      // Refresh the dashboard data
      await fetchBookingsWithStaff();
      await fetchStaffAvailability();
      
      // Close the popup
      setShowEditPopup(false);
      setSelectedEvent(null);
      setSelectedDate(null);
      setDefaultTime(null);
      
      console.log('=== DashboardTab handleEditSave SUCCESS ===');
      
    } catch (error) {
      console.error('=== DashboardTab handleEditSave ERROR ===');
      console.error('Error saving booking:', error);
      toast.error(`${ERROR_MESSAGES.BOOKING_SAVE_ERROR}: ${error.message}`);
    }
  };

  const renderEventContent = (eventInfo) => {
    if (eventInfo.event.extendedProps.isAvailability) {
      // For availability events, show staff name and time with smaller font
      const startTime = eventInfo.event.extendedProps.startTime;
      const endTime = eventInfo.event.extendedProps.endTime;
      
      // Format time to show only hours and minutes (remove seconds)
      const formatTime = (timeStr) => {
        if (timeStr && timeStr.includes(':')) {
          const parts = timeStr.split(':');
          return `${parts[0]}:${parts[1]}`;
        }
        return timeStr;
      };
      
      return {
        html: `<div class="availability-event-content" style="font-size: 12px; line-height: 1.2;">
                 <div>${eventInfo.event.extendedProps.staffName}</div>
                 <div style="font-size: 10px; opacity: 0.8;">${formatTime(startTime)} - ${formatTime(endTime)}</div>
               </div>`
      };
    } else {
      // For booking events, show customer name - provider info - service with black text
      const customerName = eventInfo.event.extendedProps.customerName || 'Unknown';
      const staffName = eventInfo.event.extendedProps.staffName || 'Unknown';
      const serviceName = eventInfo.event.extendedProps.serviceName || 'Appointment';
      
      // Check if booking is cancelled
      const currentBooking = bookings.find(booking => booking.id === eventInfo.event.id);
      const currentStatus = currentBooking?.status || eventInfo.event.extendedProps.status;
      const isCancelled = currentStatus === 'cancelled';
      
      // Truncate long text to prevent overflow
      const truncateText = (text, maxLength) => {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
      };
      
      
      // Determine if we should allow full text based on event duration
      const eventDuration = (new Date(eventInfo.event.end) - new Date(eventInfo.event.start)) / (1000 * 60); // duration in minutes
      const shouldAllowFullText = eventDuration >= 30; // 30 minutes or longer
      
      const formattedTitle = shouldAllowFullText ? 
        `${customerName} - ${staffName} - ${serviceName}` :
        `${truncateText(customerName, 15)} - ${truncateText(staffName, 10)} - ${truncateText(serviceName, 20)}`;
      
      return {
        html: `<div class="booking-event-content ${isCancelled ? 'cancelled-booking' : ''}" style="
                 color: black; 
                 font-size: 11px; 
                 line-height: 1.2;
                 padding: 2px;
                 height: 100%;
                 display: flex;
                 align-items: ${shouldAllowFullText ? 'flex-start' : 'center'};
                 word-wrap: break-word;
                 overflow-wrap: break-word;
                 white-space: ${shouldAllowFullText ? 'normal' : 'nowrap'};
                 text-overflow: ${shouldAllowFullText ? 'unset' : 'ellipsis'};
                 overflow: ${shouldAllowFullText ? 'visible' : 'hidden'};
               ">${formattedTitle}</div>`
      };
    }
  };

  const handleEventDidMount = (info) => {
    const extendedProps = info.event.extendedProps;
    let tooltip = null;
    let hideTimeout = null;
  
    // Define the cleanup function
    const cleanup = () => {
      if (tooltip) {
        tooltip.remove();
        tooltip = null;
      }
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      // Remove event listeners
      info.el.removeEventListener('mouseenter', showTooltip);
      info.el.removeEventListener('mouseleave', hideTooltip);
      info.el.removeEventListener('mousemove', updateTooltipPosition);
    };
  
    const showTooltip = (e) => {
      // Clear any pending hide timeout
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      
      // Remove any existing tooltips from the entire document
      const existingTooltips = document.querySelectorAll('.custom-tooltip');
      existingTooltips.forEach(tip => tip.remove());
      
      // Generate tooltip content dynamically each time it's shown
      let tooltipContent;
      if (extendedProps.isAvailability) {
        tooltipContent = `Staff: ${extendedProps.staffName || 'Unknown'}<br>Time: ${extendedProps.startTime.substr(0, 5)} - ${extendedProps.endTime.substr(0, 5)}<br>Location: ${extendedProps.locationName || 'Unknown'}`;
      } else {
        // For booking events, get fresh data from the current bookings array
        const currentBooking = bookings.find(booking => booking.id === info.event.id);
        const currentStatus = currentBooking?.status || extendedProps.status || BOOKING_STATUS.PENDING;
        const currentNotes = currentBooking?.notes || extendedProps.notes || '';
        
        tooltipContent = `Service: ${extendedProps.serviceName || 'Unknown'}<br>Customer: ${extendedProps.customerName || 'Unknown'}<br>Staff: ${extendedProps.staffName || 'Unknown'}<br>Time: ${new Date(info.event.start).toLocaleString()} - ${new Date(info.event.end).toLocaleString()}<br>Location: ${extendedProps.locationName || 'Unknown'}<br>Status: ${currentStatus}${currentNotes ? '<br>Notes: ' + currentNotes : ''}`;
      }
      
      // Create tooltip element
      tooltip = document.createElement('div');
      tooltip.className = 'custom-tooltip';
      tooltip.innerHTML = tooltipContent;
      
      // Position tooltip with boundary checking
      const x = Math.min(e.pageX + 10, window.innerWidth - 250);
      const y = Math.max(e.pageY - 10, 10);
      
      tooltip.style.position = 'absolute';
      tooltip.style.left = x + 'px';
      tooltip.style.top = y + 'px';
      tooltip.style.zIndex = '1000';
      tooltip.style.pointerEvents = 'none';
      
      document.body.appendChild(tooltip);
    };
    
    const hideTooltip = () => {
      hideTimeout = setTimeout(() => {
        if (tooltip) {
          tooltip.remove();
          tooltip = null;
        }
      }, 50);
    };
    
    const updateTooltipPosition = (e) => {
      if (tooltip) {
        const x = Math.min(e.pageX + 10, window.innerWidth - 250);
        const y = Math.max(e.pageY - 10, 10);
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
      }
    };
    
    // Store cleanup function on the element and mark for cleanup tracking
    info.el._tooltipCleanup = cleanup;
    info.el.setAttribute('data-tooltip-cleanup', 'true');
    
    // Add event listeners for custom tooltip
    info.el.addEventListener('mouseenter', showTooltip);
    info.el.addEventListener('mouseleave', hideTooltip);
    info.el.addEventListener('mousemove', updateTooltipPosition);
    
    // Add cleanup when element is removed
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node === info.el || (node.contains && node.contains(info.el))) {
            cleanup();
            observer.disconnect();
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Check if this is an availability event in resource view
    if (info.event.extendedProps.isAvailability) {
      const calendarApi = info.view.calendar;
      const currentView = calendarApi.view.type;
      
      // If we're in resource time grid view (day view), make availability events full width
      if (currentView === 'resourceTimeGridDay') {
        const eventEl = info.el;
        
        // Force full width styling for availability events in resource view
        eventEl.style.left = '0px';
        eventEl.style.right = '0px';
        eventEl.style.width = '100%';
        eventEl.style.marginLeft = '0px';
        eventEl.style.marginRight = '0px';
        
        // Remove any positioning classes that might interfere
        const positionClasses = eventEl.className.match(/availability-position-\d+/g);
        if (positionClasses) {
          positionClasses.forEach(cls => eventEl.classList.remove(cls));
        }
      }
    }
  };
  // Add this new function to handle booking confirmation
  const handleConfirmBooking = async (event) => {
    try {
      const dbService = DatabaseService.getInstance();
      
      // Update booking status to confirmed
      await dbService.updateItem(TABLES.BOOKINGS, {
        id: event.id,
        status: BOOKING_STATUS.CONFIRMED
      }, 'Booking');
      
      // Refresh the calendar data
      await fetchBookingsWithStaff();
      // Close the modal
      setShowEventModal(false);
      setSelectedEvent(null);
      
      toast.success(SUCCESS_MESSAGES.BOOKING_CONFIRMED);
    } catch (error) {
      console.error('Error confirming booking:', error);
      toast.error(ERROR_MESSAGES.BOOKING_CONFIRM_FAILED);
    }
  };
  // Remove or comment out these functions:
  // const handleEventMouseEnter = (info) => { ... }
  // const handleEventMouseLeave = (info) => { ... }
  
  // Cleanup tooltips when component unmounts and add global cleanup
  useEffect(() => {
    // Global cleanup function for tooltips
    const globalCleanupTooltips = () => {
      const existingTooltips = document.querySelectorAll('.custom-tooltip');
      existingTooltips.forEach(tip => tip.remove());
    };
    
    // Add global mouse leave listener to calendar container
    const calendarContainer = document.querySelector('.fc');
    if (calendarContainer) {
      calendarContainer.addEventListener('mouseleave', globalCleanupTooltips);
    }
    
    // Also add to document body as a fallback
    document.addEventListener('click', globalCleanupTooltips);
    
    return () => {
      // Remove all custom tooltips
      globalCleanupTooltips();
      
      // Clean up any tooltip-related data on calendar elements
      const calendarElements = document.querySelectorAll('[data-tooltip-cleanup]');
      calendarElements.forEach(el => {
        if (el._tooltipCleanup) {
          el._tooltipCleanup();
        }
      });
      
      // Remove global event listeners
      if (calendarContainer) {
        calendarContainer.removeEventListener('mouseleave', globalCleanupTooltips);
      }
      document.removeEventListener('click', globalCleanupTooltips);
    };
  }, []);
  
  return (
    <div className="space-y-6">
      <DashboardStats 
        tableStats={tableStats} 
        currentLocation={currentLocation} 
        loading={loading} 
      />
      
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-700">{t('dashboard.bookingCalendar')}</h3>
          <CalendarControls
            showAvailability={showAvailability}
            setShowAvailability={setShowAvailability}
            showBookings={showBookings}
            setShowBookings={setShowBookings}
            showPast={showPast}
            setShowPast={setShowPast}
            showNonWorkingHours={showNonWorkingHours}
            setShowNonWorkingHours={setShowNonWorkingHours}
          />
        </div>
        
        {/* Remove this line */}
        {/* <StaffLegend staffColors={staffColors} bookings={bookings} /> */}
        
        <BookingCalendar
          bookings={bookings}
          showAvailability={showAvailability}
          showBookings={showBookings}
          showPast={showPast}
          showNonWorkingHours={showNonWorkingHours}
          businessHours={businessHours}
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
          renderEventContent={renderEventContent}
          handleEventDidMount={handleEventDidMount}
          staffData={staffData}
          staffColors={staffColors}
          services={services}
        />
      </div>
      
      
      <EventModal
      selectedEvent={selectedEvent}
      onClose={() => {
        setShowEventModal(false);
        setSelectedEvent(null);
      }}
      onEdit={() => {
        setShowEventModal(false);
        setShowEditPopup(true);
      }}
      onConfirm={handleConfirmBooking}
    />     
      {showEditPopup && (
        <EditBookingPopup
          booking={selectedEvent ? {
            id: selectedEvent.id,
            start_time: selectedEvent.start,
            end_time: selectedEvent.end,
            provider_id: selectedEvent.extendedProps?.staffId,
            customer_id: selectedEvent.extendedProps?.customerId,
            service_id: selectedEvent.extendedProps?.serviceId,
            status: selectedEvent.extendedProps?.status || BOOKING_STATUS.PENDING,
            location: selectedEvent.extendedProps?.locationId  // Add this line
          } : null}
          onSave={handleEditSave}
          onCancel={() => {
            setShowEditPopup(false);
            setSelectedEvent(null);
            setSelectedDate(null);
            setDefaultTime(null);
          }}
          isCreating={!selectedEvent}
          defaultTime={defaultTime}
          selectedDate={selectedDate}
          defaultProviderId={selectedEvent?.extendedProps?.staffId || null}
        />
      )}
      
      <ToastMessage />
    </div>
  );
}