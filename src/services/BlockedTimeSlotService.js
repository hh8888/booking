import { supabase } from '../supabaseClient';
import { BOOKING_STATUS } from '../constants/bookingConstants';
import DatabaseService from './DatabaseService';
import { TABLES } from '../constants';

export const BlockedTimeSlotService = {
  // Get or create the "__Blocked" service
  async getOrCreateBlockedService() {
    try {
      const dbService = DatabaseService.getInstance();
      
      // First, try to find existing "__Blocked" service
      const existingServices = await dbService.fetchData(TABLES.SERVICES, 'name', false, { name: '__Blocked' });
      
      if (existingServices && existingServices.length > 0) {
        return existingServices[0];
      }
      
      // If not found, create the "__Blocked" service
      const blockedServiceData = {
        name: '__Blocked',
        description: 'Internal service for blocked time slots - not visible to customers',
        price: 0,
        duration: 60, // Default 1 hour
        staff_id: null // Available to all staff
      };
      
      const newService = await dbService.createItem(TABLES.SERVICES, blockedServiceData, 'Service');
      return newService;
    } catch (error) {
      console.error('Error getting or creating blocked service:', error);
      throw error;
    }
  },

  // Create blocked slot as a special booking
  async createBlockedSlot(staffId, startTime, endTime, notes = '', location = null) {
    try {
      console.log('Creating blocked slot with staffId:', staffId);
      
      if (!staffId) {
        throw new Error('Staff ID is required to create a blocked time slot');
      }
      
      // Get or create the "__Blocked" service
      const blockedService = await this.getOrCreateBlockedService();
      const dbService = DatabaseService.getInstance();
      
      const blockedSlotData = {
        provider_id: staffId,
        customer_id: staffId, // Set customer to staff as well
        service_id: blockedService.id, // Use the "__Blocked" service
        start_time: startTime,
        end_time: endTime,
        status: BOOKING_STATUS.BLOCKED,
        notes: notes || 'Blocked time slot',
        location: location
      };
      
      console.log('Blocked slot data:', blockedSlotData);
      const result = await dbService.createItem(TABLES.BOOKINGS, blockedSlotData, 'Blocked time slot');
      return result;
    } catch (error) {
      console.error('Error creating blocked slot:', error);
      throw error;
    }
  },
  
  // Get all blocked slots for a staff member
  async getBlockedSlots(staffId) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('provider_id', staffId)
      .eq('status', BOOKING_STATUS.BLOCKED)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching blocked slots:', error);
      throw error;
    }

    return data || [];
  },

  // Get blocked slots for a specific date
  async getBlockedSlotsForDate(staffId, date) {
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;
    
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('provider_id', staffId)
      .eq('status', BOOKING_STATUS.BLOCKED)
      .gte('start_time', startOfDay)
      .lte('start_time', endOfDay)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching blocked slots for date:', error);
      throw error;
    }

    return data || [];
  },

  // Delete a blocked time slot
  async deleteBlockedSlot(slotId) {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', slotId)
      .eq('status', BOOKING_STATUS.BLOCKED);

    if (error) {
      console.error('Error deleting blocked slot:', error);
      throw error;
    }

    return true;
  },

  // Check if a time slot is blocked
  async isTimeSlotBlocked(staffId, date, startTime, endTime) {
    const checkStartTime = `${date}T${startTime}:00`;
    const checkEndTime = `${date}T${endTime}:00`;
    
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('provider_id', staffId)
      .eq('status', BOOKING_STATUS.BLOCKED)
      .or(`start_time.lte.${checkStartTime},end_time.gte.${checkEndTime}`)
      .or(`start_time.gte.${checkStartTime},start_time.lt.${checkEndTime}`)
      .or(`end_time.gt.${checkStartTime},end_time.lte.${checkEndTime}`);

    if (error) {
      console.error('Error checking blocked time slot:', error);
      throw error;
    }

    return data && data.length > 0;
  },

  // Get all blocked time slots for multiple staff members
  async getBlockedSlotsForStaff(staffIds, startDate, endDate) {
    const startDateTime = `${startDate}T00:00:00`;
    const endDateTime = `${endDate}T23:59:59`;
    
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .in('provider_id', staffIds)
      .eq('status', BOOKING_STATUS.BLOCKED)
      .gte('start_time', startDateTime)
      .lte('start_time', endDateTime)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching blocked slots for staff:', error);
      throw error;
    }

    return data || [];
  },

  
};