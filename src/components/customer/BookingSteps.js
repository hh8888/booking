import React, { useState, useEffect } from 'react';
import DatabaseService from '../../services/DatabaseService';

const BookingSteps = () => {
  const [steps, setSteps] = useState([
    { id: 1, title: 'Customer makes booking online', description: 'Browse services and select your preferred time slot' },
    { id: 2, title: 'Staff will call customer to confirm details of booking', description: 'Our team will contact you to verify appointment details' }
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBookingSteps = async () => {
      try {
        const dbService = DatabaseService.getInstance();
        const stepsData = await dbService.getSettingsByKey('customer_dashboard', 'bookingSteps');
        
        if (stepsData) {
          try {
            const parsedSteps = JSON.parse(stepsData);
            setSteps(parsedSteps);
          } catch (e) {
            console.warn('Failed to parse booking steps from settings, using defaults');
          }
        }
      } catch (error) {
        console.error('Error loading booking steps:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBookingSteps();
  }, []);

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

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">How to Book</h3>
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