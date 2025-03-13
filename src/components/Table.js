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

  // Calculate record range
  const totalRecords = sortedData.length;
  const startRecord = totalRecords === 0 ? 0 : startIndex + 1;
  const endRecord = Math.min(startIndex + pageSize, totalRecords);

  return (
    <div className="w-full overflow-x-auto">
      <PaginationControls
        pageSize={pageSize}
        setPageSize={setPageSize}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        startRecord={startRecord}
        endRecord={endRecord}
        totalRecords={totalRecords}
      />
      <div className="overflow-x-auto md:overflow-visible">
        <table className="min-w-full bg-white border border-gray-200 table-auto text-sm md:text-base">
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
    </div>
  );
};

export default Table;