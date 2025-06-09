import React from 'react';

export default function FilterBox({ filter, setFilter, placeholder, className }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={filter}
      onChange={(e) => setFilter(e.target.value)}
      className={`w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${className || ''}`}
    />
  );
}