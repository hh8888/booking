import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ToastMessage from './common/ToastMessage';
import { supabase } from '../supabaseClient';
import DatabaseService from '../services/DatabaseService';
import {
  DateTimeSettings,
  UserSettings,
  ServiceSettings,
  BookingSettings,
  SystemSettings,
  CustomerDashboardSettings,
  WorkingHoursSettings
} from './settings';

export default function SettingsTab() {
  // DateTime settings
  const [dateTimeSettings, setDateTimeSettings] = useState([
    {
      key: 'timeFormat',
      label: 'Time Format',
      value: '24',
      type: 'select',
      options: [
        { value: '24', label: '24-hour format' },
        { value: '12', label: '12-hour format' }
      ],
      description: 'Choose time display format'
    },
    {
      key: 'showWeekday',
      label: 'Show Weekday',
      value: 'true',
      type: 'select',
      options: [
        { value: 'true', label: 'Show' },
        { value: 'false', label: 'Hide' }
      ],
      description: 'Display weekday information next to the date'
    }
  ]);

  // User module default settings
  const [userSettings, setUserSettings] = useState([
    {
      key: 'defaultUserRole',
      label: 'Default User Role',
      value: 'customer',
      type: 'select',
      options: [
        { value: 'customer', label: 'Customer' },
        { value: 'staff', label: 'Staff' },
        { value: 'admin', label: 'Administrator' }
      ],
      description: 'Default role for newly registered users'
    },
    {
      key: 'requiredUserFields',
      label: 'Required User Fields',
      value: 'email,full_name,post_code',
      type: 'text',
      description: 'Required fields when creating users, separated by commas'
    }
  ]);

  // Service module default settings
  const [serviceSettings, setServiceSettings] = useState([
    {
      key: 'defaultServiceDuration',
      label: 'Default Service Duration (minutes)',
      value: '60',
      type: 'number',
      min: 5,
      max: 480,
      step: 5,
      description: 'Default duration when creating a new service'
    },
    {
      key: 'defaultServicePrice',
      label: 'Default Service Price',
      value: '100',
      type: 'number',
      min: 0,
      step: 1,
      description: 'Default price when creating a new service'
    }
  ]);

  // Booking module default settings
  const [bookingSettings, setBookingSettings] = useState([
    {
      key: 'defaultBookingStatus',
      label: 'Default Booking Status',
      value: 'pending',
      type: 'select',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' }
      ],
      description: 'Default status when creating a new booking'
    },
    {
      key: 'showStaffName',
      label: 'Show Staff Name in Calendar',
      value: 'true',
      type: 'select',
      options: [
        { value: 'true', label: 'Show' },
        { value: 'false', label: 'Hide' }
      ],
      description: 'Display staff name in calendar events'
    },
    {
      key: 'bookingTimeSlotInterval',
      label: 'Booking Time Slot Interval (minutes)',
      value: '30',
      type: 'select',
      options: [
        { value: '5', label: '5 minutes' },
        { value: '15', label: '15 minutes' },
        { value: '30', label: '30 minutes' },
        { value: '60', label: '1 hour' },
        { value: '120', label: '2 hours' }
      ],
      description: 'Minimum interval for booking time selection'
    },
    {
      key: 'advanceBookingDays',
      label: 'Advance Booking Days',
      value: '30',
      type: 'number',
      min: 1,
      max: 365,
      description: 'Maximum number of days allowed for advance booking'
    }
  ]);

  // Working Hours settings
  const [workingHoursSettings, setWorkingHoursSettings] = useState([
    {
      key: 'mondayHours',
      label: 'Monday Hours',
      value: '09:00-17:00',
      type: 'text',
      description: 'Working hours for Monday (format: HH:MM-HH:MM, or "closed" for closed days)'
    },
    {
      key: 'tuesdayHours',
      label: 'Tuesday Hours',
      value: '09:00-17:00',
      type: 'text',
      description: 'Working hours for Tuesday (format: HH:MM-HH:MM, or "closed" for closed days)'
    },
    {
      key: 'wednesdayHours',
      label: 'Wednesday Hours',
      value: '09:00-17:00',
      type: 'text',
      description: 'Working hours for Wednesday (format: HH:MM-HH:MM, or "closed" for closed days)'
    },
    {
      key: 'thursdayHours',
      label: 'Thursday Hours',
      value: '09:00-17:00',
      type: 'text',
      description: 'Working hours for Thursday (format: HH:MM-HH:MM, or "closed" for closed days)'
    },
    {
      key: 'fridayHours',
      label: 'Friday Hours',
      value: '09:00-17:00',
      type: 'text',
      description: 'Working hours for Friday (format: HH:MM-HH:MM, or "closed" for closed days)'
    },
    {
      key: 'saturdayHours',
      label: 'Saturday Hours',
      value: '09:00-17:00',
      type: 'text',
      description: 'Working hours for Saturday (format: HH:MM-HH:MM, or "closed" for closed days)'
    },
    {
      key: 'sundayHours',
      label: 'Sunday Hours',
      value: 'closed',
      type: 'text',
      description: 'Working hours for Sunday (format: HH:MM-HH:MM, or "closed" for closed days)'
    }
  ]);

  // System settings
  const [systemSettings, setSystemSettings] = useState([
    {
      key: 'businessName',
      label: 'Business Name',
      value: 'Booking Management System',
      type: 'text',
      description: 'Business name displayed throughout the system'
    },
    {
      key: 'businessHours',
      label: 'Business Hours',
      value: '09:00-18:00',
      type: 'text',
      description: 'Business operating hours, format: HH:MM-HH:MM'
    },
    {
      key: 'businessDays',
      label: 'Business Days',
      value: '1,2,3,4,5',
      type: 'text',
      description: 'Business operating days, 1-7 represents Monday to Sunday, separated by commas'
    },
    {
      key: 'notificationEmail',
      label: 'Notification Email',
      value: '',
      type: 'text',
      description: 'Email address for system notifications'
    },
    {
      key: 'locations',
      label: 'Business Locations',
      value: 'Cherrybrook,Chatswood,Eastgardens',
      type: 'text',
      description: 'Available business locations, separated by commas'
    },
    {
      key: 'enableMobileAuth',
      label: 'Enable Mobile Sign-in/Sign-up',
      value: 'false', // Default to off
      type: 'select',
      options: [
        { value: 'true', label: 'Enable' },
        { value: 'false', label: 'Disable' }
      ],
      description: 'Allow users to sign in or sign up using their mobile number and OTP. (Currently read-only)',
      readOnly: true // Mark as read-only for now
    }
  ]);

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      // Load datetime settings
      const dbService = DatabaseService.getInstance();
      const [timeFormat, showWeekday] = await Promise.all([
        dbService.getSettingsByKey('datetime', 'timeFormat'),
        dbService.getSettingsByKey('datetime', 'showWeekday')
      ]);

      setDateTimeSettings(prevSettings => {
        return prevSettings.map(setting => {
          if (setting.key === 'timeFormat' && timeFormat) {
            return { ...setting, value: timeFormat };
          }
          if (setting.key === 'showWeekday' && showWeekday !== null) {
            return { ...setting, value: showWeekday };
          }
          return setting;
        });
      });
      try {
        const dbService = DatabaseService.getInstance();
        const data = await dbService.fetchData('settings');
        
        if (data && data.length > 0) {
          // Process user settings
          const userSettingsData = data.filter(item => item.category === 'user');
          if (userSettingsData.length > 0) {
            setUserSettings(prevSettings => {
              return prevSettings.map(setting => {
                const foundSetting = userSettingsData.find(item => item.key === setting.key);
                return foundSetting ? { ...setting, value: foundSetting.value } : setting;
              });
            });
          }

          // Process service settings
          const serviceSettingsData = data.filter(item => item.category === 'service');
          if (serviceSettingsData.length > 0) {
            setServiceSettings(prevSettings => {
              return prevSettings.map(setting => {
                const foundSetting = serviceSettingsData.find(item => item.key === setting.key);
                return foundSetting ? { ...setting, value: foundSetting.value } : setting;
              });
            });
          }

          // Process booking settings
          const bookingSettingsData = data.filter(item => item.category === 'booking');
          if (bookingSettingsData.length > 0) {
            setBookingSettings(prevSettings => {
              return prevSettings.map(setting => {
                const foundSetting = bookingSettingsData.find(item => item.key === setting.key);
                return foundSetting ? { ...setting, value: foundSetting.value } : setting;
              });
            });
          }

          // Process working hours settings
          const workingHoursData = data.filter(item => item.category === 'working_hours');
          if (workingHoursData.length > 0) {
            setWorkingHoursSettings(prevSettings => {
              return prevSettings.map(setting => {
                const foundSetting = workingHoursData.find(item => item.key === setting.key);
                return foundSetting ? { ...setting, value: foundSetting.value } : setting;
              });
            });
          }

          // Process system settings
          const systemSettingsData = data.filter(item => item.category === 'system');
          if (systemSettingsData.length > 0) {
            setSystemSettings(prevSettings => {
              return prevSettings.map(setting => {
                const foundSetting = systemSettingsData.find(item => item.key === setting.key);
                if (foundSetting) {
                  // Ensure boolean values for enableMobileAuth are strings for select consistency
                  if (setting.key === 'enableMobileAuth' && typeof foundSetting.value === 'boolean') {
                    return { ...setting, value: String(foundSetting.value) };
                  }
                  return { ...setting, value: foundSetting.value };
                }
                return setting;
              });
            });
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load settings');
      }
    };

    loadSettings();
  }, []);

  // Save user settings
  const saveUserSettings = async (formData) => {
    try {
      const dbService = DatabaseService.getInstance();
      
      // Prepare data to save
      const settingsToSave = Object.keys(formData).map(key => ({
        category: 'user',
        key,
        value: formData[key]
      }));

      // Check if settings exist, update if they do, otherwise create
      for (const setting of settingsToSave) {
        const { data } = await supabase
          .from('settings')
          .select('*')
          .eq('category', setting.category)
          .eq('key', setting.key);

        if (data && data.length > 0) {
          // Update existing setting
          await dbService.updateItem('settings', {
            id: data[0].id,
            ...setting
          }, 'Setting');
        } else {
          // Create new setting
          await dbService.createItem('settings', setting, 'Setting');
        }
      }

      // Update local state
      setUserSettings(prevSettings => {
        return prevSettings.map(setting => ({
          ...setting,
          value: formData[setting.key] || setting.value
        }));
      });
    } catch (error) {
      console.error('Error saving user settings:', error);
      toast.error(`Save failed: ${error.message}`);
    }
  };

  // Save service settings
  const saveServiceSettings = async (formData) => {
    try {
      const dbService = DatabaseService.getInstance();
      
      // Prepare data to save
      const settingsToSave = Object.keys(formData).map(key => ({
        category: 'service',
        key,
        value: formData[key]
      }));

      // Check if settings exist, update if they do, otherwise create
      for (const setting of settingsToSave) {
        const { data } = await supabase
          .from('settings')
          .select('*')
          .eq('category', setting.category)
          .eq('key', setting.key);

        if (data && data.length > 0) {
          // Update existing setting
          await dbService.updateItem('settings', {
            id: data[0].id,
            ...setting
          }, 'Setting');
        } else {
          // Create new setting
          await dbService.createItem('settings', setting, 'Setting');
        }
      }

      // Update local state
      setServiceSettings(prevSettings => {
        return prevSettings.map(setting => ({
          ...setting,
          value: formData[setting.key] || setting.value
        }));
      });
    } catch (error) {
      console.error('Error saving service settings:', error);
      toast.error(`Save failed: ${error.message}`);
    }
  };

  // Save booking settings
  const saveBookingSettings = async (formData) => {
    try {
      const dbService = DatabaseService.getInstance();
      
      // Prepare data to save
      const settingsToSave = Object.keys(formData).map(key => ({
        category: 'booking',
        key,
        value: formData[key]
      }));

      // Check if settings exist, update if they do, otherwise create
      for (const setting of settingsToSave) {
        const { data } = await supabase
          .from('settings')
          .select('*')
          .eq('category', setting.category)
          .eq('key', setting.key);

        if (data && data.length > 0) {
          // Update existing setting
          await dbService.updateItem('settings', {
            id: data[0].id,
            ...setting
          }, 'Setting');
        } else {
          // Create new setting
          await dbService.createItem('settings', setting, 'Setting');
        }
      }

      // Update local state
      setBookingSettings(prevSettings => {
        return prevSettings.map(setting => ({
          ...setting,
          value: formData[setting.key] || setting.value
        }));
      });
    } catch (error) {
      console.error('Error saving booking settings:', error);
      toast.error(`Save failed: ${error.message}`);
    }
  };

  // Save system settings
  const saveSystemSettings = async (formData) => {
    try {
      const dbService = DatabaseService.getInstance();
      
      // Prepare data to save
      const settingsToSave = Object.keys(formData)
        .filter(key => key !== 'enableMobileAuth') // Exclude read-only setting from saving
        .map(key => ({
        category: 'system',
        key,
        value: formData[key]
      }));

      // Check if settings exist, update if they do, otherwise create
      for (const setting of settingsToSave) {
        const { data } = await supabase
          .from('settings')
          .select('*')
          .eq('category', setting.category)
          .eq('key', setting.key);

        if (data && data.length > 0) {
          // Update existing setting
          await dbService.updateItem('settings', {
            id: data[0].id,
            ...setting
          }, 'Setting');
        } else {
          // Create new setting
          await dbService.createItem('settings', setting, 'Setting');
        }
      }

      // Update local state
      setSystemSettings(prevSettings => {
        return prevSettings.map(setting => ({
          ...setting,
          value: formData[setting.key] || setting.value
        }));
      });
    } catch (error) {
      console.error('Error saving system settings:', error);
      toast.error(`Save failed: ${error.message}`);
    }
  };

  // Save datetime settings
  const saveDateTimeSettings = async (formData) => {
    try {
      const dbService = DatabaseService.getInstance();
      await Promise.all([
        dbService.updateSettings('datetime', 'timeFormat', formData.timeFormat),
        dbService.updateSettings('datetime', 'showWeekday', formData.showWeekday)
      ]);
    } catch (error) {
      console.error('Error saving datetime settings:', error);
      toast.error(`Save failed: ${error.message}`);
    }
  };

  // Customer Dashboard settings
  // Replace the customerDashboardSettings state (around line 465)
const [customerDashboardSettings, setCustomerDashboardSettings] = useState([
  {
    key: 'bookingSteps',
    label: 'Booking Steps',
    value: JSON.stringify([
      { id: 1, title: 'Customer makes booking online', description: 'Browse services and select your preferred time slot' },
      { id: 2, title: 'Staff will call customer to confirm details of booking', description: 'Our team will contact you to verify appointment details' }
    ]),
    type: 'booking-steps', // Changed from 'textarea' to custom type
    description: 'Booking steps displayed on customer dashboard'
  },
    {
      key: 'showBookingSteps',
      label: 'Show Booking Steps',
      value: 'true',
      type: 'select',
      options: [
        { value: 'true', label: 'Show' },
        { value: 'false', label: 'Hide' }
      ],
      description: 'Display booking steps section on customer dashboard'
    }
  ]);

  // Load customer dashboard settings
  useEffect(() => {
    const loadCustomerDashboardSettings = async () => {
      try {
        const dbService = DatabaseService.getInstance();
        const [bookingSteps, showBookingSteps] = await Promise.all([
          dbService.getSettingsByKey('customer_dashboard', 'bookingSteps'),
          dbService.getSettingsByKey('customer_dashboard', 'showBookingSteps')
        ]);

        setCustomerDashboardSettings(prevSettings => {
          return prevSettings.map(setting => {
            if (setting.key === 'bookingSteps' && bookingSteps !== null) {
              return { ...setting, value: bookingSteps };
            }
            if (setting.key === 'showBookingSteps' && showBookingSteps !== null) {
              return { ...setting, value: showBookingSteps };
            }
            return setting;
          });
        });
      } catch (error) {
        console.error('Error loading customer dashboard settings:', error);
      }
    };

    loadCustomerDashboardSettings();
  }, []);

  // Save customer dashboard settings
  const saveCustomerDashboardSettings = async (formData) => {
    try {
      const dbService = DatabaseService.getInstance();
      
      // Validate JSON format for bookingSteps
      if (formData.bookingSteps) {
        try {
          JSON.parse(formData.bookingSteps);
        } catch (e) {
          toast.error('Invalid JSON format for booking steps');
          return;
        }
      }

      // Prepare data to save
      const settingsToSave = Object.keys(formData).map(key => ({
        category: 'customer_dashboard',
        key,
        value: formData[key]
      }));

      // Check if settings exist, update if they do, otherwise create
      for (const setting of settingsToSave) {
        const { data } = await supabase
          .from('settings')
          .select('*')
          .eq('category', setting.category)
          .eq('key', setting.key);

        if (data && data.length > 0) {
          // Update existing setting
          await dbService.updateItem('settings', {
            id: data[0].id,
            ...setting
          }, 'Setting');
        } else {
          // Create new setting
          await dbService.createItem('settings', setting, 'Setting');
        }
      }

      // Update local state
      setCustomerDashboardSettings(prevSettings => {
        return prevSettings.map(setting => ({
          ...setting,
          value: formData[setting.key] || setting.value
        }));
      });

      toast.success('Customer dashboard settings saved successfully');
    } catch (error) {
      console.error('Error saving customer dashboard settings:', error);
      toast.error(`Save failed: ${error.message}`);
    }
  };

  // Save working hours settings
  const saveWorkingHoursSettings = async (formData) => {
    try {
      const dbService = DatabaseService.getInstance();
      
      // Validate time format
      const timePattern = /^(\d{2}:\d{2}-\d{2}:\d{2}|closed)$/;
      for (const [key, value] of Object.entries(formData)) {
        if (!timePattern.test(value)) {
          toast.error(`Invalid format for ${key}. Use HH:MM-HH:MM or "closed"`);
          return;
        }
      }
      
      // Prepare data to save
      const settingsToSave = Object.keys(formData).map(key => ({
        category: 'working_hours',
        key,
        value: formData[key]
      }));

      // Check if settings exist, update if they do, otherwise create
      for (const setting of settingsToSave) {
        const { data } = await supabase
          .from('settings')
          .select('*')
          .eq('category', setting.category)
          .eq('key', setting.key);

        if (data && data.length > 0) {
          // Update existing setting
          await dbService.updateItem('settings', {
            id: data[0].id,
            ...setting
          }, 'Setting');
        } else {
          // Create new setting
          await dbService.createItem('settings', setting, 'Setting');
        }
      }

      // Update local state
      setWorkingHoursSettings(prevSettings => {
        return prevSettings.map(setting => ({
          ...setting,
          value: formData[setting.key] || setting.value
        }));
      });

      toast.success('Working hours settings saved successfully');
    } catch (error) {
      console.error('Error saving working hours settings:', error);
      toast.error(`Save failed: ${error.message}`);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">System Settings</h2>
      <p className="text-gray-600 mb-6">Here you can manage the system default settings and configuration options.</p>
      
      {/* DateTime Settings Group */}
      <DateTimeSettings 
        settings={dateTimeSettings} 
        onSave={saveDateTimeSettings} 
      />
      
      {/* Working Hours Settings Group */}
      <WorkingHoursSettings 
        settings={workingHoursSettings} 
        onSave={saveWorkingHoursSettings} 
      />
      
      {/* User Settings Group */}
      <UserSettings 
        settings={userSettings} 
        onSave={saveUserSettings} 
      />
      
      {/* Service Settings Group */}
      <ServiceSettings 
        settings={serviceSettings} 
        onSave={saveServiceSettings} 
      />
      
      {/* Booking Settings Group */}
      <BookingSettings 
        settings={bookingSettings} 
        onSave={saveBookingSettings} 
      />
      
      {/* Customer Dashboard Settings Group */}
      <CustomerDashboardSettings 
        settings={customerDashboardSettings} 
        onSave={saveCustomerDashboardSettings} 
      />
      
      {/* System Settings Group */}
      <SystemSettings 
        settings={systemSettings} 
        onSave={saveSystemSettings} 
      />
      
      {/* Toast Notification Container */}
      <ToastMessage />
    </div>
  );
}