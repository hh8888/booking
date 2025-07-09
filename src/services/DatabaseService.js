import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';
import { TABLES } from '../constants';

/**
 * DatabaseService - Singleton database service class
 * Encapsulates all CRUD operations with Supabase database
 */
class DatabaseService {
  // Private static instance variable
  static instance = null;

  // Private constructor to prevent direct instantiation
  constructor() {
    if (DatabaseService.instance) {
      throw new Error('DatabaseService instance already exists, please use getInstance() method');
    }
  }

  /**
   * Get the singleton instance of DatabaseService
   * @returns {DatabaseService} Singleton instance
   */
  static getInstance() {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Generic data fetch method
   * @param {string} table - Table name
   * @param {string} orderBy - Order by field
   * @param {boolean} ascending - Sort in ascending order
   * @param {Object} filters - Filter conditions {column: value}
   * @returns {Promise<Array>} Data array
   */
  async fetchData(table, orderBy = 'created_at', ascending = false, filters = {}) {
    try {
      let query = supabase.from(table).select('*');
      
      // Add filter conditions
      Object.entries(filters).forEach(([column, value]) => {
        if (typeof value === 'object' && value !== null) {
          // Handle complex filter conditions
          Object.entries(value).forEach(([operator, operatorValue]) => {
            switch(operator) {
              case 'gt':
                query = query.gt(column, operatorValue);
                break;
              case 'gte':
                query = query.gte(column, operatorValue);
                break;
              case 'lt':
                query = query.lt(column, operatorValue);
                break;
              case 'lte':
                query = query.lte(column, operatorValue);
                break;
              case 'neq':
                query = query.neq(column, operatorValue);
                break;
              case 'in':
                query = query.in(column, operatorValue);
                break;
              case 'contains':
                query = query.ilike(column, `%${operatorValue}%`);
                break;
              default:
                console.warn(`Unsupported operator: ${operator}`);
            }
          });
        } else {
          // Simple equality condition
          query = query.eq(column, value);
          
          // For location field, also exclude null values to ensure strict filtering
          if (column === 'location' && value !== null) {
            query = query.not(column, 'is', null);
          }
        }
      });
      
      // Add sorting
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
   * Generic data creation method
   * @param {string} table - Table name
   * @param {Object} data - Data to create
   * @param {string} resourceName - Resource name (for notifications)
   * @returns {Promise<Object>} Created data
   */
  async createItem(table, data, resourceName = 'Item') {
    try {
      const { data: newData, error } = await supabase
        .from(table)
        .insert([data])
        .select();

      if (error) throw error;
      
      // Only show toast if resourceName is not empty
      if (resourceName) {
        toast.success(`${resourceName} created successfully!`);
      }
      return newData[0];
    } catch (error) {
      console.error(`Error creating ${resourceName}:`, error.message);
      // Only show toast if resourceName is not empty
      if (resourceName) {
        toast.error(`Error: ${error.message}`);
      }
      throw error;
    }
  }

  async updateItem(table, data, resourceName = 'Item') {
    try {
      // Create a copy of data and remove created_at to prevent accidental modification
      const { created_at, ...updateData } = data;
      
      // Log warning if created_at was in the data object
      if (created_at !== undefined) {
        console.warn(`Warning: Attempted to update created_at field in ${table} table. This field should not be modified. Removing from update.`);
      }
      
      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', data.id);

      if (error) throw error;
      
      // Only show toast if resourceName is not empty
      if (resourceName) {
        toast.success(`${resourceName} updated successfully!`);
      }
    } catch (error) {
      console.error(`Error updating ${resourceName}:`, error.message);
      // Only show toast if resourceName is not empty
      if (resourceName) {
        toast.error(`Error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Generic data deletion method
   * @param {string} table - Table name
   * @param {Array<string>} ids - Array of IDs to delete
   * @param {string} resourceName - Resource name (for notifications)
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
   * Get specific columns from a table
   * @param {string} table - Table name
   * @param {string} columns - Columns to select
   * @param {Object} filters - Filter conditions {column: value}
   * @returns {Promise<Array>} Data array
   */
  async fetchSpecificColumns(table, columns, filters = {}) {
    try {
      let query = supabase.from(table).select(columns);
      
      // Add filter conditions
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

  /**
   * Get system settings by category and key
   * @param {string} category - Setting category
   * @param {string} key - Setting key
   * @returns {Promise<Object>} Setting value
   */
  async getSettingsByKey(category, key) {
    try {
      const { data, error } = await supabase
        .from(TABLES.SETTINGS)
        .select('value')
        .eq('category', category)
        .eq('key', key)
        .maybeSingle();

      if (error) throw error;
      
      // If no record found, return null
      if (!data) {
        console.log(`No setting found for category: ${category}, key: ${key}`);
        return null;
      }
      
      return data.value;
    } catch (error) {
      console.error('Error fetching settings:', error.message);
      toast.error('Unable to get system settings');
      return null;
    }
  }

  /**
   * Update or insert system settings
   * @param {string} category - Setting category
   * @param {string} key - Setting key
   * @param {string|boolean|number} value - Setting value
   * @returns {Promise<void>}
   */
  /**
   * Update or create a setting
   * @param {string} category - Setting category
   * @param {string} key - Setting key
   * @param {string} value - Setting value
   * @returns {Promise<void>}
   */
  async updateSettings(category, key, value) {
    try {
      // Check if setting exists
      const { data, error: fetchError } = await supabase
        .from(TABLES.SETTINGS)
        .select('*')
        .eq('category', category)
        .eq('key', key);
      
      if (fetchError) throw fetchError;
      
      if (data && data.length > 0) {
        // Update existing setting
        const { error: updateError } = await supabase
          .from(TABLES.SETTINGS)
          .update({ value })
          .eq('category', category)
          .eq('key', key);
        
        if (updateError) throw updateError;
      } else {
        // Create new setting
        const { error: insertError } = await supabase
          .from(TABLES.SETTINGS)
          .insert([{ category, key, value }]);
        
        if (insertError) throw insertError;
      }
      
      toast.success('Setting updated successfully!');
    } catch (error) {
      console.error(`Error updating setting ${category}.${key}:`, error.message);
      toast.error(`Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the number of records in a specified table
   * @param {string} table - Table name
   * @returns {Promise<number>} Record count
   */
  async getCount(table) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count;
    } catch (error) {
      console.error(`Error getting count for ${table}:`, error.message);
      return 0;
    }
  }
}

export default DatabaseService;