import React from 'react';

const TableRow = ({ row, columns, selectedRows, onSelectRow, onEdit }) => {
  return (
    <tr className={`${row.id % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
      <td className="px-4 py-2 border-b border-gray-200">
        <input
          type="checkbox"
          checked={selectedRows.includes(row.id)}
          onChange={() => onSelectRow(row.id)}
        />
      </td>
      {columns.map((column, colIndex) => (
        <td
          key={`${row.id}-${column.key || colIndex}`}
          className={`px-4 py-2 border-b border-gray-200 ${
            colIndex % 2 === 0 ? 'bg-gray-100' : 'bg-white'
          }`}
        >
          {column.key === 'created_at' || column.key === 'last_sign_in'
            ? row[column.key] && !isNaN(new Date(row[column.key]).getTime())
              ? new Date(row[column.key]).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : 'Never'
            : row[column.key]}
        </td>
      ))}
      <td className="px-4 py-2 border-b border-gray-200 bg-blue-200">
        <button
          onClick={() => onEdit(row)}
          className="text-blue-500 hover:underline"
        >
          Edit
        </button>
      </td>
    </tr>
  );
};

export default TableRow;