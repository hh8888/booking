import DatabaseService from './DatabaseService';
import { TABLES } from '../constants';
import { toast } from 'react-toastify';

class StaffAvailabilityService {
  static instance = null;
  
  static getInstance() {
    if (!StaffAvailabilityService.instance) {
      StaffAvailabilityService.instance = new StaffAvailabilityService();
    }
    return StaffAvailabilityService.instance;
  }

  async getStaffAvailability(staffId, locationId = null) {
    try {
      const dbService = DatabaseService.getInstance();
      
      const filters = { staff_id: staffId };
      
      // Add location filter if provided
      if (locationId !== null) {
        filters.location = locationId;
      }
      
      const availability = await dbService.fetchData(
        'staff_availability',
        'date',
        true,
        filters
      );

      console.log('Availability data:', availability);

      return availability;
    } catch (error) {
      console.error('Error fetching staff availability:', error);
      toast.error('Failed to fetch staff availability');
      return [];
    }
  }

  async updateStaffAvailability(staffId, availabilityData) {
    try {
      const dbService = DatabaseService.getInstance();
      const updates = availabilityData.map(async (schedule) => {
        const data = {
          staff_id: staffId,
          date: schedule.date,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          is_available: schedule.is_available,
          location: schedule.location // Add location field
        };

        // Check if availability already exists for this date
        const existingAvailability = await dbService.fetchData(
          'staff_availability',
          'date',
          true,
          { staff_id: staffId, date: schedule.date }
        );

        if (existingAvailability && existingAvailability.length > 0) {
          // Update existing availability
          await dbService.updateItem('staff_availability', {
            id: existingAvailability[0].id,
            ...data
          });
        } else {
          // Create new availability
          await dbService.createItem('staff_availability', data);
        }
      });

      await Promise.all(updates);
      toast.success('Staff availability updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating staff availability:', error);
      toast.error('Failed to update staff availability');
      return false;
    }
  }

  async isStaffAvailable(staffId, startTime, endTime) {
    try {
      const dbService = DatabaseService.getInstance();
      let date = new Date(startTime).toLocaleDateString("EN-CA");

      // Get staff availability for the specific day
      const availability = await dbService.fetchData(
        'staff_availability',
        'date',
        true,
        {
          staff_id: staffId,
          date: date,
          is_available: true
        }
      );

      // If no availability records found for this day, return false
      if (!availability || availability.length === 0) {
        return false;
      }

      // Check if the requested time slot falls within any available time slots
      return availability.some(slot => {
        const requestDate = new Date(startTime);
        const requestEndDate = new Date(endTime);

        // Create Date objects for slot times on the same day as the request
        const [slotStartHour, slotStartMinute] = slot.start_time.split(':');
        const [slotEndHour, slotEndMinute] = slot.end_time.split(':');

        const slotStart = new Date(requestDate);
        slotStart.setHours(parseInt(slotStartHour), parseInt(slotStartMinute), 0, 0);

        const slotEnd = new Date(requestDate);
        slotEnd.setHours(parseInt(slotEndHour), parseInt(slotEndMinute), 0, 0);

        // Handle case where end time is on the next day
        if (parseInt(slotEndHour) < parseInt(slotStartHour)) {
          slotEnd.setDate(slotEnd.getDate() + 1);
        }

        return requestDate >= slotStart && requestEndDate <= slotEnd;
      });
    } catch (error) {
      console.error('Error checking staff availability:', error);
      return false;
    }
  }

  async getAvailableStaffForTimeSlot(startTime, endTime) {
    try {
      const dbService = DatabaseService.getInstance();
      const date = new Date(startTime);
      const dateStr = date.toLocaleDateString("en-ca");
      const timeStr = date.toTimeString().split(' ')[0];

      // Get all staff members with their availability for the specific day
      const availability = await dbService.fetchData(
        'staff_availability',
        'date',
        true,
        {
          date: dateStr,
          is_available: true
        }
      );

      // Filter staff members who are available during the requested time slot
      const availableStaffIds = availability
        .filter(slot => {
          const slotStart = new Date(`1970-01-01T${slot.start_time}`);
          const slotEnd = new Date(`1970-01-01T${slot.end_time}`);
          const requestStart = new Date(`1970-01-01T${timeStr}`);
          const requestEnd = new Date(requestStart.getTime() + (new Date(endTime) - new Date(startTime)));

          return requestStart >= slotStart && requestEnd <= slotEnd;
        })
        .map(slot => slot.staff_id);

      // Get staff details for available staff members
      if (availableStaffIds.length > 0) {
        return await dbService.fetchData(
          TABLES.USERS,
          'created_at',
          false,
          {
            id: { in: availableStaffIds },
            role: { in: ['staff', 'admin'] }
          }
        );
      }

      return [];
    } catch (error) {
      console.error('Error getting available staff:', error);
      return [];
    }
  }

  // Add this new method to the StaffAvailabilityService class
  async getStaffAvailabilityForDateRange(staffId, startDate, endDate, locationId = null) {
    try {
      const dbService = DatabaseService.getInstance();
      
      // Format dates for database query
      const startDateStr = new Date(startDate).toLocaleDateString("en-CA");
      const endDateStr = new Date(endDate).toLocaleDateString("en-CA");
      
      // Build filter object
      const filters = {
        staff_id: staffId,
        date: { gte: startDateStr, lte: endDateStr },
        is_available: true
      };
      
      // Add location filter if provided
      if (locationId !== null) {
        filters.location = locationId;
      }
      
      // Single query to get all availability data for the date range
      const availability = await dbService.fetchData(
        'staff_availability',
        'date',
        true,
        filters
      );
      
      return availability;
    } catch (error) {
      console.error('Error fetching staff availability for date range:', error);
      return [];
    }
  }

  // Add this helper method to check availability from cached data
  isTimeSlotAvailableInData(availabilityData, date, startTime, endTime) {
    const dateStr = new Date(date).toLocaleDateString("en-CA");
    
    // Find availability records for the specific date
    const dayAvailability = availabilityData.filter(slot => slot.date === dateStr);
    
    if (!dayAvailability || dayAvailability.length === 0) {
      return false;
    }
    
    // Check if the requested time slot falls within any available time slots
    return dayAvailability.some(slot => {
      const requestDate = new Date(date);
      const requestEndDate = new Date(date);
      
      // Set the time for start and end
      const [startHour, startMinute] = startTime.split(':');
      const [endHour, endMinute] = endTime.split(':');
      
      requestDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
      requestEndDate.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);
      
      // Create Date objects for slot times
      const [slotStartHour, slotStartMinute] = slot.start_time.split(':');
      const [slotEndHour, slotEndMinute] = slot.end_time.split(':');
      
      const slotStart = new Date(requestDate);
      slotStart.setHours(parseInt(slotStartHour), parseInt(slotStartMinute), 0, 0);
      
      const slotEnd = new Date(requestDate);
      slotEnd.setHours(parseInt(slotEndHour), parseInt(slotEndMinute), 0, 0);
      
      // Handle case where end time is on the next day
      if (parseInt(slotEndHour) < parseInt(slotStartHour)) {
        slotEnd.setDate(slotEnd.getDate() + 1);
      }
      
      return requestDate >= slotStart && requestEndDate <= slotEnd;
    });
  }
}

export default StaffAvailabilityService;