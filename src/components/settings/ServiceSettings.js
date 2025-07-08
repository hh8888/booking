import React from 'react';
import { SettingGroup } from './SettingGroup';
import { useLanguage } from '../../contexts/LanguageContext';

const ServiceSettings = ({ settings, onSave }) => {
  const { t } = useLanguage();
  
  return (
    <SettingGroup
      title={t('settings.serviceSettingsTitle')}
      settings={settings}
      onSave={onSave}
    />
  );
};

export default ServiceSettings;