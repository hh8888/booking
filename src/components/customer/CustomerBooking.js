import React from 'react';
import EditBookingPopup from '../booking/EditBookingPopup';

const CustomerBooking = ({ customerData, editingBooking, onSave, onCancel }) => {
  console.log('=== CustomerBooking component rendered ===');
  console.log('Props received:', { customerData, editingBooking, onSave, onCancel });
  console.log('onSave function type:', typeof onSave);
  
  const wrappedOnSave = (data) => {
    console.log('=== CustomerBooking onSave wrapper called ===');
    console.log('Data to save:', data);
    console.log('Calling parent onSave...');
    return onSave(data);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {editingBooking ? 'Edit Booking' : 'New Booking'}
            </h2>
            <button 
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <EditBookingPopup
            editItem={editingBooking || {
              customer_id: customerData?.id,
              status: 'pending'
            }}
            onSave={wrappedOnSave}
            onCancel={onCancel}
            isCreating={!editingBooking}
            hideCustomerSelection={true}
            hideRecurringOptions={true}
          />
        </div>
      </div>
    </div>
  );
};

export default CustomerBooking;