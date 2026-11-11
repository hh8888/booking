import { supabase } from '../supabaseClient';
import DatabaseService from './DatabaseService';
import { TABLES } from '../constants';
import { toast } from 'react-toastify';

class ClosedDatesService {
  static instance = null;
  
  constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  static getInstance() {
    if (!ClosedDatesService.instance) {
      ClosedDatesService.instance = new ClosedDatesService();
    }
    return ClosedDatesService.instance;
  }

  /**
   * Check if a specific date is closed for bookings
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {number} locationId - Optional location ID
   * @returns {Promise<boolean>} True if date is closed
   */
  async isDateClosed(date, locationId = null) {
    try {
      const filters = { date };
      
      // If location is specified, check for location-specific or global closures
      if (locationId) {
        const { data, error } = await supabase
          .from('closed_dates')
          .select('*')
          .eq('date', date)
          .or(`location.eq.${locationId},location.is.null`);
          
        if (error) throw error;
        return data && data.length > 0;
      } else {
        // Check for any closure on this date
        const closedDates = await this.dbService.fetchData('closed_dates', 'created_at', false, filters);
        return closedDates && closedDates.length > 0;
      }
    } catch (error) {
      console.error('Error checking if date is closed:', error);
      return false;
    }
  }

  /**
   * Get all closed dates
   * @param {number} locationId - Optional location filter
   * @returns {Promise<Array>} Array of closed date records
   */
  async getClosedDates(locationId = null) {
    try {
      const filters = locationId ? { location: locationId } : {};
      return await this.dbService.fetchData('closed_dates', 'date', true, filters);
    } catch (error) {
      console.error('Error fetching closed dates:', error);
      return [];
    }
  }

  /**
   * Add a new closed date
   * @param {Object} closedDateData - Closed date data
   * @returns {Promise<Object>} Created closed date record
   */
  async addClosedDate(closedDateData) {
    try {
      const result = await this.dbService.createItem('closed_dates', closedDateData, 'Closed Date');
      toast.success('Date marked as closed successfully!');
      return result;
    } catch (error) {
      console.error('Error adding closed date:', error);
      toast.error('Failed to mark date as closed');
      throw error;
    }
  }

  /**
   * Remove a closed date
   * @param {string} closedDateId - ID of the closed date to remove
   * @returns {Promise<void>}
   */
  async removeClosedDate(closedDateId) {
    try {
      await this.dbService.deleteItems('closed_dates', [closedDateId], 'Closed Date');
      toast.success('Closed date removed successfully!');
    } catch (error) {
      console.error('Error removing closed date:', error);
      toast.error('Failed to remove closed date');
      throw error;
    }
  }

  /**
   * Update a closed date
   * @param {Object} closedDateData - Updated closed date data
   * @returns {Promise<void>}
   */
  async updateClosedDate(closedDateData) {
    try {
      await this.dbService.updateItem('closed_dates', closedDateData, 'Closed Date');
      toast.success('Closed date updated successfully!');
    } catch (error) {
      console.error('Error updating closed date:', error);
      toast.error('Failed to update closed date');
      throw error;
    }
  }
}

export default ClosedDatesService;