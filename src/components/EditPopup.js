import React from 'react';

export default function EditPopup({ data, onSave, onCancel, fields }) {
  const [editedData, setEditedData] = React.useState(data);

  const handleChange = (key, value) => {
    setEditedData({ ...editedData, [key]: value });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4">Edit User</h3>

        {/* Render editable fields */}
        {fields.map((field) => (
          <div key={field.key} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
            </label>
            {field.key === 'role' ? (
              <select
                value={editedData[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="customer">Customer</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option> {/* Updated from "Provider" to "Staff" */}
              </select>
            ) : field.key === 'birthday' ? (
              <input
                type="date"
                value={editedData[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : field.key === 'gender' ? (
              <select
                value={editedData[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            ) : (
              <input
                type="text"
                placeholder={`Enter ${field.label}`}
                value={editedData[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        ))}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition duration-200"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(editedData)}
            className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-200"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}