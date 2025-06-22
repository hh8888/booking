import React from 'react';
// Only import what you actually use
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
// Remove if not used:
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';

const BookingCalendar = ({
  bookings,
  showAvailability,
  showBookings,
  showPast,
  showNonWorkingHours,
  businessHours,
  onDateClick,
  onEventClick,
  renderEventContent,
  handleEventDidMount,
  staffData,
  staffColors,
  services // Add services prop
}) => {
  // Filter events logic
  const getFilteredEvents = () => {
    let filteredEvents = bookings;
    
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
  const getResources = () => {
    const resources = [];
    
    // Add generic column for bookings without assigned staff
    resources.push({
      id: 'generic',
      title: 'Unassigned',
      eventColor: '#6B7280' // Gray color for generic bookings
    });
    
    // Add staff resources
    if (staffData && staffData.length > 0) {
      const staffResources = staffData.map(staff => ({
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

  return (
    <FullCalendar
      schedulerLicenseKey='CC-Attribution-NonCommercial-NoDerivatives'
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, resourceTimeGridPlugin]}
      initialView="timeGridWeek"
      firstDay={1}
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,resourceTimeGridDay'
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
      resourceAreaHeaderContent="Staff"
      resourceAreaWidth="150px"
      // Improve event display
      eventDisplay="block"
      eventOverlap={false}
      slotEventOverlap={false}
      eventMaxStack={3}
      // Enable built-in tooltips
      eventMouseEnter={(info) => {
        // FullCalendar will automatically show tooltip using the event's title property
      }}
      eventMouseLeave={(info) => {
        // FullCalendar will automatically hide tooltip
      }}
    />
  );
};

export default BookingCalendar;