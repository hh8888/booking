INSERT INTO settings (category, key, value)
VALUES ('booking', 'showStaffName', 'true')
ON CONFLICT (category, key)
DO UPDATE SET value = EXCLUDED.value;