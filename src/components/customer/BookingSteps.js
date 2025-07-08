import React, { useState, useEffect } from 'react';
import DatabaseService from '../../services/DatabaseService';
import { useLanguage } from '../../contexts/LanguageContext';

const BookingSteps = () => {
  const { t, language } = useLanguage();
  const [steps, setSteps] = useState([
    { id: 1, title: t('customer.bookingStep1Title'), description: t('customer.bookingStep1Desc') },
    { id: 2, title: t('customer.bookingStep2Title'), description: t('customer.bookingStep2Desc') }
  ]);
  const [loading, setLoading] = useState(true);
  const [showSteps, setShowSteps] = useState(true);

  useEffect(() => {
    const loadBookingSteps = async () => {
      try {
        const dbService = DatabaseService.getInstance();
        const currentLanguage = language || 'en';
        
        // Load language-specific booking steps and show/hide setting
        const [stepsData, showStepsData] = await Promise.all([
          dbService.getSettingsByKey('customer_dashboard', `bookingSteps_${currentLanguage}`),
          dbService.getSettingsByKey('customer_dashboard', 'showBookingSteps')
        ]);
        
        // Set show/hide state
        if (showStepsData !== null) {
          setShowSteps(showStepsData === 'true');
        }
        
        // Load steps data
        if (stepsData) {
          try {
            const parsedSteps = JSON.parse(stepsData);
            setSteps(parsedSteps);
          } catch (e) {
            console.warn('Failed to parse booking steps from settings, using defaults');
            // Fallback to translation keys
            setSteps([
              { id: 1, title: t('customer.bookingStep1Title'), description: t('customer.bookingStep1Desc') },
              { id: 2, title: t('customer.bookingStep2Title'), description: t('customer.bookingStep2Desc') }
            ]);
          }
        } else {
          // No data found, use translation fallback
          setSteps([
            { id: 1, title: t('customer.bookingStep1Title'), description: t('customer.bookingStep1Desc') },
            { id: 2, title: t('customer.bookingStep2Title'), description: t('customer.bookingStep2Desc') }
          ]);
        }
      } catch (error) {
        console.error('Error loading booking steps:', error);
        // Fallback to translation keys on error
        setSteps([
          { id: 1, title: t('customer.bookingStep1Title'), description: t('customer.bookingStep1Desc') },
          { id: 2, title: t('customer.bookingStep2Title'), description: t('customer.bookingStep2Desc') }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadBookingSteps();
  }, [language, t]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if showSteps is false
  if (!showSteps) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">{t('customer.howToBook')}</h3>
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                {index + 1}
              </div>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-1">{step.title}</h4>
              <p className="text-gray-600 text-sm">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookingSteps;