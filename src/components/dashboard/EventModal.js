import React from 'react';
import { BOOKING_STATUS } from '../../constants';
import { getBookingStatusClass, isPendingBooking } from '../../utils';

const EventModal = ({ selectedEvent, onClose, onEdit, onConfirm, bookings }) => {
  if (!selectedEvent) return null;

  const isAvailabilityEvent = selectedEvent.classNames?.includes('availability-event');
  const { extendedProps } = selectedEvent;
  
  // Get fresh booking data from the bookings array
  const currentBooking = bookings?.find(booking => booking.id === selectedEvent.id);
  const currentStatus = currentBooking?.status || extendedProps?.status;
  const currentNotes = currentBooking?.notes || extendedProps?.notes || '';
  
  const isPending = isPendingBooking({ status: currentStatus });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">
            {isAvailabilityEvent ? 'Staff Availability' : 'Booking Details'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-3">
          {isAvailabilityEvent ? (
            <>
              <div>
                <span className="font-medium text-gray-700">Staff:</span>
                <span className="ml-2 text-gray-900">{extendedProps?.staffName || 'Unknown'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Time:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(selectedEvent.start).toLocaleString()}
                </span>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="font-medium text-gray-700">Service:</span>
                <span className="ml-2 text-gray-900">{extendedProps?.serviceName || 'Unknown'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Customer:</span>
                <span className="ml-2 text-gray-900">{extendedProps?.customerName || 'Unknown'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Customer Email:</span>
                <span className="ml-2 text-gray-900">{extendedProps?.customerEmail || 'Not provided'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Customer Mobile:</span>
                <span className="ml-2 text-gray-900">{extendedProps?.customerPhone || 'Not provided'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Staff:</span>
                <span className="ml-2 text-gray-900">{extendedProps?.staffName || 'Unknown'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Location:</span>
                <span className="ml-2 text-gray-900">{extendedProps?.locationName || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Start Time:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(selectedEvent.start).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">End Time:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(selectedEvent.end).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded text-sm ${getBookingStatusClass(currentStatus)}`}>
                  {currentStatus || BOOKING_STATUS.PENDING}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Notes:</span>
                <span className="ml-2 text-gray-900">{currentNotes}</span>
              </div>
            </>
          )}
        </div>
        
        <div className="mt-6 flex justify-end space-x-4">
          {!isAvailabilityEvent && isPending && (
            <button
              onClick={() => onConfirm(selectedEvent)}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Confirm Booking
            </button>
          )}
          {!isAvailabilityEvent && (
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Edit
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventModal;