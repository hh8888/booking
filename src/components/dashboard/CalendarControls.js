import React from 'react';

const CalendarControls = ({
  showAvailability,
  setShowAvailability,
  showBookings,
  setShowBookings,
  showPast,
  setShowPast,
  showNonWorkingHours,
  setShowNonWorkingHours
}) => {
  return (
    <div className="flex gap-4">
      <button
        onClick={() => setShowAvailability(!showAvailability)}
        className={`px-4 py-2 text-sm rounded transition-colors ${
          showAvailability 
            ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {showAvailability ? 'Hide Availability' : 'Show Availability'}
      </button>
      <button
        onClick={() => setShowBookings(!showBookings)}
        className={`px-4 py-2 text-sm rounded transition-colors ${
          showBookings 
            ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {showBookings ? 'Hide Bookings' : 'Show Bookings'}
      </button>
      <button
        onClick={() => setShowPast(!showPast)}
        className={`px-4 py-2 text-sm rounded transition-colors ${
          showPast 
            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            : 'bg-gray-200 text-gray-800 hover:bg-gray-300' 
        }`}
      >
        {showPast ? 'Show Past' : 'Hide Past'}
      </button>
      <button
        onClick={() => setShowNonWorkingHours(!showNonWorkingHours)}
        className={`px-4 py-2 text-sm rounded transition-colors ${
          showNonWorkingHours 
            ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {showNonWorkingHours ? 'Hide Non-Working Hours' : 'Show Non-Working Hours'}
      </button>
    </div>
  );
};

export default CalendarControls;