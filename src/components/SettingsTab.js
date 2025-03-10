import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { supabase } from '../supabaseClient';
import DatabaseService from '../services/DatabaseService';

// Setting Group Component - Used to display a group of related settings
const SettingGroup = ({ title, settings, onSave }) => {
  const [formData, setFormData] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  // Initialize form data
  useEffect(() => {
    const initialData = {};
    settings.forEach(setting => {
      initialData[setting.key] = setting.value;
    });
    setFormData(initialData);
  }, [settings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setIsEditing(false);
    toast.success(`${title} settings saved`);
  };

  const renderSettingField = (setting) => {
    switch (setting.type) {
      case 'select':
        return (
          <select
            name={setting.key}
            value={formData[setting.key] || ''}
            onChange={handleChange}
            disabled={!isEditing}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {setting.options && setting.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'number':
        return (
          <input
            type="number"
            name={setting.key}
            value={formData[setting.key] || ''}
            onChange={handleChange}
            disabled={!isEditing}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            min={setting.min}
            max={setting.max}
            step={setting.step}
          />
        );
      case 'textarea':
        return (
          <textarea
            name={setting.key}
            value={formData[setting.key] || ''}
            onChange={handleChange}
            disabled={!isEditing}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
        );
      default: // 默认为文本输入框
        return (
          <input
            type="text"
            name={setting.key}
            value={formData[setting.key] || ''}
            onChange={handleChange}
            disabled={!isEditing}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        );
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 text-sm"
          >
            Edit
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={() => setIsEditing(false)}
              className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 text-sm"
            >
              Save
            </button>
          </div>
        )}
      </div>

      <form className="space-y-4">
        {settings.map((setting) => (
          <div key={setting.key} className="grid grid-cols-3 gap-4 items-center">
            <label className="text-sm font-medium text-gray-700 col-span-1">
              {setting.label}
              {setting.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="col-span-2">
              {renderSettingField(setting)}
              {setting.description && (
                <p className="mt-1 text-xs text-gray-500">{setting.description}</p>
              )}
            </div>
          </div>
        ))}
      </form>
    </div>
  );
};

export default function SettingsTab() {
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
      key: 'bookingTimeSlotInterval',
      label: 'Booking Time Slot Interval (minutes)',
      value: '30',
      type: 'select',
      options: [
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
    }
  ]);

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
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

          // Process system settings
          const systemSettingsData = data.filter(item => item.category === 'system');
          if (systemSettingsData.length > 0) {
            setSystemSettings(prevSettings => {
              return prevSettings.map(setting => {
                const foundSetting = systemSettingsData.find(item => item.key === setting.key);
                return foundSetting ? { ...setting, value: foundSetting.value } : setting;
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
      const settingsToSave = Object.keys(formData).map(key => ({
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

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">System Settings</h2>
      <p className="text-gray-600 mb-6">Here you can manage the system default settings and configuration options.</p>
      
      {/* User Settings Group */}
      <SettingGroup 
        title="User Settings" 
        settings={userSettings} 
        onSave={saveUserSettings} 
      />
      
      {/* Service Settings Group */}
      <SettingGroup 
        title="Service Settings" 
        settings={serviceSettings} 
        onSave={saveServiceSettings} 
      />
      
      {/* Booking Settings Group */}
      <SettingGroup 
        title="Booking Settings" 
        settings={bookingSettings} 
        onSave={saveBookingSettings} 
      />
      
      {/* System Settings Group */}
      <SettingGroup 
        title="System Settings" 
        settings={systemSettings} 
        onSave={saveSystemSettings} 
      />
      
      {/* Toast通知容器 */}
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}