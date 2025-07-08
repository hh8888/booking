import React from 'react';
import { SettingGroup } from './SettingGroup';
import { useLanguage } from '../../contexts/LanguageContext';

const WorkingHoursSettings = ({ settings, onSave }) => {
  const { t } = useLanguage();
  
  return (
    <SettingGroup
      title={t('settings.workingHoursTitle')}
      settings={settings}
      onSave={onSave}
    />
  );
};

export default WorkingHoursSettings;