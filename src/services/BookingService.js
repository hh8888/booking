import { supabase } from '../supabaseClient';
import DatabaseService from './DatabaseService';
import { TABLES } from '../constants';
import DateTimeFormatter from '../utils/DateTimeFormatter';

class BookingService {
  static instance = null;
  
  constructor() {
    this.dbService = DatabaseService.getInstance();
    this.formatter = DateTimeFormatter.getInstance();
  }

  static getInstance() {
    if (!BookingService.instance) {
      BookingService.instance = new BookingService();
    }
    return BookingService.instance;
  }

  async getBookingTimeInterval() {
    try {
      const interval = await this.dbService.getSettingsByKey('booking', 'bookingTimeSlotInterval');
      if (interval) {
        const intervalValue = parseInt(interval);
        if (!isNaN(intervalValue) && intervalValue > 0) {
          return intervalValue;
        }
      }
      return 30; // default 30 minutes
    } catch (error) {
      console.error('Error fetching booking time interval:', error);
      return 30;
    }
  }

  async fetchBookings(serviceData, customerData) {
    const data = await this.dbService.fetchData(TABLES.BOOKINGS, 'start_time', false);
    return this.processBookingsData(data, serviceData, customerData);
  }

  processBookingsData(bookings, servicesData, customersData, staffData = []) {
    return bookings.map(booking => {
      const service = servicesData.find(s => s.id === booking.service_id);
      const customer = customersData.find(c => c.id === booking.customer_id);
      const provider = staffData.find(s => s.id === booking.provider_id);
      
      const durationInMinutes = this.calculateDuration(booking, service);
      
      // Convert GMT times to local time for display
      // const localStartTime = this.formatter.convertGMTStringToLocalString(booking.start_time);
      // const localCreatedAt = this.formatter.convertGMTStringToLocalString(booking.created_at);
      const localStartTime = booking.start_time;
      const localCreatedAt = booking.created_at;
      
      // Extract date and time components from start_time
      const startDate = new Date(booking.start_time);
      
      return {
        ...booking,
        service_name: service?.name || '',
        customer_name: customer?.full_name || '',
        provider_name: provider?.full_name || '',
        booking_time_formatted: localStartTime,
        created_at_formatted: localCreatedAt,
        duration: durationInMinutes,
        start_time: booking.start_time,
        start_date: startDate.toLocaleDateString('en-CA'),
        start_time_hour: startDate.getHours().toString().padStart(2, '0'),
        start_time_minute: startDate.getMinutes().toString().padStart(2, '0'),
        recurring_type: booking.recurring_type,
        recurring_count: booking.recurring_count || 0
      };
    });
  }

  calculateDuration(booking, service) {
    if (service?.duration) {
      return this.parseDuration(service.duration);
    } else if (booking.start_time && booking.end_time) {
      const startTime = new Date(booking.start_time);
      const endTime = new Date(booking.end_time);
      return Math.round((endTime - startTime) / 60000);
    }
    return 60; // default 60 minutes
  }

  parseDuration(duration) {
    if (typeof duration === 'number') {
      return duration;
    }

    if (typeof duration === 'string') {
      if (duration.includes(':')) {
        const timeParts = duration.split(':');
        if (timeParts.length === 3) {
          return parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]) + parseInt(timeParts[2]) / 60;
        } else if (timeParts.length === 2) {
          return parseInt(timeParts[0]) + parseInt(timeParts[1]) / 60;
        }
      } else if (duration.includes('hour') || duration.includes('minute') || duration.includes('second')) {
        let minutes = 0;
        
        const hourMatch = duration.match(/(d+)\s+hour/i);
        if (hourMatch) minutes += parseInt(hourMatch[1]) * 60;
        
        const minuteMatch = duration.match(/(d+)\s+minute/i);
        if (minuteMatch) minutes += parseInt(minuteMatch[1]);
        
        const secondMatch = duration.match(/(d+)\s+second/i);
        if (secondMatch) minutes += parseInt(secondMatch[1]) / 60;
        
        return minutes;
      }
    }
    
    return 60; // default 60 minutes
  }

  filterBookingsByTime(bookings, timeFilter) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return bookings.filter(booking => {
      const bookingDate = new Date(booking.start_time);
      bookingDate.setHours(0, 0, 0, 0);

      if (timeFilter === 'today+') {
        return bookingDate >= now;
      } else if (timeFilter === 'past') {
        return bookingDate < now;
      }
      return true;
    });
  }

  async validateBookingTime(startTime) {

      const advanceBookingDays = await this.dbService.getSettingsByKey('booking', 'advanceBookingDays');
      const maxAdvanceDays = advanceBookingDays ? parseInt(advanceBookingDays) : 30;
      
      const now = new Date();
      const bookingDate = new Date(startTime);
      const daysDifference = Math.floor((bookingDate - now) / (1000 * 60 * 60 * 24));
      
      if (daysDifference < 0) {
        throw new Error('Cannot book appointments in the past');
      }
      
      if (daysDifference > maxAdvanceDays) {
        throw new Error(`Cannot book appointments more than ${maxAdvanceDays} days in advance`);
      }
      
      return true;

  }

  async createBooking(bookingData) {
    console.log('Creating:',bookingData.start_time);
    await this.validateBookingTime(bookingData.start_time);
    return await this.dbService.createItem(TABLES.BOOKINGS, bookingData, 'Booking');
  }

  async updateBooking(bookingData) {
    console.log('Updating:', bookingData.start_time);
    
    // Get the old booking data before updating
    const oldBooking = await this.getBookingById(bookingData.id);
    
    await this.validateBookingTime(bookingData.start_time);
    await this.dbService.updateItem(TABLES.BOOKINGS, bookingData, 'Booking');
    
    // Check if status changed and trigger email notification
    if (oldBooking && oldBooking.status !== bookingData.status) {
      await this.triggerStatusChangeEmail(bookingData.id, oldBooking.status, bookingData.status);
    }
  }
  
  // Add new method to get booking by ID
  async getBookingById(bookingId) {
    try {
      const bookings = await this.dbService.fetchData(TABLES.BOOKINGS, 'created_at', false, { id: bookingId });
      return bookings.length > 0 ? bookings[0] : null;
    } catch (error) {
      console.error('Error fetching booking by ID:', error);
      return null;
    }
  }
  
  // Add new method to trigger email notifications
  async triggerStatusChangeEmail(bookingId, oldStatus, newStatus, emailRecipients = 'both') {
    try {
      const { data, error } = await supabase.functions.invoke('send-booking-status-email', {
        body: {
          bookingId,
          oldStatus,
          newStatus,
          emailRecipients
        }
      });
      
      if (error) {
        console.error('Edge Function error:', error);
        throw new Error(`Failed to send email notification: ${error.message}`);
      }
      
      console.log('Email notification sent successfully:', data);
      return data;
    } catch (error) {
      console.error('Failed to send email notification:', error);
      // Don't throw error to prevent booking update from failing
    }
  }

  async deleteBookings(bookingIds) {
    await this.dbService.deleteItems(TABLES.BOOKINGS, bookingIds, 'Booking');
  }
}

export default BookingService;