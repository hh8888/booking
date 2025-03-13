import { supabase } from '../supabaseClient';
import DatabaseService from './DatabaseService';

class UserService {
  static instance = null;
  
  constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  static getInstance() {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  async fetchUsers() {
    return await this.dbService.fetchData('users', 'created_at', false);
  }

  async fetchRequiredFields() {
    try {
      const requiredUserFields = await this.dbService.getSettingsByKey('user', 'requiredUserFields');
      if (requiredUserFields) {
        return requiredUserFields.split(',');
      }
      return ['email', 'full_name', 'post_code'];
    } catch (error) {
      console.error('Error fetching required fields:', error);
      return ['email', 'full_name', 'post_code'];
    }
  }

  async createUser(userData) {
    // First create user in auth table
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.full_name,
          role: userData.role
        }
      }
    });
    
    if (authError) {
      throw new Error(`Auth Error: ${authError.message}`);
    }
    
    // Remove password field from userData
    const { password, ...userDataWithoutPassword } = userData;
    
    // Set user ID to auth user's ID
    userDataWithoutPassword.id = authData.user.id;
    
    // Create new user
    return await this.dbService.createItem('users', userDataWithoutPassword, 'User');
  }

  async updateUser(userData) {
    await this.dbService.updateItem('users', userData, 'User');
  }

  async deleteUsers(userIds) {
    await this.dbService.deleteItems('users', userIds, 'User');
  }

  async filterUsersByRole(users, role) {
    if (role === 'all') {
      return users;
    }
    return users.filter(user => user.role === role);
  }
}

export default UserService;