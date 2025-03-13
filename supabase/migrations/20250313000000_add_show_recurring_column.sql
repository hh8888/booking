-- Add show_recurring column to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS show_recurring BOOLEAN DEFAULT false;

-- Add comment to the column
COMMENT ON COLUMN bookings.show_recurring IS 'Flag to indicate if this booking should show recurring options';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_show_recurring ON bookings(show_recurring);