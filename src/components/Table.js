import React, { useState } from 'react'; // Add useState to the import

export default function Table({
  columns,
  data,
  selectedRows,
  setSelectedRows, // Add setSelectedRows as a prop
  onSort,
  onEdit,
}) {
  const [pageSize, setPageSize] = useState(10); // Default rows per page
  const [currentPage, setCurrentPage] = useState(1); // Current page
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' }); // Sorting state

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    // Trigger the onSort callback
    onSort(key, direction);
  };

  // Pagination logic
  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = data.slice(startIndex, startIndex + pageSize);

  return (
    <div>
      {/* Pagination Controls */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <span className="mr-2">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="p-2 border border-gray-300 rounded-lg"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>
        <div>
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-2 bg-gray-200 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="mx-4">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-2 bg-gray-200 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-2 border-b border-gray-200">
              <input
                type="checkbox"
                checked={selectedRows.length === data.length}
                onChange={() => {
                  if (selectedRows.length === data.length) {
                    setSelectedRows([]);
                  } else {
                    setSelectedRows(data.map((row) => row.id));
                  }
                }}
              />
            </th>
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-4 py-2 border-b border-gray-200 cursor-pointer"
                onClick={() => handleSort(column.key)}
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
        <tbody>
          {paginatedData.map((row, rowIndex) => (
            <tr
              key={row.id}
              className={`${rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`} // Striped rows
            >
              <td className="px-4 py-2 border-b border-gray-200">
                <input
                  type="checkbox"
                  checked={selectedRows.includes(row.id)}
                  onChange={() => {
                    if (selectedRows.includes(row.id)) {
                      setSelectedRows((prev) => prev.filter((id) => id !== row.id)); // Remove ID
                    } else {
                      setSelectedRows((prev) => [...prev, row.id]); // Add ID
                    }
                  }}
                />
              </td>
              {columns.map((column, colIndex) => (
                <td
                  key={column.key}
                  className={`px-4 py-2 border-b border-gray-200 ${
                    colIndex % 2 === 0 ? 'bg-gray-100' : 'bg-white' // Striped columns
                  }`}
                >
                  {column.key === 'created_at' || column.key === 'last_sign_in'
                    ? row[column.key]
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
              <td className="px-4 py-2 border-b border-gray-200">
                <button
                  onClick={() => onEdit(row)}
                  className="text-blue-500 hover:underline"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}