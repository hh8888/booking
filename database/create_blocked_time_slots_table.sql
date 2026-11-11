CREATE TABLE blocked_time_slots (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_blocked_time_slots_staff_date ON blocked_time_slots(staff_id, blocked_date);
CREATE INDEX idx_blocked_time_slots_date_range ON blocked_time_slots(blocked_date, start_time, end_time);

-- Add constraint to ensure end_time is after start_time
ALTER TABLE blocked_time_slots ADD CONSTRAINT check_time_range CHECK (end_time > start_time);

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE blocked_time_slots ENABLE ROW LEVEL SECURITY;

-- Policy: Staff can only see and manage their own blocked slots
CREATE POLICY "Staff can manage own blocked slots" ON blocked_time_slots
  FOR ALL USING (auth.uid()::text = staff_id::text);

-- Policy: Admins and managers can see all blocked slots
CREATE POLICY "Admins can manage all blocked slots" ON blocked_time_slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role IN ('admin', 'manager')
    )
  );