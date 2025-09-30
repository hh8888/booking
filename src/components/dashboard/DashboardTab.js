import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import DashboardStats from './DashboardStats';
import BookingCalendar from './BookingCalendar';
import CalendarControls from './CalendarControls';
import { useLanguage } from '../../contexts/LanguageContext';
import { useMultilingualToast } from '../../utils/multilingualToastUtils';
// Remove this import line
// import StaffLegend from './StaffLegend';
import EventModal from './EventModal';
import EditBookingPopup from '../booking/EditBookingPopup';
import { useDashboardData } from '../../hooks/useDashboardData';
import DatabaseService from '../../services/DatabaseService';
import BookingService from '../../services/BookingService';
import { BOOKING_STATUS, USER_ROLES, TABLES, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../constants';
import '../../styles/calendar.css';
import ToastHistory from './ToastHistory';
import DateTimeFormatter from '../../utils/DateTimeFormatter';

export default function DashboardTab() {
  const { t } = useLanguage();
  const { showSuccessToast, showErrorToast } = useMultilingualToast();
  
  // UI state
  const [showAvailability, setShowAvailability] = useState(true);
  const [showBookings, setShowBookings] = useState(true);
  const [showNonWorkingHours, setShowNonWorkingHours] = useState(false);
  const [showPast, setShowPast] = useState(true);
  const [showNonAvailableStaff, setShowNonAvailableStaff] = useState(false);
  const [showUnassigned, setShowUnassigned] = useState(true);
  const [stackAvailability, setStackAvailability] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [defaultTime, setDefaultTime] = useState(null);
  const [showStaffNameSetting, setShowStaffNameSetting] = useState('true');
  const [calendarRef, setCalendarRef] = useState(null);

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
    staffData
  } = useDashboardData(stackAvailability);

  // Add the clearEventHighlights function here (BEFORE the return statement)
  const clearEventHighlights = () => {
    // Remove highlight class from all events
    const highlightedEvents = document.querySelectorAll('.availability-highlighted');
    highlightedEvents.forEach(eventEl => {
      eventEl.classList.remove('availability-highlighted');
      delete eventEl.dataset.highlighted;
    });
  };

  // Fetch the showStaffName setting
  useEffect(() => {
    const fetchShowStaffNameSetting = async () => {
      try {
        const dbService = DatabaseService.getInstance();
        const setting = await dbService.getSettingsByKey('booking', 'showStaffName');
        setShowStaffNameSetting(setting || 'true');
      } catch (error) {
        console.error('Error fetching showStaffName setting:', error);
        setShowStaffNameSetting('true'); // Default to true
      }
    };
    
    fetchShowStaffNameSetting();
  }, []);

  // Event handlers
  const handleEventClick = (info) => {
    // Handle all-day availability events
    if (info.event.allDay && info.event.extendedProps.isAllDayAvailability) {
      // Get the original event ID from the all-day event
      const originalEventId = info.event.extendedProps.originalEventId;
      const staffId = info.event.extendedProps.staffId;
      const eventDate = info.event.start;
      
      // Clear any existing highlights
      clearEventHighlights();
      
      // Find and highlight related time grid events for the same staff and date
      if (calendarRef) {
        const calendarApi = calendarRef.getApi();
        const allEvents = calendarApi.getEvents();
        
        allEvents.forEach(event => {
          // Check if this is a time grid availability event for the same staff and date
          if (!event.allDay && 
              event.extendedProps?.isAvailability && 
              event.extendedProps?.staffId === staffId) {
            
            const eventStart = new Date(event.start);
            const clickedDate = new Date(eventDate);
            
            // Check if events are on the same date
            if (eventStart.toDateString() === clickedDate.toDateString()) {
              // Add highlight class to bring event to front
              const eventEl = event.el;
              if (eventEl) {
                eventEl.classList.add('availability-highlighted');
                // Store reference for cleanup
                eventEl.dataset.highlighted = 'true';
              }
            }
          }
        });
      }
      
      return; // Don't proceed with normal click handling
    }
    
    // Clear highlights when clicking other events
    clearEventHighlights();
    
    // Prevent all-day events from being clickable (original logic)
    if (info.event.allDay) {
      return;
    }
    
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
      console.log('🔍 CALENDAR BOOKING CLICKED');
      console.log('Calendar event object:', info.event);
      console.log('Event extendedProps:', info.event.extendedProps);
      console.log('Event notes field:', info.event.extendedProps?.notes);
      console.log('Event comments field:', info.event.extendedProps?.comments);
      console.log('All extendedProps keys:', Object.keys(info.event.extendedProps || {}));
      
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
    try {
      console.log('=== DashboardTab handleEditSave START ===');
      console.log('Received booking data:', bookingData);
      
      // Process the booking data
      const dataToSave = {
        ...bookingData,
        location: currentLocation?.id || bookingData.location,
        start_time: bookingData.start_time,
        end_time: bookingData.end_time
      };
      
      console.log('Data to save after processing:', dataToSave);
      
      if (bookingData.id) {
        // Update existing booking using BookingService
        const bookingService = BookingService.getInstance();
        await bookingService.updateBooking(dataToSave);
        console.log('Booking updated successfully');
        // Use multilingual success toast
        showSuccessToast('updated');
      } else {
        // Create new booking using BookingService
        const bookingService = BookingService.getInstance();
        await bookingService.createBooking(dataToSave);
        console.log('Booking created successfully');
        // Use multilingual success toast
        showSuccessToast('created');
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
      showErrorToast('general', { error: error.message });
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
      
      // Check if staff name should be shown based on setting
      const showStaffName = showStaffNameSetting === 'true';
      
      const formattedTitle = shouldAllowFullText ? 
        (showStaffName ? `${staffName} - ${customerName} - ${serviceName}` : `${customerName} - ${serviceName}`) :
        (showStaffName ? `${truncateText(staffName, 10)} - ${truncateText(customerName, 15)} - ${truncateText(serviceName, 20)}` : `${truncateText(customerName, 15)} - ${truncateText(serviceName, 20)}`);
      
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

    const F = DateTimeFormatter.getInstance().formatTime.bind(DateTimeFormatter.getInstance());
  
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
        const customerPhone = currentBooking?.customer_phone || extendedProps.customerPhone || '';
        //hover info on booking event
        tooltipContent = `Service: ${extendedProps.serviceName || 'Unknown'}<br>Customer: ${extendedProps.customerName || 'Unknown'}${customerPhone ? '<br>Phone: ' + customerPhone : ''}<br>Time: ${F(info.event.start)} - ${F(info.event.end)}<br>Location: ${extendedProps.locationName || 'Unknown'}<br>Status: ${currentStatus}${currentNotes ? '<br>Notes: ' + currentNotes : ''}<br>Staff: ${extendedProps.staffName || 'Unknown'}`;
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
            showNonAvailableStaff={showNonAvailableStaff}
            setShowNonAvailableStaff={setShowNonAvailableStaff}
            showUnassigned={showUnassigned}
            setShowUnassigned={setShowUnassigned}
            stackAvailability={stackAvailability}
            setStackAvailability={setStackAvailability}
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
          showNonAvailableStaff={showNonAvailableStaff}
          showUnassigned={showUnassigned}
          stackAvailability={stackAvailability}
          businessHours={businessHours}
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
          renderEventContent={renderEventContent}
          handleEventDidMount={handleEventDidMount}
          staffData={staffData}
          staffColors={staffColors}
          services={services}
          onCalendarRef={setCalendarRef}
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
            location: selectedEvent.extendedProps?.locationId,
            notes: selectedEvent.extendedProps?.notes,
            comments: selectedEvent.extendedProps?.comments, // Add this line
            // Add debug logging
            ...(() => {
              console.log('📝 PASSING TO EDIT POPUP:');
              console.log('selectedEvent:', selectedEvent);
              console.log('notes from selectedEvent:', selectedEvent.extendedProps?.notes);
              console.log('comments from selectedEvent:', selectedEvent.extendedProps?.comments);
              return {};
            })()
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
      <ToastHistory />
    </div>
  );
}
