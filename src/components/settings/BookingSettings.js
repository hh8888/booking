import React from 'react';
import { SettingGroup } from './SettingGroup';
import { useLanguage } from '../../contexts/LanguageContext';

const BookingSettings = ({ settings, onSave }) => {
  const { t } = useLanguage();
  
  return (
    <SettingGroup
      title={t('settings.bookingSettingsTitle')}
      settings={settings}
      onSave={onSave}
    />
  );
};

export default BookingSettings;