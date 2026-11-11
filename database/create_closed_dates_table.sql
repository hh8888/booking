-- Dates on which the business (or one location) is closed and takes no bookings.
-- Used by src/services/ClosedDatesService.js.
-- Run this once in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS closed_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  reason TEXT,
  location SMALLINT,              -- same type as bookings.location; NULL = all locations
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_closed_dates_date ON closed_dates(date);
CREATE INDEX IF NOT EXISTS idx_closed_dates_location_date ON closed_dates(location, date);

ALTER TABLE closed_dates ENABLE ROW LEVEL SECURITY;

-- Everyone (including customers making a booking) can see which dates are closed
CREATE POLICY "Anyone can read closed dates" ON closed_dates
  FOR SELECT USING (true);

-- Only admins and managers can add, change or remove closed dates
CREATE POLICY "Admins can manage closed dates" ON closed_dates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role IN ('admin', 'manager')
    )
  );
