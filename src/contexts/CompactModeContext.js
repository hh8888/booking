import React, { createContext, useContext, useState, useEffect } from 'react';

const CompactModeContext = createContext();

export const useCompactMode = () => {
  const context = useContext(CompactModeContext);
  if (!context) {
    throw new Error('useCompactMode must be used within a CompactModeProvider');
  }
  return context;
};

export const CompactModeProvider = ({ children }) => {
  const [isCompactMode, setIsCompactMode] = useState(() => {
    // Get compact mode preference from localStorage or default to false
    return localStorage.getItem('compactMode') === 'true';
  });

  // Apply compact mode class to body when state changes
  useEffect(() => {
    if (isCompactMode) {
      document.body.classList.add('compact-mode');
    } else {
      document.body.classList.remove('compact-mode');
    }
  }, [isCompactMode]);

  const toggleCompactMode = () => {
    const newMode = !isCompactMode;
    setIsCompactMode(newMode);
    localStorage.setItem('compactMode', newMode.toString());
  };

  return (
    <CompactModeContext.Provider value={{ isCompactMode, toggleCompactMode }}>
      {children}
    </CompactModeContext.Provider>
  );
};