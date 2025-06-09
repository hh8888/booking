import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-gray-800 text-white py-4 text-center">
      <p className="text-sm">
        © 2025 U&Me Australia. All rights reserved.
      </p>
    </footer>
  );
};

export default Footer;