import { useState, useEffect, useCallback } from 'react';
import DatabaseService from '../services/DatabaseService';

const initialState = {
  settings: {},
  loading: true,
  error: null,
};

export const useSystemSettings = () => {
  const [state, setState] = useState(initialState);

  const fetchSettings = useCallback(async () => {
    console.log('useSystemSettings: Fetching system settings...');
    setState((prevState) => ({ ...prevState, loading: true, error: null }));
    try {
      const dbService = DatabaseService.getInstance();
      const systemSettings = await dbService.getSettings('system');
      console.log('useSystemSettings: System settings fetched:', systemSettings);
      setState((prevState) => ({ 
        ...prevState, 
        settings: systemSettings, 
        loading: false 
      }));
    } catch (err) {
      console.error('Error fetching system settings:', err);
      setState((prevState) => ({ ...prevState, loading: false, error: err.message }));
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { ...state, refetch: fetchSettings };
};