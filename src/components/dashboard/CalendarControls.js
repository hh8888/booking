import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

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
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative mb-4"> {/* Added mb-4 for spacing below controls */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-0 right-0 p-2 focus:outline-none text-gray-600 hover:text-gray-800 z-10" /* Added text colors and z-index */
        aria-label={isOpen ? t('calendar.hideControls') : t('calendar.showControls')}
      >
        <svg
          className={`w-5 h-5 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} /* Increased icon size */
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </button>
      {/* Ensure the container for controls has some top margin if button is absolute */}
      {/* Or, better, make the layout flow normally */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-96 opacity-100 mt-10' : 'max-h-0 opacity-0 mt-0'}`}> {/* Added transition and mt-10 when open*/}
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:gap-4 sm:pt-0"> {/* Added pt-2 for spacing from toggle */}
          <button
            onClick={() => setShowAvailability(!showAvailability)}
            className={`px-4 py-2 text-sm rounded transition-colors ${
              showAvailability 
                ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {showAvailability ? t('calendar.hideAvailability') : t('calendar.showAvailability')}
          </button>
          <button
            onClick={() => setShowBookings(!showBookings)}
            className={`px-4 py-2 text-sm rounded transition-colors ${
              showBookings 
                ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {showBookings ? t('calendar.hideBookings') : t('calendar.showBookings')}
          </button>
          <button
            onClick={() => setShowPast(!showPast)}
            className={`px-4 py-2 text-sm rounded transition-colors ${
              showPast 
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300' 
            }`}
          >
            {showPast ? t('calendar.showPast') : t('calendar.hidePast')}
          </button>
          <button
            onClick={() => setShowNonWorkingHours(!showNonWorkingHours)}
            className={`px-4 py-2 text-sm rounded transition-colors ${
              showNonWorkingHours 
                ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {showNonWorkingHours ? t('calendar.hideNonWorkingHours') : t('calendar.showNonWorkingHours')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarControls;