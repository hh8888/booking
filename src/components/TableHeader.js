import React from 'react';

const TableHeader = ({ columns, sortConfig, onSort, selectedRows, data, onSelectAll }) => {
  return (
    <thead>
      <tr>
        <th className="px-4 py-2 border-b border-gray-200">
          <input
            type="checkbox"
            checked={selectedRows.length === data.length}
            onChange={onSelectAll}
          />
        </th>
        {columns.map((column) => (
          <th
            key={column.key} // Use column.key as the key
            className="px-4 py-2 border-b border-gray-200 cursor-pointer"
            onClick={() => onSort(column.key)}
          >
            <div className="flex items-center">
              <span>{column.label}</span>
              {sortConfig.key === column.key && (
                <span className="ml-2">
                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </div>
          </th>
        ))}
        <th className="px-4 py-2 border-b border-gray-200">Actions</th>
      </tr>
    </thead>
  );
};

export default TableHeader;