import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-gray-800 text-white py-4 text-center">
      <p className="text-sm">
        © 2025 U&Me Australia. All rights reserved.
        <span className="ml-2 text-gray-400">v0.1.0</span>
      </p>
    </footer>
  );
};

export default Footer;