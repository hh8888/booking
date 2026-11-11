// Shared stand-in for contexts/LanguageContext in tests: t() returns the key.
// Use with: jest.mock('./contexts/LanguageContext', () => require('./testUtils/mockLanguage'));
const t = (key) => key;
const value = { t, language: 'en', setLanguage: () => {}, isLoading: false };

module.exports = {
  useLanguage: () => value,
  LanguageProvider: ({ children }) => children,
};
