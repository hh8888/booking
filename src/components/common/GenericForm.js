import React, { useState, useEffect } from 'react';
import { showToast } from './ToastMessage';
import LoadingSpinner from './LoadingSpinner';
import { ERROR_MESSAGES } from '../../constants';
import { useLanguage } from '../../contexts/LanguageContext'; // Add this import

const GenericForm = ({ data, fields, onSave, onCancel, title, loading = false, loadingAvailability = false }) => {
  const { t } = useLanguage(); // Add this line
  const [formData, setFormData] = useState({});

  // Initialize form data when component mounts or data changes
  useEffect(() => {
    if (data) {
      // Handle null values, but preserve null for ID fields in creation mode
      const processedData = {};
      for (const key in data) {
        // For ID fields, preserve null/undefined values instead of converting to empty string
        if ((key === 'id' || key.endsWith('_id')) && (data[key] === null || data[key] === undefined)) {
          // Don't include the id field at all if it's null/undefined
          continue;
        }
        // For other fields, convert null/undefined to empty string
        processedData[key] = data[key] === null || data[key] === undefined ? '' : data[key];
      }
      // 只在组件初始化或data发生实际变化时更新表单数据
      setFormData(prevData => {
        const hasChanges = Object.keys(processedData).some(key => {
          // 特别处理日期字段，确保正确比较
          if (fields.some(field => field.key === key && field.type === 'date')) {
            return prevData[key]?.toString() !== processedData[key]?.toString();
          }
          return prevData[key] !== processedData[key];
        });
        return hasChanges ? { ...prevData, ...processedData } : prevData;
      });
    } else {
      // 只在组件初始化时设置默认值
      setFormData(prevData => {
        if (Object.keys(prevData).length === 0) {
          const initialData = {};
          fields.forEach(field => {
            const fieldKey = field.key;
            initialData[fieldKey] = field.defaultValue || '';
          });
          return initialData;
        }
        return prevData;
      });
    }
  }, [data, fields]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    console.log('=== GenericForm handleSubmit START ===');
    console.log('Event:', e);
    console.log('Form data:', formData);
    console.log('onSave function:', onSave);
    
    e.preventDefault();
    let hasErrors = false;
    const newErrors = {};
    
    // 验证所有必填字段
    for (const field of fields) {
      if (field.required) {
        const value = formData[field.key];
        if (value === undefined || value === null || value === '' || (typeof value === 'string' && value.trim() === '')) {
          newErrors[field.key] = true;
          hasErrors = true;
          showToast.error(`${field.label || field.key} ${ERROR_MESSAGES.FIELD_REQUIRED}`);
        }
      }
    }
    
    // 验证日期和时间字段
    const dateFields = fields.filter(field => field.type === 'date' || field.key?.includes('time'));
    for (const field of dateFields) {
      const value = formData[field.key];
      if (field.type === 'date' && value) {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          newErrors[field.key] = true;
          hasErrors = true;
          showToast.error(ERROR_MESSAGES.INVALID_DATE);
        }
      }
    }

    setErrors(newErrors);
    if (hasErrors) {
      console.log('=== GenericForm validation errors ===', newErrors);
      return;
    }
    
    console.log('=== GenericForm calling onSave ===');
    console.log('Data to save:', formData);
    onSave(formData);
    console.log('=== GenericForm handleSubmit END ===');
  };

  const renderField = (field) => {
    // Check if field is hidden
    if (field.hidden) {
      return null;
    }

    // Support custom field rendering
    if (field.type === 'custom' && typeof field.renderField === 'function') {
      return field.renderField();
    }

    // Support inline fields
    if (field.inline) {
      return (
        <div className="flex items-end space-x-4">
          {field.fields.map((subField, index) => (
            <div key={index} className="flex-1">
              {renderField(subField)}
            </div>
          ))}
        </div>
      );
    }

    // Support inline field group
    if (field.type === 'inline-group' && Array.isArray(field.fields)) {
      return (
        <div className="flex items-end space-x-4">
          {field.fields.map((subField, index) => (
            <div key={`inline-child-${index}`} className="flex-1">
              {renderField(subField)}
            </div>
          ))}
        </div>
      );
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
            onChange={(e) => {
              // Always update the form data first
              handleChange(e);
              // Then call custom onChange if it exists
              if (field.onChange) {
                field.onChange(e.target.value);
              }
            }}
            className={`mt-1 block w-full px-3 py-2 border ${errors[field.key] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
          >
            {field.placeholder && <option value="">{field.placeholder}</option>}
            {field.options && field.options.map((option, index) => (
              <option key={`${field.key}-${option.value}-${index}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'textarea':
        return (
          <textarea
            name={field.key || field.name}
            value={formData[field.key || field.name] || ''}
            onChange={(e) => {
              handleChange(e);
            }}
            onBlur={(e) => {
              if (field.onChange) {
                field.onChange(e.target.value);
              }
            }}
            className={`mt-1 block w-full px-3 py-2 border ${errors[field.key] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            name={field.key || field.name}
            value={formData[field.key || field.name] || ''}
            onChange={(e) => {
              handleChange(e);
            }}
            onBlur={(e) => {
              if (field.onChange) {
                field.onChange(e.target.value);
              }
            }}
            className={`mt-1 block w-full px-3 py-2 border ${errors[field.key] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 cursor-pointer`}
            required={field.required}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.target.showPicker();
            }}
          />
        );
      case 'time':
        return (
          <input
            type="time"
            name={field.key || field.name}
            value={formData[field.key || field.name] || ''}
            onChange={(e) => {
              handleChange(e);
            }}
            onBlur={(e) => {
              if (field.onChange) {
                field.onChange(e.target.value);
              }
            }}
            className={`mt-1 block w-full px-3 py-2 border ${errors[field.key] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            required={field.required}
          />
        );
      case 'datetime':
        return (
          <input
            type="datetime-local"
            name={field.key || field.name}
            value={formData[field.key || field.name] || ''}
            onChange={(e) => {
              handleChange(e);
            }}
            onBlur={(e) => {
              if (field.onChange) {
                field.onChange(e.target.value);
              }
            }}
            className={`mt-1 block w-full px-3 py-2 border ${errors[field.key] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            required={field.required}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            name={field.key || field.name}
            value={formData[field.key || field.name] || ''}
            onChange={(e) => {
              handleChange(e);
            }}
            onBlur={(e) => {
              if (field.onBlur) {
                field.onBlur(e.target.value);
              }
            }}
            className={`mt-1 block w-full px-3 py-2 border ${errors[field.key] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
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
              name={field.key || field.name}
              checked={formData[field.key || field.name] || false}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  [field.key || field.name]: e.target.checked
                });
                if (typeof field.onChange === 'function') {
                  field.onChange(e);
                }
              }}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              id={field.name}
            />
            <label htmlFor={field.name} className="ml-2 block text-sm font-medium text-gray-700">
              {field.text}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          </div>
        );
      case 'link':
        return (
          <button
            type="button"
            onClick={field.onClick}
            className="text-blue-600 hover:text-blue-800 underline focus:outline-none"
          >
            {field.text}
          </button>
        );
      default: // Default to text input
        return (
          <input
            type="text"
            name={field.key || field.name}
            value={formData[field.key || field.name] || ''}
            onChange={(e) => {
              handleChange(e);
            }}
            onBlur={(e) => {
              if (field.onChange) {
                field.onChange(e.target.value);
              }
            }}
            className={`mt-1 block w-full px-3 py-2 border ${errors[field.key] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 shadow-lg w-full max-w-3xl relative long-popup-scroll">
        <h2 className="text-xl font-semibold mb-4">{title || t('formLabels.editItem')}</h2>
        {loadingAvailability && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <LoadingSpinner size="lg" text="Loading availability..." />
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field, index) => {
            // 检查字段是否应该被隐藏
            if (field.dependsOn) {
              const dependentField = fields.find(f => f.key === field.dependsOn.field);
              if (dependentField && formData[dependentField.key] !== field.dependsOn.value) {
                return null;
              }
            }
            
            // Skip hidden fields and their labels
            if (field.hidden) {
              return null;
            }
            
            // Skip label for inline group fields as they should have their own labels
            if (field.type === 'inline-group') {
              return (
                <div key={`${field.key || field.name}-${index}`}>
                  {field.label && (
                    <label className="block text-sm font-medium text-gray-700">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                  )}
                  {renderField(field)}
                </div>
              );
            }
            
            return (
              <div key={`${field.key || field.name}-${index}`}>
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
              disabled={loading}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 relative"
            >
              {loading ? (
                <>
                  <span className="opacity-0">{t('common.save')}</span>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin h-6 w-6 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                </>
              ) : (
                t('common.save')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GenericForm;