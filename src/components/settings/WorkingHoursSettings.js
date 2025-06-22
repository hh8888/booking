import React from 'react';
import { SettingGroup } from './SettingGroup';

const WorkingHoursSettings = ({ settings, onSave }) => {
  return (
    <SettingGroup
      title="Working Hours"
      settings={settings}
      onSave={onSave}
    />
  );
};

export default WorkingHoursSettings;