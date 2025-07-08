import React from 'react';
import { SettingGroup } from './SettingGroup';
import { useLanguage } from '../../contexts/LanguageContext';

const SystemSettings = ({ settings, onSave }) => {
  const { t } = useLanguage();
  
  return (
    <SettingGroup
      title={t('settings.systemSettingsTitle')}
      settings={settings}
      onSave={onSave}
    />
  );
};

export default SystemSettings;