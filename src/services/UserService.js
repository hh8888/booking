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

  async resetUserPassword(user) {
    try {
      console.log('Supabase URL:', process.env.REACT_APP_SUPABASE_URL);
      console.log('Attempting to send reset email to:', user.email);
      console.log('Redirect URL:', `${window.location.origin}/#/reset-password`);
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(
        user.email,
        {
          redirectTo: `${window.location.origin}/#/reset-password`
        }
      );
      
      console.log('Reset email response:', { data, error });
      
      if (error) {
        console.error('Reset email error:', error);
        throw new Error(`Password reset failed: ${error.message}`);
      }
      
      console.log('Reset email sent successfully');
      return { success: true, method: 'email' };
    } catch (error) {
      console.error('Reset password error:', error);
      throw new Error(`Failed to send reset email: ${error.message}`);
    }
  }

  async generateTemporaryPassword() {
    // Generate a random 12-character password with special characters
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  async manualPasswordReset(user, newPassword) {
    try {
      // This requires service role key in environment
      const { data, error } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
      );
      
      if (error) {
        throw new Error(`Manual password reset failed: ${error.message}`);
      }
      
      return { success: true, method: 'manual', newPassword };
    } catch (error) {
      throw new Error(`Failed to reset password manually: ${error.message}`);
    }
  }
}

export default UserService;