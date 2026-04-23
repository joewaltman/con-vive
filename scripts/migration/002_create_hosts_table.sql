-- Create hosts table
CREATE TABLE hosts (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  notes TEXT,
  max_guests INTEGER DEFAULT 8,
  guest_id INTEGER REFERENCES guests(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for guest lookup
CREATE INDEX idx_hosts_guest_id ON hosts(guest_id);
CREATE INDEX idx_hosts_active ON hosts(active);
