import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';
import DatabaseService from './DatabaseService';

/**
 * ServiceStaffService - 处理服务与员工之间多对多关系的服务类
 */
class ServiceStaffService {
  // 私有静态实例变量
  static instance = null;

  // 私有构造函数，防止外部直接创建实例
  constructor() {
    if (ServiceStaffService.instance) {
      throw new Error('ServiceStaffService已经存在，请使用getInstance()方法获取实例');
    }
  }

  /**
   * 获取ServiceStaffService的单例实例
   * @returns {ServiceStaffService} 单例实例
   */
  static getInstance() {
    if (!ServiceStaffService.instance) {
      ServiceStaffService.instance = new ServiceStaffService();
    }
    return ServiceStaffService.instance;
  }

  /**
   * 为服务分配多个员工
   * @param {string} serviceId - 服务ID
   * @param {Array<string>} staffIds - 员工ID数组
   * @returns {Promise<void>}
   */
  async assignStaffToService(serviceId, staffIds) {
    try {
      // 首先删除该服务的所有现有员工分配
      await this.removeAllStaffFromService(serviceId);

      // 如果没有员工需要分配，则直接返回
      if (!staffIds || staffIds.length === 0) {
        return;
      }

      // 准备插入数据
      const assignments = staffIds.map(staffId => ({
        service_id: serviceId,
        staff_id: staffId
      }));

      // 插入新的员工分配
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
   * 移除服务的所有员工分配
   * @param {string} serviceId - 服务ID
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
   * 获取服务的所有分配员工
   * @param {string} serviceId - 服务ID
   * @returns {Promise<Array>} 员工ID数组
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
   * 获取员工分配的所有服务
   * @param {string} staffId - 员工ID
   * @returns {Promise<Array>} 服务ID数组
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
   * 获取所有服务及其分配的员工
   * @returns {Promise<Array>} 服务及其员工数据
   */
  async getAllServicesWithStaff() {
    try {
      // 获取所有服务
      const dbService = DatabaseService.getInstance();
      const services = await dbService.fetchData('services');
      
      // 获取所有服务-员工分配
      const { data: serviceStaffData, error } = await supabase
        .from('service_staff')
        .select('service_id, staff_id');
      
      if (error) throw error;
      
      // 为每个服务添加员工ID数组
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