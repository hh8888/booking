import React from 'react';
import { SettingGroup } from './SettingGroup';

const SystemSettings = ({ settings, onSave }) => {
  return (
    <SettingGroup
      title="System Settings"
      settings={settings}
      onSave={onSave}
    />
  );
};

export default SystemSettings;