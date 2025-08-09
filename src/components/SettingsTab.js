import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ToastMessage from './common/ToastMessage';
import { supabase } from '../supabaseClient';
import DatabaseService from '../services/DatabaseService';
import { USER_ROLES, BOOKING_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES, TABLES, DEFAULT_BOOKING_STEPS } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
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
  const { t, language } = useLanguage();
  
  // DateTime settings
  const [dateTimeSettings, setDateTimeSettings] = useState([
    {
      key: 'timeFormat',
      label: t('settings.timeFormat'),
      value: '24',
      type: 'select',
      options: [
        { value: '24', label: t('settings.timeFormat24') },
        { value: '12', label: t('settings.timeFormat12') }
      ],
      description: t('settings.timeFormatDesc')
    },
    {
      key: 'showWeekday',
      label: t('settings.showWeekday'),
      value: 'true',
      type: 'select',
      options: [
        { value: 'true', label: t('settings.show') },
        { value: 'false', label: t('settings.hide') }
      ],
      description: t('settings.showWeekdayDesc')
    }
  ]);

  // User module default settings
  const [userSettings, setUserSettings] = useState([
    {
      key: 'defaultUserRole',
      label: t('settings.defaultUserRole'),
      value: USER_ROLES.CUSTOMER,
      type: 'select',
      options: [
        { value: USER_ROLES.CUSTOMER, label: t('users.customer') },
        { value: USER_ROLES.STAFF, label: t('users.staff') },
        { value: USER_ROLES.ADMIN, label: t('settings.administrator') }
      ],
      description: t('settings.defaultUserRoleDesc')
    },
    {
      key: 'requiredUserFields',
      label: t('settings.requiredUserFields'),
      value: 'email,full_name,post_code',
      type: 'text',
      description: t('settings.requiredUserFieldsDesc')
    }
  ]);

  // Service module default settings
  const [serviceSettings, setServiceSettings] = useState([
    {
      key: 'defaultServiceDuration',
      label: t('settings.defaultServiceDuration'),
      value: '60',
      type: 'number',
      min: 5,
      max: 480,
      step: 5,
      description: t('settings.defaultServiceDurationDesc')
    },
    {
      key: 'defaultServicePrice',
      label: t('settings.defaultServicePrice'),
      value: '100',
      type: 'number',
      min: 0,
      step: 1,
      description: t('settings.defaultServicePriceDesc')
    }
  ]);

  // Booking module default settings
  const [bookingSettings, setBookingSettings] = useState([
    {
      key: 'defaultBookingStatus',
      label: t('settings.defaultBookingStatus'),
      value: BOOKING_STATUS.PENDING,
      type: 'select',
      options: [
        { value: BOOKING_STATUS.PENDING, label: t('bookings.pending') },
        { value: BOOKING_STATUS.CONFIRMED, label: t('bookings.confirmed') },
        { value: BOOKING_STATUS.COMPLETED, label: t('bookings.completed') },
        { value: BOOKING_STATUS.CANCELLED, label: t('bookings.cancelled') }
      ],
      description: t('settings.defaultBookingStatusDesc')
    },
    {
      key: 'showStaffName',
      label: t('settings.showStaffName'),
      value: 'true',
      type: 'select',
      options: [
        { value: 'true', label: t('settings.show') },
        { value: 'false', label: t('settings.hide') }
      ],
      description: t('settings.showStaffNameDesc')
    },
    {
      key: 'bookingTimeSlotInterval',
      label: t('settings.bookingTimeSlotInterval'),
      value: '30',
      type: 'select',
      options: [
        { value: '5', label: t('settings.minutes5') },
        { value: '15', label: t('settings.minutes15') },
        { value: '30', label: t('settings.minutes30') },
        { value: '60', label: t('settings.hour1') },
        { value: '120', label: t('settings.hours2') }
      ],
      description: t('settings.bookingTimeSlotIntervalDesc')
    },
    {
      key: 'advanceBookingDays',
      label: t('settings.advanceBookingDays'),
      value: '30',
      type: 'number',
      min: 1,
      max: 365,
      description: t('settings.advanceBookingDaysDesc')
    }
  ]);

  // Working Hours settings
  const [workingHoursSettings, setWorkingHoursSettings] = useState([
    {
      key: 'mondayHours',
      label: t('settings.mondayHours'),
      value: '09:00-17:00',
      type: 'text',
      description: t('settings.workingHoursDesc', { day: t('settings.mondayHours') })
    },
    {
      key: 'tuesdayHours',
      label: t('settings.tuesdayHours'),
      value: '09:00-17:00',
      type: 'text',
      description: t('settings.workingHoursDesc', { day: t('settings.tuesdayHours') })
    },
    {
      key: 'wednesdayHours',
      label: t('settings.wednesdayHours'),
      value: '09:00-17:00',
      type: 'text',
      description: t('settings.workingHoursDesc', { day: t('settings.wednesdayHours') })
    },
    {
      key: 'thursdayHours',
      label: t('settings.thursdayHours'),
      value: '09:00-17:00',
      type: 'text',
      description: t('settings.workingHoursDesc', { day: t('settings.thursdayHours') })
    },
    {
      key: 'fridayHours',
      label: t('settings.fridayHours'),
      value: '09:00-17:00',
      type: 'text',
      description: t('settings.workingHoursDesc', { day: t('settings.fridayHours') })
    },
    {
      key: 'saturdayHours',
      label: t('settings.saturdayHours'),
      value: '09:00-17:00',
      type: 'text',
      description: t('settings.workingHoursDesc', { day: t('settings.saturdayHours') })
    },
    {
      key: 'sundayHours',
      label: t('settings.sundayHours'),
      value: 'closed',
      type: 'text',
      description: t('settings.workingHoursDesc', { day: t('settings.sundayHours') })
    }
  ]);

  // System settings
  const [systemSettings, setSystemSettings] = useState([
    {
      key: 'businessName',
      label: t('settings.businessName'),
      value: t('settings.businessNameDefault'),
      type: 'text',
      description: t('settings.businessName')
    },
    {
      key: 'businessHours',
      label: t('settings.businessHours'),
      value: '09:00-18:00',
      type: 'text',
      description: t('settings.businessHoursDesc')
    },
    {
      key: 'businessDays',
      label: t('settings.businessDays'),
      value: '1,2,3,4,5',
      type: 'text',
      description: t('settings.businessDaysDesc')
    },
    {
      key: 'notificationEmail',
      label: t('settings.notificationEmail'),
      value: '',
      type: 'text',
      description: 'Email address for system notifications'
    },
    {
      key: 'locations',
      label: t('settings.locations'),
      value: 'Cherrybrook,Chatswood,Eastgardens',
      type: 'text',
      description: 'Available business locations, separated by commas'
    },
    {
      key: 'enableMobileAuth',
      label: t('settings.enableMobileAuth'),
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
        const data = await dbService.fetchData(TABLES.SETTINGS);
        
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
        toast.error(ERROR_MESSAGES.SETTINGS_LOAD_FAILED);
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
          .from(TABLES.SETTINGS)
          .select('*')
          .eq('category', setting.category)
          .eq('key', setting.key);

        if (data && data.length > 0) {
          // Update existing setting
          await dbService.updateItem(TABLES.SETTINGS, {
            id: data[0].id,
            ...setting
          }, 'Setting');
        } else {
          // Create new setting
          await dbService.createItem(TABLES.SETTINGS, setting, 'Setting');
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
      toast.error(`${ERROR_MESSAGES.SAVE_FAILED}: ${error.message}`);
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
          .from(TABLES.SETTINGS)
          .select('*')
          .eq('category', setting.category)
          .eq('key', setting.key);

        if (data && data.length > 0) {
          // Update existing setting
          await dbService.updateItem(TABLES.SETTINGS, {
            id: data[0].id,
            ...setting
          }, 'Setting');
        } else {
          // Create new setting
          await dbService.createItem(TABLES.SETTINGS, setting, 'Setting');
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
      toast.error(`${ERROR_MESSAGES.SAVE_FAILED}: ${error.message}`);
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
          .from(TABLES.SETTINGS)
          .select('*')
          .eq('category', setting.category)
          .eq('key', setting.key);

        if (data && data.length > 0) {
          // Update existing setting
          await dbService.updateItem(TABLES.SETTINGS, {
            id: data[0].id,
            ...setting
          }, 'Setting');
        } else {
          // Create new setting
          await dbService.createItem(TABLES.SETTINGS, setting, 'Setting');
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
      toast.error(`${ERROR_MESSAGES.SAVE_FAILED}: ${error.message}`);
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
          .from(TABLES.SETTINGS)
          .select('*')
          .eq('category', setting.category)
          .eq('key', setting.key);

        if (data && data.length > 0) {
          // Update existing setting
          await dbService.updateItem(TABLES.SETTINGS, {
            id: data[0].id,
            ...setting
          }, 'Setting');
        } else {
          // Create new setting
          await dbService.createItem(TABLES.SETTINGS, setting, 'Setting');
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
      toast.error(`${ERROR_MESSAGES.SAVE_FAILED}: ${error.message}`);
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
      toast.error(`${ERROR_MESSAGES.SAVE_FAILED}: ${error.message}`);
    }
  };

  // Customer Dashboard settings
  // Customer Dashboard settings
  const [customerDashboardSettings, setCustomerDashboardSettings] = useState([]);
  
  // Initialize default booking steps for both languages
  const initializeDefaultBookingSteps = async () => {
    try {
      const dbService = DatabaseService.getInstance();
      
      // Get default booking steps from constants
      const defaultEnSteps = DEFAULT_BOOKING_STEPS.en;
      const defaultZhSteps = DEFAULT_BOOKING_STEPS.zh;
      
      // Check and create default English steps if not exist
      const existingEnSteps = await dbService.getSettingsByKey('customer_dashboard', 'bookingSteps_en');
      if (existingEnSteps === null) {
        await dbService.createItem(TABLES.SETTINGS, {
          category: 'customer_dashboard',
          key: 'bookingSteps_en',
          value: JSON.stringify(defaultEnSteps)
        }, 'Setting');
      }
      
      // Check and create default Chinese steps if not exist
      const existingZhSteps = await dbService.getSettingsByKey('customer_dashboard', 'bookingSteps_zh');
      if (existingZhSteps === null) {
        await dbService.createItem(TABLES.SETTINGS, {
          category: 'customer_dashboard',
          key: 'bookingSteps_zh',
          value: JSON.stringify(defaultZhSteps)
        }, 'Setting');
      }
    } catch (error) {
      console.error('Error initializing default booking steps:', error);
    }
  };

  // Initialize customer dashboard settings with translations
  useEffect(() => {
    setCustomerDashboardSettings([
       {
         key: 'bookingSteps',
         label: t('settings.bookingSteps'),
         value: JSON.stringify([
           { id: 1, title: t('customer.bookingStep1Title'), description: t('customer.bookingStep1Desc') },
           { id: 2, title: t('customer.bookingStep2Title'), description: t('customer.bookingStep2Desc') }
         ]),
         type: 'booking-steps',
         description: t('settings.bookingStepsDesc')
       },
       {
         key: 'showBookingSteps',
         label: t('settings.showBookingSteps'),
         value: 'true',
         type: 'select',
         options: [
           { value: 'true', label: t('settings.show') },
           { value: 'false', label: t('settings.hide') }
         ],
         description: t('settings.showBookingStepsDesc')
       }
     ]);
     
     // Initialize default booking steps in database
     initializeDefaultBookingSteps();
  }, [t]);

  // Load customer dashboard settings
  useEffect(() => {
    const loadCustomerDashboardSettings = async () => {
      if (customerDashboardSettings.length === 0) return; // Wait for initial settings to be set
      
      try {
        const dbService = DatabaseService.getInstance();
        const [bookingStepsEn, bookingStepsZh, showBookingSteps] = await Promise.all([
          dbService.getSettingsByKey('customer_dashboard', 'bookingSteps_en'),
          dbService.getSettingsByKey('customer_dashboard', 'bookingSteps_zh'),
          dbService.getSettingsByKey('customer_dashboard', 'showBookingSteps')
        ]);

        setCustomerDashboardSettings(prevSettings => {
          return prevSettings.map(setting => {
            if (setting.key === 'bookingSteps') {
              // Load language-specific booking steps
              const currentLanguage = language || 'en';
              const bookingSteps = currentLanguage === 'zh' ? bookingStepsZh : bookingStepsEn;
              
              if (bookingSteps !== null) {
                try {
                  const storedSteps = JSON.parse(bookingSteps);
                  return { ...setting, value: JSON.stringify(storedSteps) };
                } catch (e) {
                  // If parsing fails, use the current translated value
                  return setting;
                }
              }
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
  }, [customerDashboardSettings.length, language]);

  // Save customer dashboard settings
  const saveCustomerDashboardSettings = async (formData) => {
    try {
      const dbService = DatabaseService.getInstance();
      
      // Validate JSON format for bookingSteps
      if (formData.bookingSteps) {
        try {
          JSON.parse(formData.bookingSteps);
        } catch (e) {
          toast.error(ERROR_MESSAGES.INVALID_JSON_FORMAT);
          return;
        }
      }

      // Prepare data to save
      const settingsToSave = [];
      
      Object.keys(formData).forEach(key => {
        if (key === 'bookingSteps') {
          // Save language-specific booking steps
          const currentLanguage = language || 'en';
          const languageKey = currentLanguage === 'zh' ? 'bookingSteps_zh' : 'bookingSteps_en';
          
          settingsToSave.push({
            category: 'customer_dashboard',
            key: languageKey,
            value: formData[key]
          });
        } else {
          settingsToSave.push({
            category: 'customer_dashboard',
            key,
            value: formData[key]
          });
        }
      });

      // Check if settings exist, update if they do, otherwise create
      for (const setting of settingsToSave) {
        const { data } = await supabase
          .from(TABLES.SETTINGS)
          .select('*')
          .eq('category', setting.category)
          .eq('key', setting.key);

        if (data && data.length > 0) {
          // Update existing setting
          await dbService.updateItem(TABLES.SETTINGS, {
            id: data[0].id,
            ...setting
          }, 'Setting');
        } else {
          // Create new setting
          await dbService.createItem(TABLES.SETTINGS, setting, 'Setting');
        }
      }

      // Update local state
      setCustomerDashboardSettings(prevSettings => {
        return prevSettings.map(setting => ({
          ...setting,
          value: formData[setting.key] || setting.value
        }));
      });

      toast.success(SUCCESS_MESSAGES.CUSTOMER_DASHBOARD_SETTINGS_SAVED);
    } catch (error) {
      console.error('Error saving customer dashboard settings:', error);
      toast.error(`${ERROR_MESSAGES.SAVE_FAILED}: ${error.message}`);
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

      toast.success(SUCCESS_MESSAGES.WORKING_HOURS_SETTINGS_SAVED);
    } catch (error) {
      console.error('Error saving working hours settings:', error);
      toast.error(`${ERROR_MESSAGES.SAVE_FAILED}: ${error.message}`);
    }
  };

const [emailTestData, setEmailTestData] = useState({
  bookingId: '',
  oldStatus: 'pending',
  newStatus: 'confirmed',
  emailRecipients: 'both',
  isLoading: false
});

const [availableBookings, setAvailableBookings] = useState([]);

// Test email function (move this inside the component)
const testEmailSend = async () => {
  if (!emailTestData.bookingId) {
    toast.error('Please select a booking ID');
    return;
  }
  
  setEmailTestData(prev => ({ ...prev, isLoading: true }));
  
  try {
    const { data, error } = await supabase.functions.invoke('send-booking-status-email', {
      body: {
        bookingId: emailTestData.bookingId,
        oldStatus: emailTestData.oldStatus,
        newStatus: emailTestData.newStatus,
        emailRecipients: emailTestData.emailRecipients
      }
    });
    
    if (error) {
      // Enhanced error handling with more details
      let errorMessage = 'Unknown error occurred';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      // Check if it's a FunctionsHttpError with additional context
      if (error.context) {
        try {
          const errorContext = typeof error.context === 'string' ? JSON.parse(error.context) : error.context;
          if (errorContext.error) {
            errorMessage = errorContext.error;
          }
        } catch (parseError) {
          console.warn('Could not parse error context:', parseError);
        }
      }
      
      // Provide specific guidance for common issues
      if (errorMessage.includes('RESEND_API_KEY') || errorMessage.includes('email service')) {
        errorMessage = 'Email service not configured. Please set up RESEND_API_KEY in Supabase Edge Function environment variables.';
      } else if (errorMessage.includes('Failed to fetch booking')) {
        errorMessage = 'Could not find the specified booking. Please check if the booking ID exists.';
      } else if (errorMessage.includes('Failed to send email')) {
        errorMessage = 'Email delivery failed. Please check email service configuration and recipient addresses.';
      }
      
      console.error('Detailed error information:', {
        originalError: error,
        message: errorMessage,
        context: error.context,
        stack: error.stack
      });
      
      throw new Error(errorMessage);
    }
    
    toast.success('Test email sent successfully!');
    console.log('Email test result:', data);
  } catch (error) {
    console.error('Error sending test email:', error);
    
    // Enhanced error display
    let displayMessage = error.message || 'Unknown error occurred';
    
    // Add troubleshooting hints
    const troubleshootingHints = [];
    
    if (displayMessage.includes('RESEND_API_KEY') || displayMessage.includes('email service')) {
      troubleshootingHints.push('Configure RESEND_API_KEY in Supabase');
    }
    
    if (displayMessage.includes('booking')) {
      troubleshootingHints.push('Verify booking ID exists');
    }
    
    if (displayMessage.includes('non-2xx status code')) {
      troubleshootingHints.push('Check Edge Function logs in Supabase dashboard');
    }
    
    const fullMessage = troubleshootingHints.length > 0 
      ? `${displayMessage}\n\nTroubleshooting: ${troubleshootingHints.join(', ')}`
      : displayMessage;
    
    toast.error(`Failed to send test email: ${fullMessage}`, {
      autoClose: 8000 // Longer display time for detailed messages
    });
  } finally {
    setEmailTestData(prev => ({ ...prev, isLoading: false }));
  }
};

// Load available bookings for testing (fix the useEffect)
useEffect(() => {
  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          start_time,
          status,
          customer:users!bookings_customer_id_fkey(full_name),
          service:services(name)
        `)
        .order('start_time', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setAvailableBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };
  
  loadBookings();
}, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">{t('settings.title')}</h2>
      <p className="text-gray-600 mb-6">{t('settings.description')}</p>
      
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
           
      {/* Email Test Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Email Test</h3>
        <p className="text-gray-600 mb-4">Test the booking status email notification system</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Booking Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Booking
            </label>
            <select
              value={emailTestData.bookingId}
              onChange={(e) => setEmailTestData(prev => ({ ...prev, bookingId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a booking...</option>
              {availableBookings.map(booking => (
                <option key={booking.id} value={booking.id}>
                  {booking.id.slice(0, 8)}... - {booking.customer?.full_name} - {booking.service?.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Email Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Recipients
            </label>
            <select
              value={emailTestData.emailRecipients}
              onChange={(e) => setEmailTestData(prev => ({ ...prev, emailRecipients: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="both">Both Customer & Provider</option>
              <option value="customer">Customer Only</option>
              <option value="provider">Provider Only</option>
            </select>
          </div>
          
          {/* Old Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Old Status
            </label>
            <select
              value={emailTestData.oldStatus}
              onChange={(e) => setEmailTestData(prev => ({ ...prev, oldStatus: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>
          
          {/* New Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Status
            </label>
            <select
              value={emailTestData.newStatus}
              onChange={(e) => setEmailTestData(prev => ({ ...prev, newStatus: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>
        </div>
        
        <button
          onClick={testEmailSend}
          disabled={emailTestData.isLoading || !emailTestData.bookingId}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
        >
          {emailTestData.isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sending...
            </>
          ) : (
            'Send Test Email'
          )}
        </button>
        
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> This will send emails to the selected recipients (customer and/or provider) associated with the chosen booking.
          </p>
        </div>
      </div>

      
      {/* Toast Notification Container */}
      <ToastMessage />
    </div>
  );
}