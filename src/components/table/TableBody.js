import React from 'react';
import TableRow from './TableRow';

const TableBody = ({ data, columns, selectedRows, onSelectRow, onEdit, onSetAvailability }) => {
  if (!data || data.length === 0) {
    return (
      <tbody>
        <tr>
          <td colSpan={columns.length + 2} className="px-2 md:px-4 py-2 text-center text-sm md:text-base">
            No data available
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody>
      {data.map((row) => (
        <TableRow
          key={row.id}
          row={row}
          columns={columns}
          selectedRows={selectedRows}
          onSelectRow={onSelectRow}
          onEdit={onEdit}
          onSetAvailability={onSetAvailability}
        />
      ))}
    </tbody>
  );
};

export default React.memo(TableBody);