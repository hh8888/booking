import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';

/**
 * DatabaseService - 单例模式的数据库服务类
 * 封装所有与Supabase数据库的CRUD操作
 */
class DatabaseService {
  // 私有静态实例变量
  static instance = null;

  // 私有构造函数，防止外部直接创建实例
  constructor() {
    if (DatabaseService.instance) {
      throw new Error('DatabaseService已经存在，请使用getInstance()方法获取实例');
    }
  }

  /**
   * 获取DatabaseService的单例实例
   * @returns {DatabaseService} 单例实例
   */
  static getInstance() {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * 通用获取数据方法
   * @param {string} table - 表名
   * @param {string} orderBy - 排序字段
   * @param {boolean} ascending - 是否升序
   * @param {Object} filters - 过滤条件 {column: value}
   * @returns {Promise<Array>} 数据数组
   */
  async fetchData(table, orderBy = 'created_at', ascending = false, filters = {}) {
    try {
      let query = supabase.from(table).select('*');
      
      // 添加过滤条件
      Object.entries(filters).forEach(([column, value]) => {
        query = query.eq(column, value);
      });
      
      // 添加排序
      if (orderBy) {
        query = query.order(orderBy, { ascending });
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching ${table}:`, error.message);
      return [];
    }
  }

  /**
   * 通用创建数据方法
   * @param {string} table - 表名
   * @param {Object} data - 要创建的数据
   * @param {string} resourceName - 资源名称（用于提示消息）
   * @returns {Promise<Object>} 创建的数据
   */
  async createItem(table, data, resourceName = 'Item') {
    try {
      const { data: newData, error } = await supabase
        .from(table)
        .insert([data])
        .select();

      if (error) throw error;
      
      toast.success(`${resourceName} created successfully!`);
      return newData[0];
    } catch (error) {
      console.error(`Error creating ${resourceName}:`, error.message);
      toast.error(`Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * 通用更新数据方法
   * @param {string} table - 表名
   * @param {Object} data - 要更新的数据
   * @param {string} resourceName - 资源名称（用于提示消息）
   * @returns {Promise<void>}
   */
  async updateItem(table, data, resourceName = 'Item') {
    try {
      const { error } = await supabase
        .from(table)
        .update(data)
        .eq('id', data.id);

      if (error) throw error;
      
      toast.success(`${resourceName} updated successfully!`);
    } catch (error) {
      console.error(`Error updating ${resourceName}:`, error.message);
      toast.error(`Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * 通用删除数据方法
   * @param {string} table - 表名
   * @param {Array<string>} ids - 要删除的ID数组
   * @param {string} resourceName - 资源名称（用于提示消息）
   * @returns {Promise<void>}
   */
  async deleteItems(table, ids, resourceName = 'Item') {
    if (ids.length === 0) {
      toast.error(`No ${resourceName.toLowerCase()}s selected for deletion.`);
      return;
    }

    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .in('id', ids);

      if (error) throw error;
      
      toast.success(`Selected ${resourceName.toLowerCase()}s deleted successfully!`);
    } catch (error) {
      console.error(`Error deleting ${resourceName.toLowerCase()}s:`, error.message);
      toast.error(`Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取特定表的特定字段
   * @param {string} table - 表名
   * @param {string} columns - 要选择的列
   * @param {Object} filters - 过滤条件 {column: value}
   * @returns {Promise<Array>} 数据数组
   */
  async fetchSpecificColumns(table, columns, filters = {}) {
    try {
      let query = supabase.from(table).select(columns);
      
      // 添加过滤条件
      Object.entries(filters).forEach(([column, value]) => {
        query = query.eq(column, value);
      });
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching ${table}:`, error.message);
      return [];
    }
  }
}

export default DatabaseService;