import DatabaseService from './DatabaseService';
import { supabase } from '../supabaseClient';
import { TABLES, ERROR_MESSAGES } from '../constants';
import { isFakeEmail } from '../utils/validationUtils';

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
    try {
      // Fetch users from the users table (email_verified column now exists in database)
      const users = await this.dbService.fetchData(TABLES.USERS, 'created_at', false);
      //console.log('UserService.fetchUsers - Raw data from database:', users);
      //console.log('UserService.fetchUsers - First user email_verified:', users[0]?.email_verified, 'type:', typeof users[0]?.email_verified);
      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      // Fallback: return users without verification status
      const fallbackUsers = await this.dbService.fetchData(TABLES.USERS, 'created_at', false);
      return fallbackUsers.map(user => ({
        ...user,
        email_verified: false // Default to false if there's an error
      }));
    }
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
    try {
      // Check if email is a fake temp.local address
      const isFakeEmailAddress = isFakeEmail(userData.email);
      
      let authData;
      if (isFakeEmailAddress) {
        // For fake emails, try creating auth user with a more permissive approach
        try {
          const { data: realAuthData, error: authError } = await supabase.auth.signUp({
            email: userData.email, // Use the fake email
            password: userData.password,
            options: {
              data: {
                full_name: userData.full_name,
                role: userData.role
              },
              // Skip email confirmation for fake emails
              emailRedirectTo: undefined
            }
          });
          
          if (authError) {
            console.error('Auth signup failed for fake email:', authError);
            // Instead of falling back to manual approach, throw a more specific error
            throw new Error(`Unable to create user account: ${authError.message}. Please try with a different email or contact support.`);
          }
          
          authData = realAuthData;
        } catch (authSignupError) {
          // If auth signup completely fails, we cannot proceed due to RLS policy
          throw new Error(`Unable to create user account: ${authSignupError.message}. The system requires valid authentication for all users.`);
        }
      } else {
        // For real emails, use normal Supabase auth signup
        const { data: realAuthData, error: authError } = await supabase.auth.signUp({
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
           // Check for duplicate email in auth
           if (authError.message && authError.message.includes('already registered')) {
             throw new Error(ERROR_MESSAGES.DUPLICATE_EMAIL);
           }
           throw new Error(`Auth Error: ${authError.message}`);
         }
         
         authData = realAuthData;
      }
      
      // Remove password field from userData
      const { password, ...userDataWithoutPassword } = userData;
      
      // Set user ID to auth user's ID
      userDataWithoutPassword.id = authData.user.id;
      
      // For fake emails, mark as email verified in the database
      if (isFakeEmailAddress) {
        userDataWithoutPassword.email_verified = true;
      }
      
      // Create new user - pass empty string to suppress DatabaseService toast
      return await this.dbService.createItem(TABLES.USERS, userDataWithoutPassword, '');
    } catch (error) {
       // Handle duplicate email constraint violation from database
       if (error.message && (error.message.includes('duplicate key value violates unique constraint') || 
                            error.message.includes('users_pkey') ||
                            error.message.includes('already registered'))) {
         throw new Error(ERROR_MESSAGES.DUPLICATE_EMAIL);
       }
       
       // Handle RLS policy violations
       if (error.message && error.message.includes('row-level security policy')) {
         throw new Error('Unable to create user: Database security policy violation. Please contact support.');
       }
       
       // Re-throw other errors
       throw error;
     }
  }

  async updateUser(userId, updateData) {
    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  async deleteUsers(userIds) {
    await this.dbService.deleteItems(TABLES.USERS, userIds, 'User');
  }

  async filterUsersByRole(users, role) {
    if (role === 'all') {
      return users;
    }
    return users.filter(user => user.role === role);
  }

  async resetUserPassword(user) {
    try {
      // Check if email is a fake temp.local address
      if (isFakeEmail(user.email)) {
        // Skip sending reset email for fake addresses
        console.log('Skipping password reset email for fake address:', user.email);
        return { success: true, method: 'skipped', message: 'Password reset skipped for temp email address' };
      }
      
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

  async getUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .select('full_name, email, phone_number, birthday, post_code, gender, last_location')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to fetch user profile');
    }
  }

  async updateUserProfile(userId, profileData) {
    try {
      console.log('Updating user profile for userId:', userId);
      console.log('Profile data:', profileData);
      
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .update(profileData)
        .eq('id', userId)
        .select();

      console.log('Update response:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error(`No user found with ID: ${userId}`);
      }
      
      console.log('Successfully updated user:', data[0]);
      return data[0];
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error(`Failed to update user profile: ${error.message}`);
    }
  }

  async getUser(userId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error('Failed to fetch user');
    }
  }

  async fetchStaffAndManagers() {
    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .in('role', ['STAFF', 'MANAGER'])
        .order('full_name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching staff and managers:', error);
      throw new Error('Failed to fetch staff and managers');
    }
  }
}

export default UserService;