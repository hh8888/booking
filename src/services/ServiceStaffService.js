import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';
import DatabaseService from './DatabaseService';

/**
 * ServiceStaffService - Service class handling many-to-many relationships between services and staff
 */
class ServiceStaffService {
  // Private static instance variable
  static instance = null;

  // Private constructor to prevent direct instance creation
  constructor() {
    if (ServiceStaffService.instance) {
      throw new Error('ServiceStaffService already exists, please use getInstance() method to get the instance');
    }
  }

  /**
   * Get the singleton instance of ServiceStaffService
   * @returns {ServiceStaffService} Singleton instance
   */
  static getInstance() {
    if (!ServiceStaffService.instance) {
      ServiceStaffService.instance = new ServiceStaffService();
    }
    return ServiceStaffService.instance;
  }

  /**
   * Assign multiple staff to a service
   * @param {string} serviceId - Service ID
   * @param {Array<string>} staffIds - Array of staff IDs
   * @returns {Promise<void>}
   */
  async assignStaffToService(serviceId, staffIds) {
    try {
      // First delete all existing staff assignments for this service
      await this.removeAllStaffFromService(serviceId);

      // If no staff needs to be assigned, return directly
      if (!staffIds || staffIds.length === 0) {
        return;
      }

      // Prepare data for insertion
      const assignments = staffIds.map(staffId => ({
        service_id: serviceId,
        staff_id: staffId
      }));

      // Insert new staff assignments
      const { error } = await supabase
        .from('service_staff')
        .insert(assignments);

      if (error) throw error;
    } catch (error) {
      console.error('Error assigning staff to service:', error.message);
      toast.error(`Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove all staff assignments for a service
   * @param {string} serviceId - Service ID
   * @returns {Promise<void>}
   */
  async removeAllStaffFromService(serviceId) {
    try {
      const { error } = await supabase
        .from('service_staff')
        .delete()
        .eq('service_id', serviceId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing staff from service:', error.message);
      throw error;
    }
  }

  /**
   * Get all assigned staff for a service
   * @param {string} serviceId - Service ID
   * @returns {Promise<Array>} Array of staff IDs
   */
  async getServiceStaff(serviceId) {
    try {
      const { data, error } = await supabase
        .from('service_staff')
        .select('staff_id')
        .eq('service_id', serviceId);

      if (error) throw error;
      return data.map(item => item.staff_id);
    } catch (error) {
      console.error('Error getting service staff:', error.message);
      return [];
    }
  }

  /**
   * Get all services assigned to a staff member
   * @param {string} staffId - Staff ID
   * @returns {Promise<Array>} Array of service IDs
   */
  async getStaffServices(staffId) {
    try {
      const { data, error } = await supabase
        .from('service_staff')
        .select('service_id')
        .eq('staff_id', staffId);

      if (error) throw error;
      return data.map(item => item.service_id);
    } catch (error) {
      console.error('Error getting staff services:', error.message);
      return [];
    }
  }

  /**
   * Get all services and their assigned staff
   * @returns {Promise<Array>} Services and their staff data
   */
  async getAllServicesWithStaff() {
    try {
      // Get all services
      const dbService = DatabaseService.getInstance();
      const services = await dbService.fetchData('services');
      
      // Get all service-staff assignments
      const { data: serviceStaffData, error } = await supabase
        .from('service_staff')
        .select('service_id, staff_id');
      
      if (error) throw error;
      
      // Add staff ID array for each service
      return services.map(service => {
        const staffAssignments = serviceStaffData.filter(item => item.service_id === service.id);
        return {
          ...service,
          staff_ids: staffAssignments.map(item => item.staff_id)
        };
      });
    } catch (error) {
      console.error('Error getting services with staff:', error.message);
      return [];
    }
  }
}

export default ServiceStaffService;