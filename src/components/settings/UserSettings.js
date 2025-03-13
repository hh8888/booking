import React from 'react';
import { SettingGroup } from './SettingGroup';

const UserSettings = ({ settings, onSave }) => {
  return (
    <SettingGroup
      title="User Settings"
      settings={settings}
      onSave={onSave}
    />
  );
};

export default UserSettings;