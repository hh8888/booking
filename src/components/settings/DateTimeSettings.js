import React from 'react';
import { SettingGroup } from './SettingGroup';
import { useLanguage } from '../../contexts/LanguageContext';

const DateTimeSettings = ({ settings, onSave }) => {
  const { t } = useLanguage();
  
  return (
    <SettingGroup
      title={t('settings.dateTimeSettingsTitle')}
      settings={settings}
      onSave={onSave}
    />
  );
};

export default DateTimeSettings;