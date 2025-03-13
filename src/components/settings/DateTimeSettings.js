import React from 'react';
import { SettingGroup } from './SettingGroup';

const DateTimeSettings = ({ settings, onSave }) => {
  return (
    <SettingGroup
      title="Date & Time Settings"
      settings={settings}
      onSave={onSave}
    />
  );
};

export default DateTimeSettings;