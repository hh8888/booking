import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import DatabaseService from '../services/DatabaseService';
import ErrorHandlingService from '../services/ErrorHandlingService';

export function useBusinessInfo() {
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBusinessName = async () => {
      try {
        const dbService = DatabaseService.getInstance();
        const name = await dbService.getSettingsByKey('system', 'businessName');
        
        if (name) {
          setBusinessName(name);
        }
      } catch (error) {
        console.error('Error fetching business name:', error);
        const errorHandler = ErrorHandlingService.getInstance();
        errorHandler.handleDatabaseError(error, 'fetching', 'business name');
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessName();
  }, []);

  return {
    businessName,
    loading,
    error
  };
}