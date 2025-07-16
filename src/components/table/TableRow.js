import React from 'react';
import DateTimeFormatter from '../../utils/DateTimeFormatter';
import StaffAvailabilityService from '../../services/StaffAvailabilityService';
import { PencilIcon, ClockIcon, KeyIcon } from '@heroicons/react/24/outline';
import { USER_ROLES } from '../../constants';

const TableRow = ({ row, columns, selectedRows, onSelectRow, onEdit, onSetAvailability, onResetPassword }) => {
  // Check if value is a date type
  const isDateValue = (value) => {
    if (!value) return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
  };

  // Format cell content
  const formatCellContent = (column, value) => {
    // Check if it's a date field
    const isDateField = column.key === 'created_at' || 
                        column.key === 'last_sign_in' || 
                        column.key === 'birthday' || 
                        column.key === 'start_time' || 
                        column.key === 'end_time' || 
                        column.type === 'date' || 
                        (isDateValue(value) && typeof value === 'string' && value.includes('-'));
    
    if (isDateField && isDateValue(value)) {
      // For birthday field, only show date part
      if (column.key === 'birthday') {
        return DateTimeFormatter.getInstance().formatDate(value);
      }
      return DateTimeFormatter.getInstance().formatDateTime(value);
    } else if (isDateField && !value) {
      // For birthday field, return empty string instead of 'Never'
      if (column.key === 'birthday') {
        return '';
      }
      return 'Never';
    }
    
    return value;
  };

  return (
    <tr className={`${row.id % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
      <td className="px-2 md:px-4 py-2 border-b border-gray-200">
        <input
          type="checkbox"
          className="w-4 h-4 md:w-5 md:h-5"
          checked={selectedRows.includes(row.id)}
          onChange={() => onSelectRow(row.id)}
        />
      </td>
      {columns.map((column, colIndex) => (
        <td
          key={`${row.id}-${column.key || colIndex}`}
          className={`px-2 md:px-4 py-2 border-b border-gray-200 text-sm md:text-base ${colIndex % 2 === 0 ? 'bg-gray-100' : 'bg-white'}`}
        >
          {column.render ? column.render(row[column.key], row) : column.formatter ? column.formatter(row[column.key]) : formatCellContent(column, row[column.key])}
        </td>
      ))}
      <td className="px-2 md:px-4 py-2 border-b border-gray-200 bg-blue-200">
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(row)}
            className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-100 transition-colors duration-200"
            title="Edit"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          {(row.role === USER_ROLES.STAFF || row.role === USER_ROLES.MANAGER) && (
            <button
              onClick={() => onSetAvailability(row)}
              className="text-green-500 hover:text-green-700 p-1 rounded-full hover:bg-green-100 transition-colors duration-200"
              title="Set Availability"
            >
              <ClockIcon className="h-5 w-5" />
            </button>
          )}
          {onResetPassword && onResetPassword.toString() !== '() => {}' && (
            <button
              onClick={() => onResetPassword(row)}
              className="text-orange-500 hover:text-orange-700 p-1 rounded-full hover:bg-orange-100 transition-colors duration-200"
              title="Reset Password"
            >
              <KeyIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

export default TableRow;