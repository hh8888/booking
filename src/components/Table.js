import React, { useState } from 'react';
import PaginationControls from './PaginationControls';
import TableHeader from './TableHeader';
import TableBody from './TableBody';

const Table = ({
  columns = [],
  data = [],
  selectedRows = [],
  setSelectedRows = () => {},
  onEdit = () => {},
}) => {
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Sort data based on sortConfig
  const sortedData = [...data].sort((a, b) => {
    if (sortConfig.key) {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
    }
    return 0;
  });

  // Handle row selection
  const handleSelectRow = (id) => {
    if (selectedRows.includes(id)) {
      setSelectedRows((prev) => prev.filter((rowId) => rowId !== id));
    } else {
      setSelectedRows((prev) => [...prev, id]);
    }
  };

  // Handle select all rows
  const handleSelectAll = () => {
    if (selectedRows.length === data.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(data.map((row) => row.id));
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);

  return (
    <div>
      <PaginationControls
        pageSize={pageSize}
        setPageSize={setPageSize}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
      />
      <table className="min-w-full bg-white border border-gray-200">
        <TableHeader
          columns={columns}
          sortConfig={sortConfig}
          onSort={handleSort}
          selectedRows={selectedRows}
          data={data}
          onSelectAll={handleSelectAll}
        />
        <TableBody
          data={paginatedData}
          columns={columns}
          selectedRows={selectedRows}
          onSelectRow={handleSelectRow}
          onEdit={onEdit}
        />
      </table>
    </div>
  );
};

export default Table;