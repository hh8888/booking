import { toast } from 'react-toastify';
import DatabaseService from './DatabaseService';

class StaffDateAvailabilityService {
  static instance = null;
  
  static getInstance() {
    if (!StaffDateAvailabilityService.instance) {
      StaffDateAvailabilityService.instance = new StaffDateAvailabilityService();
    }
    return StaffDateAvailabilityService.instance;
  }

  async getStaffDateAvailability(staffId, startDate, endDate, locationId = null) {
    console.log('Service: getStaffDateAvailability called with:', { staffId, startDate, endDate, locationId });
    try {
      const dbService = DatabaseService.getInstance();
      
      const filters = {
        staff_id: staffId,
        date: {
          gte: startDate,
          lte: endDate
        }
      };
      
      // Add location filter with explicit null exclusion
      if (locationId !== null) {
        filters.location = locationId;
        // You could also add a separate call to exclude nulls
        // This would require modifying DatabaseService to support 'not null' operator
      }
      
      const availability = await dbService.fetchData(
        'staff_availability',
        'date',
        true,
        filters
      );
      
      // Filter out null location records on the client side as a temporary fix
      const filteredAvailability = locationId !== null 
        ? availability.filter(record => record.location === locationId)
        : availability;
      
      console.log('Service: availability data received:', filteredAvailability);
      return filteredAvailability;
    } catch (error) {
      console.error('Error fetching staff date availability:', error);
      toast.error('Failed to fetch staff availability');
      return [];
    }
  }

  async updateStaffDateAvailability(staffId, availabilityData) {
    try {
      const dbService = DatabaseService.getInstance();
      const updates = availabilityData.map(async (schedule) => {
        // Ensure date is used exactly as is without any conversion
        const data = {
          staff_id: staffId,
          date: schedule.date, // Use the date string directly without conversion
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          is_available: schedule.is_available,
          location: schedule.location
        };

        console.log('Saving availability with date:', data.date);

        if (schedule.id) {
          // Update existing availability - pass empty string to suppress individual toast
          await dbService.updateItem('staff_availability', {
            id: schedule.id,
            ...data
          }, '');
        } else {
          // Create new availability - pass empty string to suppress individual toast
          await dbService.createItem('staff_availability', data, '');
        }
      });

      await Promise.all(updates);
      
      // Show single consolidated toast message
      const count = availabilityData.length;
      if (count === 1) {
        toast.success('Staff availability updated successfully');
      } else {
        toast.success(`Staff availability updated successfully × ${count}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating staff date availability:', error);
      const count = availabilityData.length;
      if (count === 1) {
        toast.error('Failed to update staff availability');
      } else {
        toast.error(`Failed to update staff availability × ${count}`);
      }
      return false;
    }
  }

  async isStaffAvailableOnDate(staffId, date, startTime, endTime) {
    try {
      const dbService = DatabaseService.getInstance();
      
      // Get staff availability for the specific date
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

      // If no availability records found for this date, return false
      if (!availability || availability.length === 0) {
        return false;
      }

      // Check if the requested time slot falls within any available time slots
      return availability.some(slot => {
        const [slotStartHour, slotStartMinute] = slot.start_time.split(':');
        const [slotEndHour, slotEndMinute] = slot.end_time.split(':');
        const [requestStartHour, requestStartMinute] = startTime.split(':');
        const [requestEndHour, requestEndMinute] = endTime.split(':');

        const slotStartMinutes = parseInt(slotStartHour) * 60 + parseInt(slotStartMinute);
        const slotEndMinutes = parseInt(slotEndHour) * 60 + parseInt(slotEndMinute);
        const requestStartMinutes = parseInt(requestStartHour) * 60 + parseInt(requestStartMinute);
        const requestEndMinutes = parseInt(requestEndHour) * 60 + parseInt(requestEndMinute);

        return requestStartMinutes >= slotStartMinutes && requestEndMinutes <= slotEndMinutes;
      });
    } catch (error) {
      console.error('Error checking staff date availability:', error);
      return false;
    }
  }

  async getAvailableStaffForDateTimeSlot(date, startTime, endTime) {
    try {
      const dbService = DatabaseService.getInstance();

      // Get all staff members with their availability for the specific date
      const availability = await dbService.fetchData(
        'staff_availability',
        'date',
        true,
        {
          date: date,
          is_available: true
        }
      );

      // Filter staff members who are available during the requested time slot
      const availableStaffIds = availability
        .filter(slot => {
          const [slotStartHour, slotStartMinute] = slot.start_time.split(':');
          const [slotEndHour, slotEndMinute] = slot.end_time.split(':');
          const [requestStartHour, requestStartMinute] = startTime.split(':');
          const [requestEndHour, requestEndMinute] = endTime.split(':');

          const slotStartMinutes = parseInt(slotStartHour) * 60 + parseInt(slotStartMinute);
          const slotEndMinutes = parseInt(slotEndHour) * 60 + parseInt(slotEndMinute);
          const requestStartMinutes = parseInt(requestStartHour) * 60 + parseInt(requestStartMinute);
          const requestEndMinutes = parseInt(requestEndHour) * 60 + parseInt(requestEndMinute);

          return requestStartMinutes >= slotStartMinutes && requestEndMinutes <= slotEndMinutes;
        })
        .map(slot => slot.staff_id);

      // Get staff details for available staff members
      if (availableStaffIds.length > 0) {
        return await dbService.fetchData(
          'users',
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
}

export default StaffDateAvailabilityService;