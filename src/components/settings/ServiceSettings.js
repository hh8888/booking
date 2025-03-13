import React from 'react';
import { SettingGroup } from './SettingGroup';

const ServiceSettings = ({ settings, onSave }) => {
  return (
    <SettingGroup
      title="Service Settings"
      settings={settings}
      onSave={onSave}
    />
  );
};

export default ServiceSettings;