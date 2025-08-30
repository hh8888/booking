import React, { createContext, useContext, useState, useEffect } from 'react';
import DatabaseService from '../services/DatabaseService';
import { TABLES } from '../constants/tableConstants';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    bookingEditTimeLimit: 24, // Default 24 hours
    // Add other settings as needed
  });
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const databaseService = DatabaseService.getInstance();
      
      // Load booking settings
      const bookingSettings = await databaseService.getSettingsByKey('booking');
      
      setSettings(prevSettings => ({
        ...prevSettings,
        bookingEditTimeLimit: bookingSettings?.bookingEditTimeLimit || 24,
        // Add other settings as they're loaded
      }));
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshSettings = () => {
    loadSettings();
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const value = {
    settings,
    loading,
    refreshSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};