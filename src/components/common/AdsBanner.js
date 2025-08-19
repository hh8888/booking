// To implement actual Google AdSense:

// 1. 1.
//    Replace ca-pub-XXXXXXXXXXXXXXXX with your actual AdSense publisher ID
// 2. 2.
//    Replace XXXXXXXXXX with your ad unit ID
// 3. 3.
//    Replace the placeholder div with the actual Google AdSense script:
   
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const AdsBanner = ({ onClose }) => {
  const { t } = useLanguage();
  // const [isVisible, setIsVisible] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  // Set banner as not closed when component loads
  useEffect(() => {
    localStorage.setItem('adsBannerClosed', 'false');
  }, []);

  // Check screen size on mount and resize
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('adsBannerClosed', 'true');
    // Notify parent component about the close event
    if (onClose) {
      onClose();
    }
  };

  // Don't show banner if screen is smaller than 728px or if closed
  if (!isVisible || screenWidth < 728) {
    return null;
  }

  return (
    <div 
      className="ads-banner relative border border-gray-300 rounded-lg mx-auto bg-white"
      style={{ width: '728px', height: '90px' }}
    >
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-1 right-1 z-10 text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded"
        title="Close"
        style={{ fontSize: '12px' }}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Google AdSense container */}
      <div 
        className="google-ad-container w-full h-full flex items-center justify-center"
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // Replace with your AdSense publisher ID
        data-ad-slot="XXXXXXXXXX" // Replace with your ad unit ID
        data-ad-format="horizontal"
        data-full-width-responsive="false"
      >
        {/* Placeholder content - Replace this entire div with Google AdSense script */}
        <div className="w-full h-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="text-sm font-medium mb-1">Google Ad Placeholder</div>
            <div className="text-xs">728 x 90 Leaderboard</div>
            <div className="text-xs mt-1 text-gray-400">Replace with AdSense code</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdsBanner;