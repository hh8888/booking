import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const CustomerSearchSelect = ({ 
  customers, 
  value, 
  onChange, 
  placeholder = "Select a Customer",
  required = false 
}) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState(customers);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Filter customers based on search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = customers.filter(customer =>
        customer.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm)
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchTerm, customers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCustomer = customers.find(c => c.id === value);

  const handleSelect = (customer) => {
    onChange(customer.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (selectedCustomer) {
      setSearchTerm(selectedCustomer.full_name);
    }
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={isOpen ? searchTerm : (selectedCustomer?.full_name || '')}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        required={required}
      />
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map(customer => (
              <div
                key={customer.id}
                onClick={() => handleSelect(customer)}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-900">{customer.full_name}</div>
                {customer.email && (
                  <div className="text-sm text-gray-500">{customer.email}</div>
                )}
                {customer.phone && (
                  <div className="text-sm text-gray-500">{customer.phone}</div>
                )}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-gray-500 text-center">
              {t('common.noResults')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerSearchSelect;