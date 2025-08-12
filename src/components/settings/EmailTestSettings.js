import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';
import { TABLES } from '../../constants';

export default function EmailTestSettings() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [availableBookings, setAvailableBookings] = useState([]);
  const [emailTestData, setEmailTestData] = useState({
    bookingId: '',
    emailRecipients: 'both',
    oldStatus: 'pending',
    newStatus: 'confirmed',
    isLoading: false
  });

  // Load available bookings when component mounts
  useEffect(() => {
    const loadBookings = async () => {
      try {
        const { data, error } = await supabase
          .from(TABLES.BOOKINGS)
          .select(`
            id,
            customer:customer_id(full_name),
            service:service_id(name)
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

  const testEmailSend = async () => {
    if (!emailTestData.bookingId) {
      toast.error('Please select a booking first');
      return;
    }

    setEmailTestData(prev => ({ ...prev, isLoading: true }));

    try {
      const { data, error } = await supabase.functions.invoke('send-booking-status-email', {
        body: {
          bookingId: emailTestData.bookingId,
          oldStatus: emailTestData.oldStatus,
          newStatus: emailTestData.newStatus,
          emailRecipients: emailTestData.emailRecipients,
          isTest: true
        }
      });

      if (error) throw error;

      toast.success('Test email sent successfully!');
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error(`Failed to send test email: ${error.message}`);
    } finally {
      setEmailTestData(prev => ({ ...prev, isLoading: false }));
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
          <h3 className="text-lg font-semibold text-gray-800">Email Test</h3>
        </div>
      </div>

      {isExpanded && (
        <div>
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
      )}
    </div>
  );
}