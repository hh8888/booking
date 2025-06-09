import React from 'react';

const StaffLegend = ({ staffColors, bookings }) => {
  return (
    <div className="staff-legend flex flex-wrap gap-4 mb-4">
      {Object.entries(staffColors).map(([staffId, color]) => {
        const staff = bookings.find(b => b.extendedProps.staffId === staffId);
        return (
          <div key={staffId} className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: color }}
            ></div>
            <span className="text-sm text-gray-600">
              {staff?.extendedProps.staffName || 'Unknown'}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default StaffLegend;