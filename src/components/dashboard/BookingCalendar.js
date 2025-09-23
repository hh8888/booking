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
  showUnassigned,
  stackAvailability,
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
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(
    window.innerWidth <= 768 && window.innerWidth > window.innerHeight
  );
  const [currentViewDates, setCurrentViewDates] = useState(null);

  // Handle window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      const landscapeMobile = mobile && window.innerWidth > window.innerHeight;
      setIsMobile(mobile);
      setIsLandscapeMobile(landscapeMobile);
      
      // Update calendar view based on screen size and orientation
      if (calendarRef) {
        const calendarApi = calendarRef.getApi();
        
        // Always use resource view for landscape mobile
        if (landscapeMobile && calendarApi.view.type !== 'resourceTimeGridDay') {
          calendarApi.changeView('resourceTimeGridDay');
        } else if (mobile && !landscapeMobile && calendarApi.view.type === 'timeGridWeek') {
          calendarApi.changeView('timeGridDay');
        } else if (!mobile && (calendarApi.view.type === 'timeGridDay' || calendarApi.view.type === 'resourceTimeGridDay')) {
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

  // Check if there are any bookings that should be unassigned
  const hasUnassignedBookings = () => {
    const filteredEvents = getFilteredEvents();
    
    return filteredEvents.some(event => {
      // Skip availability events
      if (event.classNames?.includes('availability-event') || event.classNames?.includes('availability-allday')) {
        return false;
      }
      
      const staffId = event.extendedProps?.staffId || event.extendedProps?.providerId;
      const serviceId = event.extendedProps?.serviceId;
      const service = services?.find(s => s.id === serviceId);
      
      // Check if this booking should be unassigned
      if (!service?.staff_ids || !Array.isArray(service.staff_ids) || service.staff_ids.length === 0) {
        return true; // Service has no assigned staff
      }
      
      if (!staffId) {
        return true; // No staff assigned to booking
      }
      
      const staff = staffData?.find(s => s.id.toString() === staffId.toString());
      if (!staff) {
        return true; // Staff member not found
      }
      
      // Check staff availability
      const bookingDate = new Date(event.start);
      const bookingDateStr = bookingDate.toLocaleDateString('en-CA');
      const hasAvailabilityOnDate = filteredEvents.some(availEvent => {
        if (!availEvent.classNames?.includes('availability-event') && !availEvent.classNames?.includes('availability-allday')) {
          return false;
        }
        const availStaffId = availEvent.extendedProps?.staffId || availEvent.extendedProps?.providerId;
        const availDate = new Date(availEvent.start);
        const availDateStr = availDate.toLocaleDateString('en-CA');
        
        return availStaffId?.toString() === staffId.toString() && availDateStr === bookingDateStr;
      });
      
      return !hasAvailabilityOnDate; // Should be unassigned if no availability
    });
  };

  // Get resources (staff) for the calendar
  const getResources = () => {
    const resources = [];
    
    // Add generic resource for unassigned bookings only if showUnassigned is true
    if (showUnassigned) {
      resources.push({
        id: 'generic',
        title: 'Unassigned',
        eventColor: '#6B7280' // Gray color for generic bookings
      });
    }
    
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
      if (event.classNames?.includes('availability-event') || event.classNames?.includes('availability-allday')) {
        return {
          ...event,
          resourceId: staffId ? staffId.toString() : 'generic'
        };
      }
      
      // Handle booking events - check service assignment and provider availability
      const serviceId = event.extendedProps?.serviceId;
      const service = services?.find(s => s.id === serviceId);
      
      let resourceId;
      if (!service?.staff_ids || !Array.isArray(service.staff_ids) || service.staff_ids.length === 0) {
        // Service has no assigned staff - put in generic column
        resourceId = 'generic';
      } else if (staffId) {
        // Check if the assigned provider is available on the booking date
        const bookingDate = new Date(event.start);
        const bookingDateStr = bookingDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format
        
        // Find the staff member in staffData
        const staff = staffData?.find(s => s.id.toString() === staffId.toString());
        
        if (!staff) {
          // Staff member not found - put in generic column
          resourceId = 'generic';
        } else {
          // Check if staff is available on this date by looking for availability events
          const hasAvailabilityOnDate = filteredEvents.some(availEvent => {
            if (!availEvent.classNames?.includes('availability-event') && !availEvent.classNames?.includes('availability-allday')) {
              return false;
            }
            const availStaffId = availEvent.extendedProps?.staffId || availEvent.extendedProps?.providerId;
            const availDate = new Date(availEvent.start);
            const availDateStr = availDate.toLocaleDateString('en-CA');
            
            return availStaffId?.toString() === staffId.toString() && availDateStr === bookingDateStr;
          });
          
          if (hasAvailabilityOnDate) {
            // Provider is available - assign to their column
            resourceId = staffId.toString();
          } else {
            // Provider is not available on this date - put in unassigned column
            resourceId = 'generic';
          }
        }
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

  // Filter events for non-resource views to show unassigned bookings
  const getFilteredEventsForNonResourceView = () => {
    let filteredEvents = getFilteredEvents();
    
    // In non-resource views, we need to filter based on showUnassigned toggle
    if (!showUnassigned) {
      // Filter out unassigned bookings when showUnassigned is false
      filteredEvents = filteredEvents.filter(event => {
        // Always show availability events
        if (event.classNames?.includes('availability-event') || event.classNames?.includes('availability-allday')) {
          return true;
        }
        
        // For booking events, check if they would be assigned to 'generic'
        const staffId = event.extendedProps?.staffId || event.extendedProps?.providerId;
        const serviceId = event.extendedProps?.serviceId;
        const service = services?.find(s => s.id === serviceId);
        
        // If service has no assigned staff, it's unassigned
        if (!service?.staff_ids || !Array.isArray(service.staff_ids) || service.staff_ids.length === 0) {
          return false; // Filter out unassigned
        }
        
        // If no staff assigned to booking, it's unassigned
        if (!staffId) {
          return false; // Filter out unassigned
        }
        
        // Check if staff exists
        const staff = staffData?.find(s => s.id.toString() === staffId.toString());
        if (!staff) {
          return false; // Filter out unassigned
        }
        
        // Check staff availability
        const bookingDate = new Date(event.start);
        const bookingDateStr = bookingDate.toLocaleDateString('en-CA');
        const hasAvailabilityOnDate = filteredEvents.some(availEvent => {
          if (!availEvent.classNames?.includes('availability-event') && !availEvent.classNames?.includes('availability-allday')) {
            return false;
          }
          const availStaffId = availEvent.extendedProps?.staffId || availEvent.extendedProps?.providerId;
          const availDate = new Date(availEvent.start);
          const availDateStr = availDate.toLocaleDateString('en-CA');
          
          return availStaffId?.toString() === staffId.toString() && availDateStr === bookingDateStr;
        });
        
        // If staff is not available, it's unassigned
        if (!hasAvailabilityOnDate) {
          return false; // Filter out unassigned
        }
        
        return true; // Show assigned bookings
      });
    }
    
    return filteredEvents;
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
    if (isLandscapeMobile) {
      return 'resourceTimeGridDay';
    }
    return isMobile ? 'timeGridDay' : 'timeGridWeek';
  };

  // Check if current view is a resource view
  const getCurrentView = () => {
    if (!calendarRef) return getInitialView();
    return calendarRef.getApi().view.type;
  };

  const isResourceView = (viewType = getCurrentView()) => {
    return viewType && viewType.includes('resource');
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
            {isMobile && (
              <button 
                className="px-4 py-3 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors min-h-[44px] min-w-[60px] touch-manipulation"
                onClick={() => handleViewChange('resourceTimeGridDay')}
              >
                {t('calendar.staff_day') || 'Staff Day'}
              </button>
            )}
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
          nowIndicator={true}
          resources={isResourceView() ? getResources() : undefined}
          events={isResourceView() ? getFilteredEventsWithResources() : getFilteredEventsForNonResourceView()}
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
          eventDisplay={isMobile ? "list-item" : "block"}
          eventOverlap={false}
          slotEventOverlap={false}
          eventMaxStack={isMobile ? 3 : 3}
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