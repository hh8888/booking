import React from 'react';
import { SettingGroup } from './SettingGroup';

const BookingSettings = ({ settings, onSave }) => {
  return (
    <SettingGroup
      title="Booking Settings"
      settings={settings}
      onSave={onSave}
    />
  );
};

export default BookingSettings;