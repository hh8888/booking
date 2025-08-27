import React, { useEffect, useState } from 'react';
// Only import what you actually use
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
// Remove if not used:
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import { useLanguage } from '../../contexts/LanguageContext';
import './BookingCalendar.css';

const BookingCalendar = ({
  bookings,
  showAvailability,
  showBookings,
  showPast,
  showNonWorkingHours,
  showNonAvailableStaff,
  businessHours,
  onDateClick,
  onEventClick,
  renderEventContent,
  handleEventDidMount,
  staffData,
  staffColors,
  services
}) => {
  const { t } = useLanguage();
  const [calendarRef, setCalendarRef] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [currentViewDates, setCurrentViewDates] = useState(null);

  // Handle window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Update calendar view based on screen size
      if (calendarRef) {
        const calendarApi = calendarRef.getApi();
        if (mobile && calendarApi.view.type === 'timeGridWeek') {
          calendarApi.changeView('timeGridDay');
        } else if (!mobile && calendarApi.view.type === 'timeGridDay') {
          calendarApi.changeView('timeGridWeek');
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calendarRef]);
  // Filter events logic
  const getFilteredEvents = () => {
    let filteredEvents = bookings;
    
    // First, filter out any events with invalid dates
    filteredEvents = filteredEvents.filter(event => {
      if (!event || !event.start || !event.end) {
        console.warn('Event with missing start/end date filtered out:', event);
        return false;
      }
      
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn('Event with invalid dates filtered out:', {
          event,
          startDate,
          endDate
        });
        return false;
      }
      
      return true;
    });
    
    if (!showAvailability) {
      filteredEvents = filteredEvents.filter(event => 
        !event.classNames?.includes('availability-event')
      );
    }
    
    if (!showBookings) {
      filteredEvents = filteredEvents.filter(event => 
        event.classNames?.includes('availability-event')
      );
    }
    
    if (showPast) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      filteredEvents = filteredEvents.filter(event => {
        const eventDate = new Date(event.start);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= now;
      });
    }
    
    return filteredEvents;
  };

  // Format business hours for FullCalendar
  const getBusinessHours = () => {
    if (showNonWorkingHours || !businessHours) {
      return false;
    }
    
    return {
      daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
      startTime: businessHours.startTime,
      endTime: businessHours.endTime
    };
  };

  // Get time slot limits based on business hours
  const getTimeSlotLimits = () => {
    if (showNonWorkingHours || !businessHours) {
      return {
        slotMinTime: '00:00:00',
        slotMaxTime: '24:00:00'
      };
    }
    
    return {
      slotMinTime: businessHours.startTime,
      slotMaxTime: businessHours.endTime
    };
  };

  const timeSlotLimits = getTimeSlotLimits();

  // Create resources for staff members
  // Helper function to check if an event is within the current view's date range
  const isEventInCurrentView = (event) => {
    if (!currentViewDates || !event.start) return true;
    
    const eventStart = new Date(event.start);
    const eventEnd = event.end ? new Date(event.end) : eventStart;
    
    // Check if event overlaps with current view date range
    return eventStart <= currentViewDates.end && eventEnd >= currentViewDates.start;
  };

  // Get resources (staff) for the calendar
  const getResources = () => {
    const resources = [];
    
    // Add generic resource for unassigned bookings
    resources.push({
      id: 'generic',
      title: 'Unassigned',
      eventColor: '#6B7280' // Gray color for generic bookings
    });
    
    // Add staff resources
    if (staffData && staffData.length > 0) {
      let filteredStaffData = staffData;
      
      // Filter out non-available staff if toggle is off
      if (!showNonAvailableStaff) {
        // Get all filtered events
        const allFilteredEvents = getFilteredEvents();
        
        // Filter events to only those in current view
        const currentViewEvents = allFilteredEvents.filter(isEventInCurrentView);
        
        // Get staff IDs that have events in the current view
        const staffWithEvents = new Set();
        
        currentViewEvents.forEach(event => {
          const staffId = event.extendedProps?.staffId || event.extendedProps?.providerId;
          if (staffId) {
            staffWithEvents.add(staffId.toString());
          }
        });
        
        // Only show staff that have events in the current view
        filteredStaffData = staffData.filter(staff => 
          staffWithEvents.has(staff.id.toString())
        );
      }
      
      const staffResources = filteredStaffData.map(staff => ({
        id: staff.id.toString(),
        title: staff.full_name,
        eventColor: staffColors[staff.id] || '#4C7F50'
      }));
      resources.push(...staffResources);
    }
    
    return resources;
  };

  // Add resourceId to filtered events
  const getFilteredEventsWithResources = () => {
    let filteredEvents = getFilteredEvents();
    
    // Add resourceId to events based on staffId/providerId
    return filteredEvents.map(event => {
      const staffId = event.extendedProps?.staffId || event.extendedProps?.providerId;
      
      // Handle availability events - they should always go to their staff's column
      if (event.classNames?.includes('availability-event')) {
        return {
          ...event,
          resourceId: staffId ? staffId.toString() : 'generic'
        };
      }
      
      // Handle booking events - check service assignment
      const serviceId = event.extendedProps?.serviceId;
      const service = services?.find(s => s.id === serviceId);
      
      let resourceId;
      if (!service?.staff_id || service.staff_id === null) {
        // Service has no assigned staff - put in generic column
        resourceId = 'generic';
      } else if (staffId) {
        // Service has assigned staff and booking has a provider
        resourceId = staffId.toString();
      } else {
        // Fallback to generic for any edge cases
        resourceId = 'generic';
      }
      
      return {
        ...event,
        resourceId
      };
    });
  };

  // Responsive header toolbar configuration
  const getHeaderToolbar = () => {
    if (isMobile) {
      return {
        left: 'prev,next',
        center: 'title',
        right: 'today'
      };
    }
    
    return {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,resourceTimeGridDay'
    };
  };

  // Mobile-optimized view selection
  const getInitialView = () => {
    return isMobile ? 'timeGridDay' : 'timeGridWeek';
  };

  // Mobile-optimized resource area width
  const getResourceAreaWidth = () => {
    return isMobile ? '60px' : '150px';
  };

  // Handle view change from mobile buttons
  const handleViewChange = (viewType) => {
    if (calendarRef) {
      const calendarApi = calendarRef.getApi();
      calendarApi.changeView(viewType);
    }
  };

  return (
    <div className="booking-calendar-container">
      {/* Mobile view selector */}
      {isMobile && (
        <div className="mb-4 px-2">
          <div className="flex flex-wrap gap-2 justify-center">
            <button 
              className="px-4 py-3 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors min-h-[44px] min-w-[60px] touch-manipulation"
              onClick={() => handleViewChange('timeGridDay')}
            >
              {t('calendar.day')}
            </button>
            <button 
              className="px-4 py-3 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors min-h-[44px] min-w-[60px] touch-manipulation"
              onClick={() => handleViewChange('timeGridWeek')}
            >
              {t('calendar.week')}
            </button>
            <button 
              className="px-4 py-3 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors min-h-[44px] min-w-[60px] touch-manipulation"
              onClick={() => handleViewChange('dayGridMonth')}
            >
              {t('calendar.month')}
            </button>
          </div>
        </div>
      )}
      
      <div className={`calendar-wrapper ${isMobile ? 'mobile-calendar' : 'desktop-calendar'}`}>
        <FullCalendar
          ref={setCalendarRef}
          schedulerLicenseKey='CC-Attribution-NonCommercial-NoDerivatives'
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, resourceTimeGridPlugin]}
          initialView={getInitialView()}
          firstDay={1}
          headerToolbar={getHeaderToolbar()}
          titleFormat={{
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          }}
          resources={getResources()}
          events={getFilteredEventsWithResources()}
          eventContent={renderEventContent}
          eventDidMount={handleEventDidMount}
          dateClick={onDateClick}
          eventClick={onEventClick}
          businessHours={getBusinessHours()}
          slotMinTime={timeSlotLimits.slotMinTime}
          slotMaxTime={timeSlotLimits.slotMaxTime}
          height="auto"
          contentHeight="auto"
          expandRows={true}
          resourceAreaHeaderContent={isMobile ? "Staff" : "Staff Members"}
          resourceAreaWidth={getResourceAreaWidth()}
          // Mobile-optimized settings
          aspectRatio={isMobile ? 0.6 : 1.35}
          handleWindowResize={true}
          // Improve event display
          eventDisplay="block"
          eventOverlap={false}
          slotEventOverlap={false}
          eventMaxStack={isMobile ? 1 : 3}
          // Touch-friendly interactions
          longPressDelay={isMobile ? 200 : 1000}
          eventLongPressDelay={isMobile ? 200 : 1000}
          selectLongPressDelay={isMobile ? 200 : 1000}
          // Mobile-specific slot settings
          slotDuration={isMobile ? '01:00:00' : '00:30:00'}
          slotLabelInterval={isMobile ? '02:00:00' : '01:00:00'}
          // Track current view dates
          datesSet={(dateInfo) => {
            setCurrentViewDates({
              start: dateInfo.start,
              end: dateInfo.end
            });
          }}
          // Enable built-in tooltips
          eventMouseEnter={(info) => {
            // FullCalendar will automatically show tooltip using the event's title property
          }}
          eventMouseLeave={(info) => {
            // FullCalendar will automatically hide tooltip
          }}
        />
      </div>
      

    </div>
  );
};

export default BookingCalendar;