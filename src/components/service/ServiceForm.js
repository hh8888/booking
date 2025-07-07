import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import DatabaseService from '../../services/DatabaseService';
import { ERROR_MESSAGES } from '../../constants';

const ServiceForm = ({ initialData, staffUsers, onClose, onSubmit }) => {
  const { register, formState: { errors } } = useForm();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    staff_ids: [],
  });

  const fetchDefaultSettings = useCallback(async () => {
  try {
    const dbService = DatabaseService.getInstance();
    const [duration, price] = await Promise.all([
      dbService.getSettingsByKey('service', 'defaultServiceDuration'),
      dbService.getSettingsByKey('service', 'defaultServicePrice')
    ]);

    setFormData(prev => ({
      ...prev,
      duration: duration ? parseInt(duration) : 60,
      price: price ? parseFloat(price) : 100
    }));
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    toast.error(ERROR_MESSAGES.FAILED_LOAD_DEFAULT_SETTINGS);
  }
}, []);

// Only apply default values when creating new
useEffect(() => {
  if (!initialData) {
    fetchDefaultSettings();
  }
}, [fetchDefaultSettings, initialData]);
  
  // Initialize staff_ids, if in edit mode and has staff_id or staff_ids
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        id: initialData.id,
        name: initialData.name || '',
        description: initialData.description || '',
        price: initialData.price || '',
        duration: initialData.duration || '',
        staff_ids: initialData.staff_ids && initialData.staff_ids.length > 0
          ? initialData.staff_ids
          : initialData.staff_id
            ? [initialData.staff_id]
            : []
      }));
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  
  // Handle staff multi-selection
  const handleStaffChange = (staffId) => {
    setFormData(prev => {
      const currentStaffIds = [...(prev.staff_ids || [])];
      
      // If already selected, remove it; otherwise add it
      if (currentStaffIds.includes(staffId)) {
        return {
          ...prev,
          staff_ids: currentStaffIds.filter(id => id !== staffId)
        };
      } else {
        return {
          ...prev,
          staff_ids: [...currentStaffIds, staffId]
        };
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Ensure staff_ids is a valid array
    const staff_ids = formData.staff_ids || [];
    // Prepare submit data, maintain backward compatibility
    const submitData = {
      ...formData,
      staff_ids: staff_ids,
      staff_id: staff_ids.length > 0 ? staff_ids[0] : null
    };
    onSubmit(submitData);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Service Name <span className="text-red-500">*</span></label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Price ($)<span className="text-red-500">*</span></label>
        <input
          type="number"
          name="price"
          value={formData.price}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Duration (mins) <span className="text-red-500">*</span></label>
        <input
          type="number"
          name="duration"
          value={formData.duration}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          step="1"
          min="1"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Staff (Multiple Selection)</label>
        <div className="mt-1 space-y-2 max-h-60 overflow-y-auto border border-gray-300 rounded-md p-3">
          {staffUsers.map((staff) => (
            <div key={staff.id} className="flex items-center">
              <input
                type="checkbox"
                id={`staff-${staff.id}`}
                checked={formData.staff_ids?.includes(staff.id) || false}
                onChange={() => handleStaffChange(staff.id)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor={`staff-${staff.id}`} className="ml-2 block text-sm text-gray-900">
                {staff.full_name}
              </label>
            </div>
          ))}
          {staffUsers.length === 0 && (
            <p className="text-sm text-gray-500">No staff available</p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onClose}
          className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          Save
        </button>
      </div>
    </form>
  );
};

const propsAreEqual = (prevProps, nextProps) => {
  return (
    prevProps.initialData === nextProps.initialData &&
    prevProps.staffUsers === nextProps.staffUsers
  );
};

export default React.memo(ServiceForm, propsAreEqual);