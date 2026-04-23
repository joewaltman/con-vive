-- Add host_id foreign key to dinners table
ALTER TABLE dinners ADD COLUMN host_id INTEGER REFERENCES hosts(id);

-- Add start_time column with default of 6:00 PM
ALTER TABLE dinners ADD COLUMN start_time TIME DEFAULT '18:00';

-- Create index for host lookup
CREATE INDEX idx_dinners_host_id ON dinners(host_id);
