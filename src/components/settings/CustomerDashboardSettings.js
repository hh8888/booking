import React from 'react';
import { SettingGroup } from './SettingGroup';
import { useLanguage } from '../../contexts/LanguageContext';

const CustomerDashboardSettings = ({ settings, onSave }) => {
  const { t } = useLanguage();
  
  return (
    <SettingGroup
      title={t('settings.customerDashboardSettingsTitle')}
      settings={settings}
      onSave={onSave}
    />
  );
};

export default CustomerDashboardSettings;