import { supabase } from '../supabaseClient';
import DatabaseService from './DatabaseService';
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
    const data = await this.dbService.fetchData('bookings', 'start_time', false);
    return this.processBookingsData(data, serviceData, customerData);
  }

  processBookingsData(bookings, servicesData, customersData) {
    return bookings.map(booking => {
      const service = servicesData.find(s => s.id === booking.service_id);
      const customer = customersData.find(c => c.id === booking.customer_id);
      
      const durationInMinutes = this.calculateDuration(booking, service);
      
      return {
        ...booking,
        service_name: service?.name || '',
        customer_name: customer?.full_name || '',
        booking_time_formatted: booking.start_time,
        created_at_formatted: booking.created_at,
        duration: durationInMinutes,
        start_time: booking.start_time,
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
    await this.validateBookingTime(bookingData.start_time);
    return await this.dbService.createItem('bookings', bookingData, 'Booking');
  }

  async updateBooking(bookingData) {
    await this.validateBookingTime(bookingData.start_time);
    await this.dbService.updateItem('bookings', bookingData, 'Booking');
  }

  async deleteBookings(bookingIds) {
    await this.dbService.deleteItems('bookings', bookingIds, 'Booking');
  }
}

export default BookingService;