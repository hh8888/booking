import React from 'react';
import { SettingGroup } from './SettingGroup';
import { useLanguage } from '../../contexts/LanguageContext';

const UserSettings = ({ settings, onSave }) => {
  const { t } = useLanguage();
  
  return (
    <SettingGroup
      title={t('settings.userSettingsTitle')}
      settings={settings}
      onSave={onSave}
    />
  );
};

export default UserSettings;