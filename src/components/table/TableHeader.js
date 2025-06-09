import React from 'react';

const TableHeader = ({ columns, sortConfig, onSort, selectedRows, data, onSelectAll }) => {
  return (
    <thead>
      <tr>
        <th className="px-2 md:px-4 py-2 border-b border-gray-200">
          <input
            type="checkbox"
            className="w-4 h-4 md:w-5 md:h-5"
            checked={selectedRows.length === data.length}
            onChange={onSelectAll}
          />
        </th>
        {columns.map((column) => (
          <th
            key={column.key}
            className="px-2 md:px-4 py-2 border-b border-gray-200 cursor-pointer text-sm md:text-base"
            onClick={() => onSort(column.key)}
          >
            <div className="flex items-center">
              <span>{column.label}</span>
              {sortConfig.key === column.key && (
                <span className="ml-1 md:ml-2">
                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </div>
          </th>
        ))}
        <th className="px-2 md:px-4 py-2 border-b border-gray-200 text-sm md:text-base">Actions</th>
      </tr>
    </thead>
  );
};

export default React.memo(TableHeader);