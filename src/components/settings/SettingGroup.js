import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import BookingStepsEditor from './BookingStepsEditor';
import { useLanguage } from '../../contexts/LanguageContext';

export const SettingGroup = ({ title, settings, onSave }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const initialData = {};
    settings.forEach(setting => {
      initialData[setting.key] = setting.value;
    });
    setFormData(initialData);
  }, [settings]);

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
    setIsEditing(false);
    toast.success(t('settings.settingsSaved'));
  };

  const renderSettingField = (setting) => {
    switch (setting.type) {
      case 'select':
        return (
          <select
            name={setting.key}
            value={formData[setting.key] || ''}
            onChange={handleChange}
            disabled={!isEditing}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {setting.options && setting.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'number':
        return (
          <input
            type="number"
            name={setting.key}
            value={formData[setting.key] || ''}
            onChange={handleChange}
            disabled={!isEditing}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            min={setting.min}
            max={setting.max}
            step={setting.step}
          />
        );
      case 'textarea':
        return (
          <textarea
            name={setting.key}
            value={formData[setting.key] || ''}
            onChange={handleChange}
            disabled={!isEditing}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
        );
      case 'booking-steps':
        return (
          <BookingStepsEditor
            key={setting.key}
            value={formData[setting.key]}
            onChange={(value) => {
              setFormData({
                ...formData,
                [setting.key]: value
              });
            }}
            label={setting.label}
            description={setting.description}
            disabled={!isEditing}
          />
        );
      default:
        return (
          <input
            type="text"
            name={setting.key}
            value={formData[setting.key] || ''}
            onChange={handleChange}
            disabled={!isEditing}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        );
    }
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
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        {isExpanded && (
          !isEditing ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 text-sm"
            >
              Edit
            </button>
          ) : (
            <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setIsEditing(false)}
                className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 text-sm"
              >
                Save
              </button>
            </div>
          )
        )}
      </div>

      {isExpanded && (
        <form className="space-y-4">
          {settings.map((setting) => (
            <div key={setting.key} className="grid grid-cols-3 gap-4 items-center">
              <label className="text-sm font-medium text-gray-700 col-span-1">
                {setting.label}
                {setting.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <div className="col-span-2">
                {renderSettingField(setting)}
                {setting.description && (
                  <p className="mt-1 text-xs text-gray-500">{setting.description}</p>
                )}
              </div>
            </div>
          ))}
        </form>
      )}
    </div>
  );
};