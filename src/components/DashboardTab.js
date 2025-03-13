import React, { useState, useEffect } from 'react';
import DatabaseService from '../services/DatabaseService';
import { toast } from 'react-toastify';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

export default function DashboardTab() {
  const [tableStats, setTableStats] = useState({
    users: 0,
    services: 0,
    bookings: 0,
    todayBookings: 0,
    futureBookings: 0,
    pastBookings: 0
  });
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [staffColors, setStaffColors] = useState({});

  useEffect(() => {
    fetchTableStats();
    fetchBookingsWithStaff();
  }, []);

  const fetchBookingsWithStaff = async () => {
    try {
      const dbService = DatabaseService.getInstance();
      const [bookingsData, staffData, servicesData, showStaffNameSetting] = await Promise.all([
        dbService.fetchData('bookings'),
        dbService.fetchData('users', 'created_at', false, { role: { in: ['staff', 'admin'] } }, ['id', 'full_name']),
        dbService.fetchData('services'),
        dbService.getSettingsByKey('booking', 'showStaffName')
      ]);

      // Helper function to generate random colors
      const generateRandomColor = () => {
        const hue = Math.floor(Math.random() * 360); // random hue
        const saturation = 60 + Math.floor(Math.random() * 20); // moderate saturation
        const lightness = 45 + Math.floor(Math.random() * 15); // moderate lightness
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      };

      // Assign a random color to each staff member
      const colors = {};
      staffData.forEach((staff) => {
        colors[staff.id] = generateRandomColor();
      });
      setStaffColors(colors);

      // Convert booking data to calendar event format
      const calendarEvents = bookingsData.map(booking => {
        // Find corresponding service and staff information
        const service = servicesData.find(s => s.id === booking.service_id);
        const staff = staffData.find(s => s.id === service.staff_id);// use service.staff_id to match
        const staffName = staff?.full_name || 'Unknown';
        
        // Decide whether to show staff name based on settings
        const showStaffName = showStaffNameSetting === 'true';
        const title = showStaffName ? `${service?.name || 'Appointment'}-${staffName}` : service?.name || 'Appointment';

        return ({
          id: booking.id,
          title: title,
          start: booking.start_time,
          end: booking.end_time,
          backgroundColor: colors[service.staff_id] || '#666',
          borderColor: colors[service.staff_id] || '#666',
          extendedProps: {
            staffId: service.staff_id,
            staffName: staffName,
            customerName: booking.customer_name,
            serviceName: service?.name || 'Appointment'
          }
        });
      });

      setBookings(calendarEvents);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to fetch bookings');
    }
  };

  const fetchTableStats = async () => {
    try {
      const dbService = DatabaseService.getInstance();
      
      const [usersCount, servicesCount, bookings] = await Promise.all([
        dbService.getCount('users'),
        dbService.getCount('services'),
        dbService.fetchData('bookings')
      ]);

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const todayBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.start_time);
        return bookingDate >= now && bookingDate <= todayEnd;
      }).length;

      const futureBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.start_time);
        return bookingDate > todayEnd;
      }).length;

      const pastBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.start_time);
        return bookingDate < now;
      }).length;

      setTableStats({
        users: usersCount,
        services: servicesCount,
        bookings: bookings.length,
        todayBookings,
        futureBookings,
        pastBookings
      });
    } catch (error) {
      console.error('Error fetching table stats:', error);
      toast.error('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const handleEventClick = (info) => {
    const event = info.event;
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleCloseModal = () => {
    setShowEventModal(false);
    setSelectedEvent(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">System Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Today</h3>
          <p className="text-3xl font-bold text-orange-600">{tableStats.todayBookings}</p>
          <p className="text-sm text-gray-500 mt-1">Scheduled appointments</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Future Bookings</h3>
          <p className="text-3xl font-bold text-blue-600">{tableStats.futureBookings}</p>
          <p className="text-sm text-gray-500 mt-1">Upcoming appointments</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-700 mb-4">Booking Calendar</h3>
        <div className="staff-legend flex flex-wrap gap-4 mb-4">
          {Object.entries(staffColors).map(([staffId, color]) => {
            const staff = bookings.find(b => b.extendedProps.staffId === staffId);
            return (
              <div key={staffId} className="flex items-center">
                <div
                  className="w-4 h-4 rounded-full mr-2"
                  style={{ backgroundColor: color }}
                ></div>
                <span className="text-sm text-gray-600">
                  {staff?.extendedProps.staffName || 'Unknown'}
                </span>
              </div>
            );
          })}
        </div>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,dayGridDay'
          }}
          firstDay={1}
          events={bookings}
          eventClick={handleEventClick}
          height="auto"
          aspectRatio={1.8}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false,
            hour12: false
          }}
        />
      </div>
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Booking Details</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center">
                <span className="font-medium w-24">Service:</span>
                <span>{selectedEvent.extendedProps.serviceName}</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium w-24">Customer:</span>
                <span>{selectedEvent.extendedProps.customerName}</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium w-24">Staff:</span>
                <span>{selectedEvent.extendedProps.staffName}</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium w-24">Start Time:</span>
                <span>{new Date(selectedEvent.start).toLocaleString()}</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium w-24">End Time:</span>
                <span>{new Date(selectedEvent.end).toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}