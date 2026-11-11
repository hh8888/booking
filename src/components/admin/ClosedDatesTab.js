import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ClosedDatesService from '../../services/ClosedDatesService';
import LocationService from '../../services/LocationService';
import Table from '../common/Table';
import GenericForm from '../common/GenericForm';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../constants';

const ClosedDatesTab = () => {
  const [closedDates, setClosedDates] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);

  const closedDatesService = ClosedDatesService.getInstance();
  const locationService = LocationService.getInstance();

  useEffect(() => {
    fetchClosedDates();
    fetchLocations();
  }, [selectedLocation]);

  const fetchClosedDates = async () => {
    try {
      const locationId = selectedLocation === 'all' ? null : parseInt(selectedLocation);
      const data = await closedDatesService.getClosedDates(locationId);
      
      // Format data for display
      const formattedData = data.map(item => ({
        ...item,
        date_formatted: new Date(item.date).toLocaleDateString(),
        location_name: item.location ? locationService.getLocationNameById(item.location) : 'All Locations'
      }));
      
      setClosedDates(formattedData);
    } catch (error) {
      console.error('Error fetching closed dates:', error);
      toast.error('Failed to fetch closed dates');
    }
  };

  const fetchLocations = async () => {
    try {
      const locationData = await locationService.getLocations();
      setLocations(locationData);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleSave = async (formData) => {
    try {
      const dataToSave = {
        ...formData,
        location: formData.location === 'all' ? null : parseInt(formData.location)
      };

      if (isCreating) {
        await closedDatesService.addClosedDate(dataToSave);
      } else {
        await closedDatesService.updateClosedDate(dataToSave);
      }

      await fetchClosedDates();
      setIsCreating(false);
      setEditItem(null);
    } catch (error) {
      console.error('Error saving closed date:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await Promise.all(
        selectedRows.map(id => closedDatesService.removeClosedDate(id))
      );
      await fetchClosedDates();
      setSelectedRows([]);
    } catch (error) {
      console.error('Error deleting closed dates:', error);
    }
  };

  const formFields = [
    {
      name: 'date',
      label: 'Date',
      type: 'date',
      required: true,
      min: new Date().toISOString().split('T')[0] // Prevent past dates
    },
    {
      name: 'reason',
      label: 'Reason',
      type: 'text',
      placeholder: 'Optional reason for closure'
    },
    {
      name: 'location',
      label: 'Location',
      type: 'select',
      options: [
        { value: 'all', label: 'All Locations' },
        ...locations.map(loc => ({ value: loc.id.toString(), label: loc.name }))
      ],
      defaultValue: 'all'
    }
  ];

  const tableColumns = [
    { key: 'date_formatted', label: 'Date' },
    { key: 'reason', label: 'Reason' },
    { key: 'location_name', label: 'Location' },
    { key: 'created_at', label: 'Created', formatter: (date) => new Date(date).toLocaleDateString() }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Closed Dates Management</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Add Closed Date
        </button>
      </div>

      {/* Location Filter */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">Filter by Location:</label>
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Locations</option>
          {locations.map(location => (
            <option key={location.id} value={location.id.toString()}>
              {location.name}
            </option>
          ))}
        </select>
      </div>

      {/* Closed Dates Table */}
      <Table
        columns={tableColumns}
        data={closedDates}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        onEdit={(item) => setEditItem(item)}
        onDelete={selectedRows.length > 0 ? handleDelete : null}
        emptyMessage="No closed dates found"
      />

      {/* Form Modal */}
      {(isCreating || editItem) && (
        <GenericForm
          fields={formFields}
          initialData={editItem}
          onSave={handleSave}
          onCancel={() => {
            setIsCreating(false);
            setEditItem(null);
          }}
          title={isCreating ? 'Add Closed Date' : 'Edit Closed Date'}
        />
      )}
    </div>
  );
};

export default ClosedDatesTab;