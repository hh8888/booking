import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Get language from localStorage or default to English
    return localStorage.getItem('language') || 'en';
  });

  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Load translations when language changes
  useEffect(() => {
    const loadTranslations = async () => {
      setIsLoading(true);
      try {
        const translationModule = await import(`../translations/${language}.js`);
        setTranslations(translationModule.default);
      } catch (error) {
        console.error(`Failed to load translations for ${language}:`, error);
        // Fallback to English if translation fails
        if (language !== 'en') {
          const fallbackModule = await import('../translations/en.js');
          setTranslations(fallbackModule.default);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadTranslations();
  }, [language]);

  const changeLanguage = (newLanguage) => {
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  const t = (key, params = {}) => {
    // If translations are still loading, return the key to avoid console warnings
    if (isLoading || !translations || Object.keys(translations).length === 0) {
      return key;
    }
    
    try {
      const keys = key.split('.');
      let value = translations;
      
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          // Only log warning if not loading and translations are available
          if (!isLoading && translations && Object.keys(translations).length > 0) {
            console.warn(`Translation key not found: ${key}. Available keys at this level:`, Object.keys(value || {}));
          }
          return key; // Return the key if translation not found
        }
      }
      
      // Replace parameters in the translation
      if (typeof value === 'string' && Object.keys(params).length > 0) {
        return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
          return params[paramKey] || match;
        });
      }
      
      return value || key;
    } catch (error) {
      console.error(`Error in translation function for key '${key}':`, error);
      return key;
    }
  };

  const value = {
    language,
    changeLanguage,
    t,
    translations,
    isLoading
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};