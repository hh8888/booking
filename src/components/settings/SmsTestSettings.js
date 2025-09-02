import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';
import { TABLES } from '../../constants';

export default function SmsTestSettings() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [availableBookings, setAvailableBookings] = useState([]);
  const [smsTestData, setSmsTestData] = useState({
    bookingId: '',
    smsRecipients: 'both',
    testType: 'reminder', // reminder, confirmation, cancellation
    customPhoneNumbers: '',
    isLoading: false
  });
  const [bookingPhoneNumbers, setBookingPhoneNumbers] = useState({
    customer: '',
    provider: '',
    display: ''
  });

  // Load available bookings when component mounts
  useEffect(() => {
    const loadBookings = async () => {
      try {
        const { data, error } = await supabase
          .from(TABLES.BOOKINGS)
          .select(`
            id,
            customer:customer_id(full_name, phone_number),
            service:service_id(name),
            provider:provider_id(full_name, phone_number)
          `)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (error) throw error;
        setAvailableBookings(data || []);
      } catch (error) {
        console.error('Error loading bookings:', error);
      }
    };
    
    if (isExpanded) {
      loadBookings();
    }
  }, [isExpanded]);

  // Update phone numbers when booking selection changes
  useEffect(() => {
    if (smsTestData.bookingId) {
      const selectedBooking = availableBookings.find(b => b.id === smsTestData.bookingId);
      if (selectedBooking) {
        const customerPhone = selectedBooking.customer?.phone || '';
        const providerPhone = selectedBooking.provider?.phone || '';
        
        let displayPhones = '';
        if (smsTestData.smsRecipients === 'both') {
          displayPhones = [customerPhone, providerPhone].filter(phone => phone).join(', ');
        } else if (smsTestData.smsRecipients === 'customer') {
          displayPhones = customerPhone;
        } else if (smsTestData.smsRecipients === 'provider') {
          displayPhones = providerPhone;
        }
        
        setBookingPhoneNumbers({
          customer: customerPhone,
          provider: providerPhone,
          display: displayPhones
        });
        
        // Update custom phone numbers field with the booking phones
        setSmsTestData(prev => ({
          ...prev,
          customPhoneNumbers: displayPhones
        }));
      }
    } else {
      setBookingPhoneNumbers({ customer: '', provider: '', display: '' });
      setSmsTestData(prev => ({ ...prev, customPhoneNumbers: '' }));
    }
  }, [smsTestData.bookingId, smsTestData.smsRecipients, availableBookings]);

  const testSmsSend = async () => {
    if (!smsTestData.bookingId) {
      toast.error('Please select a booking first');
      return;
    }

    if (!smsTestData.customPhoneNumbers.trim()) {
      toast.error('Please provide phone numbers');
      return;
    }

    setSmsTestData(prev => ({ ...prev, isLoading: true }));

    try {
      const selectedBooking = availableBookings.find(b => b.id === smsTestData.bookingId);
      
      const { data, error } = await supabase.functions.invoke('send-test-sms', {
        body: {
          bookingId: smsTestData.bookingId,
          phoneNumbers: smsTestData.customPhoneNumbers,
          testType: smsTestData.testType,
          bookingData: selectedBooking
        }
      });

      if (error) throw error;

      toast.success(`Test SMS sent successfully to: ${smsTestData.customPhoneNumbers}`);
    } catch (error) {
      console.error('Error sending test SMS:', error);
      toast.error(`Failed to send test SMS: ${error.message}`);
    } finally {
      setSmsTestData(prev => ({ ...prev, isLoading: false }));
    }
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
          <h3 className="text-lg font-semibold text-gray-800">SMS Test</h3>
        </div>
      </div>
      
      {isExpanded && (
        <div>
          <p className="text-gray-600 mb-4">Test the booking SMS notification system using Twilio service</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Booking Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Booking
              </label>
              <select
                value={smsTestData.bookingId}
                onChange={(e) => setSmsTestData(prev => ({ ...prev, bookingId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a booking...</option>
                {availableBookings.map(booking => (
                  <option key={booking.id} value={booking.id}>
                    {booking.customer?.full_name} - {booking.service?.name} (ID: {booking.id})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Test Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMS Type
              </label>
              <select
                value={smsTestData.testType}
                onChange={(e) => setSmsTestData(prev => ({ ...prev, testType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="reminder">Appointment Reminder</option>
                <option value="confirmation">Booking Confirmation</option>
                <option value="cancellation">Booking Cancellation</option>
              </select>
            </div>
            
            {/* SMS Recipients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMS Recipients
              </label>
              <select
                value={smsTestData.smsRecipients}
                onChange={(e) => setSmsTestData(prev => ({ ...prev, smsRecipients: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="both">Both Customer & Provider</option>
                <option value="customer">Customer Only</option>
                <option value="provider">Provider Only</option>
              </select>
            </div>
            
            {/* Phone Numbers Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Numbers
                <span className="text-xs text-gray-500 ml-1">(from booking, editable for override)</span>
              </label>
              <input
                type="text"
                value={smsTestData.customPhoneNumbers}
                onChange={(e) => setSmsTestData(prev => ({ ...prev, customPhoneNumbers: e.target.value }))}
                placeholder="Enter phone numbers separated by commas (e.g., +61412345678, +61487654321)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {bookingPhoneNumbers.display && (
                <p className="text-xs text-gray-500 mt-1">
                  From booking: {bookingPhoneNumbers.customer && `Customer: ${bookingPhoneNumbers.customer}`}
                  {bookingPhoneNumbers.customer && bookingPhoneNumbers.provider && ', '}
                  {bookingPhoneNumbers.provider && `Provider: ${bookingPhoneNumbers.provider}`}
                </p>
              )}
            </div>
          </div>
          
          <button
            onClick={testSmsSend}
            disabled={smsTestData.isLoading || !smsTestData.bookingId}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
          >
            {smsTestData.isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </>
            ) : (
              `Send Test ${smsTestData.testType.charAt(0).toUpperCase() + smsTestData.testType.slice(1)} SMS`
            )}
          </button>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This will send test SMS messages using Twilio service to the specified phone numbers. 
              Make sure phone numbers are in international format (e.g., +61412345678 for Australian numbers).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}