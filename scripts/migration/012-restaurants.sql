-- Create restaurants table
CREATE TABLE restaurants (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  phone TEXT,
  website TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_restaurants_active ON restaurants(active);

-- Add venue columns to dinners
ALTER TABLE dinners
  ADD COLUMN venue_type TEXT DEFAULT 'home' CHECK (venue_type IN ('home', 'restaurant')),
  ADD COLUMN restaurant_id INTEGER REFERENCES restaurants(id);

CREATE INDEX idx_dinners_restaurant_id ON dinners(restaurant_id);
