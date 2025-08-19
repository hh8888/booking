import React, { useState, useEffect } from 'react';
import AdsBanner from './AdsBanner';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [isBannerHidden, setIsBannerHidden] = useState(false);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [forceRerender, setForceRerender] = useState(0);

  useEffect(() => {
    // Check if banner is closed in localStorage
    const bannerClosed = localStorage.getItem('adsBannerClosed') === 'true';

    // Check screen size
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);

    // Banner is hidden if closed or screen is too small
    setIsBannerHidden(bannerClosed || screenWidth < 728);

    return () => window.removeEventListener('resize', handleResize);
  }, [screenWidth, forceRerender]);

  const handleBannerClose = () => {
    // Force rerender by updating state
    setForceRerender(prev => prev + 1);
  };

  return (
    <div className="w-full bg-gray-800 text-white justify-center">
      <div className="relative min-h-lh">
        {isBannerHidden && (
          <div className="flex justify-center">
            &#8203;
          </div>
        )}

        {/* Banner - centered */}
        <div className="flex justify-center">
          <AdsBanner onClose={handleBannerClose} />
        </div>

      </div>
      <div className="text-sm flex justify-center">
        © 2025 U&Me Australia. All rights reserved.
        <span className="ml-2 text-gray-400 mb-2">v0.1.0</span>
      </div>
    </div>
  );
};

export default Footer;