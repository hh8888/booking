import React, { useState } from 'react';
import { SettingGroup } from './SettingGroup';
import { useLanguage } from '../../contexts/LanguageContext';
import { triggerBookingAlarm, checkUnconfirmedBookings, debugAlarmSystem, testAudio, enableAudio, isAudioEnabled, resetAlarmState } from '../../utils/bookingAlarmUtils';

const BookingAlarmSettings = ({ settings, onSave }) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleTestAlarm = async () => {
    // Run comprehensive alarm test including debug functionality
    console.log('=== COMPREHENSIVE ALARM TEST ===');
    
    // 1. Test audio functionality first
    console.log('1. Testing audio system...');
    if (!isAudioEnabled()) {
      console.log('Audio not enabled, attempting to enable...');
      await enableAudio();
    }
    await testAudio();
    
    // 2. Create a test booking object and trigger alarm
    console.log('2. Testing new booking alarm...');
    const testBooking = {
      customer_name: 'Test Customer',
      service_name: 'Test Service',
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour later
    };
    
    triggerBookingAlarm(testBooking);
    
    // 3. Check for unconfirmed bookings
    console.log('3. Checking unconfirmed bookings...');
    await checkUnconfirmedBookings();
    
    console.log('=== ALARM TEST COMPLETE ===');
  };

  const handleTestUnconfirmedBookings = async () => {
    console.log('=== TESTING UNCONFIRMED BOOKINGS CHECK ===');
    console.log('Button clicked - starting unconfirmed bookings test...');
    
    try {
      // Reset alarm state to ensure clean test environment
      resetAlarmState();
      
      // Wait a moment for state to clear
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Force a fresh check by calling the function
      await checkUnconfirmedBookings();
      console.log('✅ Unconfirmed bookings check completed successfully');
      
      // Additional logging to help debug
      console.log('If no unconfirmed bookings were found, this is normal behavior.');
      console.log('To test with actual data, create some pending bookings in the system.');
      
    } catch (error) {
      console.error('❌ Error during unconfirmed bookings check:', error);
      console.error('Stack trace:', error.stack);
    }
    
    console.log('=== UNCONFIRMED BOOKINGS TEST COMPLETE ===');
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <div 
        className="flex justify-between items-center mb-4 cursor-pointer" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <svg
            className={`w-5 h-5 mr-2 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-800">{t('settings.bookingAlarmSettingsTitle')}</h3>
        </div>
      </div>
      
      {isExpanded && (
        <>
          {/* Settings Form */}
          <form className="space-y-4 mb-6">
            {settings.map((setting) => (
              <div key={setting.key} className="grid grid-cols-3 gap-4 items-center">
                <label className="text-sm font-medium text-gray-700 col-span-1">
                  {setting.label}
                  {setting.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <div className="col-span-2">
                  {setting.type === 'select' ? (
                    <select
                      name={setting.key}
                      value={setting.value || ''}
                      onChange={(e) => onSave({ [setting.key]: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {setting.options && setting.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : setting.type === 'number' ? (
                    <input
                      type="number"
                      name={setting.key}
                      value={setting.value || ''}
                      onChange={(e) => onSave({ [setting.key]: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      min={setting.min}
                      max={setting.max}
                      step={setting.step}
                    />
                  ) : (
                    <input
                      type="text"
                      name={setting.key}
                      value={setting.value || ''}
                      onChange={(e) => onSave({ [setting.key]: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                  {setting.description && (
                    <p className="mt-1 text-xs text-gray-500">{setting.description}</p>
                  )}
                </div>
              </div>
            ))}
          </form>
          
          {/* Test Functionality */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-800 mb-3">Test Alarm System</h4>
            <p className="text-gray-600 mb-4">Test your alarm settings including audio, visual notifications, and unconfirmed booking checks.</p>
            
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleTestAlarm}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Test New Booking Alarm
              </button>
              <button
                onClick={handleTestUnconfirmedBookings}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
              >
                Test Unconfirmed Bookings Check
              </button>
            </div>
            
            <p className="text-sm text-gray-500 mt-3">
              Check the browser console for detailed test results and debugging information.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default BookingAlarmSettings;