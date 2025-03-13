import React from 'react';
import DateTimeFormatter from '../utils/DateTimeFormatter';

const TableRow = ({ row, columns, selectedRows, onSelectRow, onEdit }) => {
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
          {formatCellContent(column, row[column.key])}
        </td>
      ))}
      <td className="px-2 md:px-4 py-2 border-b border-gray-200 bg-blue-200">
        <button
          onClick={() => onEdit(row)}
          className="text-blue-500 hover:underline py-1 px-2 md:py-2 md:px-3 text-sm md:text-base"
        >
          Edit
        </button>
      </td>
    </tr>
  );
};

export default TableRow;