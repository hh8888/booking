import React, { useState, useEffect } from 'react';

const ServiceForm = ({ initialData, staffUsers, onClose, onSubmit }) => {
  const [formData, setFormData] = useState(
    initialData || {
      name: '',
      description: '',
      price: '',
      duration: '',
      staff_ids: [], // Array for multiple staff selection
    }
  );
  
  // 初始化staff_ids，如果是编辑模式且有staff_id或staff_ids
  useEffect(() => {
    if (initialData) {
      if (initialData.staff_ids && initialData.staff_ids.length > 0) {
        // 如果已有staff_ids数组，直接使用
        setFormData(prev => ({
          ...prev,
          staff_ids: initialData.staff_ids
        }));
      } else if (initialData.staff_id) {
        // 向后兼容：如果只有单个staff_id，转换为数组格式
        setFormData(prev => ({
          ...prev,
          staff_ids: [initialData.staff_id]
        }));
      }
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  
  // 处理员工多选
  const handleStaffChange = (staffId) => {
    setFormData(prev => {
      const currentStaffIds = [...(prev.staff_ids || [])];
      
      // 如果已选中，则移除；否则添加
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
    // 准备提交的数据，保留原始staff_id以兼容旧代码
    const submitData = {
      ...formData,
      staff_id: formData.staff_ids && formData.staff_ids.length > 0 ? formData.staff_ids[0] : null
    };
    onSubmit(submitData); // Pass the form data to the parent component
    onClose(); // Close the form
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
          required
          step="1"
          min="1"
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

export default ServiceForm;