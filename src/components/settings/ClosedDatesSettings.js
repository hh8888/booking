import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useLanguage } from '../../contexts/LanguageContext';
import { CalendarIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import ClosedDatesService from '../../services/ClosedDatesService';
import LocationService from '../../services/LocationService';

const ClosedDatesSettings = () => {
  const { t } = useLanguage();
  const [selectedLocation, setSelectedLocation] = useState('');
  const [closedDates, setClosedDates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [newDate, setNewDate] = useState({
    date: '',
    reason: '',
    location: ''
  });

  // 获取当前选中的位置
  useEffect(() => {
    const locationService = LocationService.getInstance();
    const currentLocation = locationService.getSelectedLocation();
    if (currentLocation) {
      setSelectedLocation(currentLocation.id || currentLocation);
      setNewDate(prev => ({ ...prev, location: currentLocation.id || currentLocation }));
    }
  }, []);

  useEffect(() => {
    if (isExpanded) {
      loadClosedDates();
    }
  }, [isExpanded, selectedLocation]);

  const loadClosedDates = async () => {
    try {
      setIsLoading(true);
      // 使用 getInstance() 获取服务实例
      const closedDatesService = ClosedDatesService.getInstance();
      const dates = await closedDatesService.getClosedDates(selectedLocation);
      setClosedDates(dates);
    } catch (error) {
      console.error('Error loading closed dates:', error);
      toast.error('Failed to load closed dates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddClosedDate = async (e) => {
    e.preventDefault();
    
    if (!newDate.date) {
      toast.error('Please select a date');
      return;
    }

    try {
      // 使用 getInstance() 获取服务实例
      const closedDatesService = ClosedDatesService.getInstance();
      await closedDatesService.addClosedDate({
        date: newDate.date,
        reason: newDate.reason || 'Closed for the day',
        location: selectedLocation || newDate.location
      });
      
      toast.success('Closed date added successfully');
      setNewDate({ date: '', reason: '', location: selectedLocation || '' });
      loadClosedDates();
    } catch (error) {
      console.error('Error adding closed date:', error);
      toast.error('Failed to add closed date');
    }
  };

  const handleRemoveClosedDate = async (id) => {
    try {
      // 使用 getInstance() 获取服务实例
      const closedDatesService = ClosedDatesService.getInstance();
      await closedDatesService.removeClosedDate(id);
      toast.success('Closed date removed successfully');
      loadClosedDates();
    } catch (error) {
      console.error('Error removing closed date:', error);
      toast.error('Failed to remove closed date');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
          <h3 className="text-lg font-semibold text-gray-800">Closed Dates Management</h3>
        </div>
      </div>
      
      {isExpanded && (
        <div>
          <p className="text-gray-600 mb-4">
            Manage dates when your business is closed and no bookings should be accepted.
          </p>
          
          {/* Add New Closed Date Form */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add New Closed Date
            </h4>
            <form onSubmit={handleAddClosedDate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="closedDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    id="closedDate"
                    value={newDate.date}
                    onChange={(e) => setNewDate({ ...newDate, date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                    Reason (Optional)
                  </label>
                  <input
                    type="text"
                    id="reason"
                    value={newDate.reason}
                    onChange={(e) => setNewDate({ ...newDate, reason: e.target.value })}
                    placeholder="e.g., Holiday, Maintenance, etc."
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Add Closed Date
                </button>
              </div>
            </form>
          </div>

          {/* Existing Closed Dates List */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">
              Current Closed Dates {selectedLocation && `(${selectedLocation})`}
            </h4>
            
            {isLoading ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="text-gray-500 mt-2">Loading closed dates...</p>
              </div>
            ) : closedDates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No closed dates configured</p>
                <p className="text-sm">Add dates when your business will be closed above.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {closedDates.map((closedDate) => (
                  <div
                    key={closedDate.id}
                    className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div className="flex items-center">
                      <CalendarIcon className="h-5 w-5 text-red-500 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatDate(closedDate.date)}
                        </p>
                        {closedDate.reason && (
                          <p className="text-sm text-gray-600">{closedDate.reason}</p>
                        )}
                        {closedDate.location && (
                          <p className="text-xs text-gray-500">Location: {closedDate.location}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveClosedDate(closedDate.id)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-md transition-colors"
                      title="Remove closed date"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClosedDatesSettings;