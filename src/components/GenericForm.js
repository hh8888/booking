import React, { useState, useEffect } from 'react';

const GenericForm = ({ data, fields, onSave, onCancel, title }) => {
  const [formData, setFormData] = useState({});

  // Initialize form data when component mounts or data changes
  useEffect(() => {
    if (data) {
      // 处理null值，特别是日期字段
      const processedData = {};
      for (const key in data) {
        // 如果值为null或undefined，设置为空字符串
        processedData[key] = data[key] === null || data[key] === undefined ? '' : data[key];
      }
      setFormData(processedData);
    } else {
      // Initialize with empty values based on fields
      const initialData = {};
      fields.forEach(field => {
        initialData[field.key] = '';
      });
      setFormData(initialData);
    }
  }, [data, fields]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const renderField = (field) => {
    // Support custom field rendering
    if (field.type === 'custom' && typeof field.renderField === 'function') {
      return field.renderField();
    }

    // 检查字段是否应该被隐藏
    if (field.dependsOn) {
      const dependentField = fields.find(f => f.key === field.dependsOn.field);
      if (dependentField && formData[dependentField.key] !== field.dependsOn.value) {
        return null;
      }
    }
    
    // Handle different field types
    switch (field.type) {
      case 'select':
        return (
          <select
            name={field.key}
            value={formData[field.key] || ''}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{field.placeholder || `Select ${field.label}`}</option>
            {field.options && field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'textarea':
        return (
          <textarea
            name={field.key}
            value={formData[field.key] || ''}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder={field.placeholder}
            required={field.required}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            name={field.key}
            value={formData[field.key] || ''}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required={field.required}
          />
        );
      case 'time':
        return (
          <input
            type="time"
            name={field.key}
            value={formData[field.key] || ''}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required={field.required}
          />
        );
      case 'datetime':
        return (
          <input
            type="datetime-local"
            name={field.key}
            value={formData[field.key] || ''}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required={field.required}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            name={field.key}
            value={formData[field.key] || ''}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder={field.placeholder}
            required={field.required}
            min={field.min}
            max={field.max}
            step={field.step}
          />
        );
      case 'checkbox':
        return (
          <div className="flex items-center h-6">
            <input
              type="checkbox"
              name={field.key}
              checked={formData[field.key] || false}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  [field.key]: e.target.checked
                });
                if (typeof field.onChange === 'function') {
                  field.onChange(e);
                }
              }}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              id={field.key}
            />
            <label htmlFor={field.key} className="ml-2 block text-sm font-medium text-gray-700">
              {field.text}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          </div>
        );
      default: // Default to text input
        return (
          <input
            type="text"
            name={field.key}
            value={formData[field.key] || ''}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder={field.placeholder}
            required={field.required}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">{title || 'Edit Item'}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => {
            // 检查字段是否应该被隐藏
            if (field.dependsOn) {
              const dependentField = fields.find(f => f.key === field.dependsOn.field);
              if (dependentField && formData[dependentField.key] !== field.dependsOn.value) {
                return null;
              }
            }
            
            return (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderField(field)}
              </div>
            );
          })}
          
          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onCancel}
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
      </div>
    </div>
  );
};

export default GenericForm;