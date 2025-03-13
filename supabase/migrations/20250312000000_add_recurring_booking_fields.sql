-- Add recurring booking fields to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS recurring_parent_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS recurring_type VARCHAR(20) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS recurring_count INTEGER DEFAULT 0;

-- Add index for better query performance on recurring bookings
CREATE INDEX IF NOT EXISTS idx_bookings_recurring_parent_id ON bookings(recurring_parent_id);

-- Add comment to the columns
COMMENT ON COLUMN bookings.recurring_parent_id IS 'Reference to the parent booking in a recurring series';
COMMENT ON COLUMN bookings.recurring_type IS 'Type of recurrence (none, daily, weekly, monthly)';
COMMENT ON COLUMN bookings.recurring_count IS 'Number of recurrences in the series';