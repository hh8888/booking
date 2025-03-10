-- Create a junction table for the many-to-many relationship between services and staff users
CREATE TABLE IF NOT EXISTS service_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(service_id, staff_id) -- Prevent duplicate assignments
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_service_staff_service_id ON service_staff(service_id);
CREATE INDEX IF NOT EXISTS idx_service_staff_staff_id ON service_staff(staff_id);

-- Add comment to the table
COMMENT ON TABLE service_staff IS 'Junction table for many-to-many relationship between services and staff users';