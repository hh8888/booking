import React from 'react';
import { SettingGroup } from './SettingGroup';

const CustomerDashboardSettings = ({ settings, onSave }) => {
  return (
    <SettingGroup
      title="Customer Dashboard Settings"
      settings={settings}
      onSave={onSave}
    />
  );
};

export default CustomerDashboardSettings;