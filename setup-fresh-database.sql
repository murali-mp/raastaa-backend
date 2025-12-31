-- Complete setup script for fresh "raastaa" database
-- Run this entire script in your psql console connected to the "raastaa" database

-- Step 1: Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: You need to run migrations first
-- Exit psql and run this in DigitalOcean App Console:
-- npx prisma db push

-- After migrations create the tables, come back here and run the rest:

-- Step 3: Insert Locations
INSERT INTO locations (id, latitude, longitude, city, area, full_address)
VALUES
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, 12.9425, 77.5748, 'Bangalore', 'VV Puram', 'VV Puram Food Street, Gandhi Bazaar, Bangalore 560004'),
  ('550e8400-e29b-41d4-a716-446655440002'::uuid, 12.9428, 77.5745, 'Bangalore', 'VV Puram', 'VV Puram Food Street, Gandhi Bazaar, Bangalore 560004'),
  ('550e8400-e29b-41d4-a716-446655440003'::uuid, 12.9352, 77.6245, 'Bangalore', 'Koramangala', '14th Main Road, Koramangala 4th Block, Bangalore 560034'),
  ('550e8400-e29b-41d4-a716-446655440004'::uuid, 12.9349, 77.6193, 'Bangalore', 'Koramangala', '80 Feet Road, Koramangala 5th Block, Bangalore 560095'),
  ('550e8400-e29b-41d4-a716-446655440005'::uuid, 12.9716, 77.6412, 'Bangalore', 'Indiranagar', '16th Main Road, Indiranagar, Bangalore 560038'),
  ('550e8400-e29b-41d4-a716-446655440006'::uuid, 12.9753, 77.6044, 'Bangalore', 'MG Road', '39 St Marks Road, near Church Street, Bangalore 560001'),
  ('550e8400-e29b-41d4-a716-446655440007'::uuid, 12.9769, 77.6071, 'Bangalore', 'Residency Road', '5th Cross, Residency Road, Bangalore 560025'),
  ('550e8400-e29b-41d4-a716-446655440008'::uuid, 12.9450, 77.5730, 'Bangalore', 'Basavanagudi', '32 Gandhi Bazaar Main Rd, Basavanagudi, Bangalore 560004'),
  ('550e8400-e29b-41d4-a716-446655440009'::uuid, 12.9404, 77.5828, 'Bangalore', 'Hanumanthnagar', 'Hanumanthnagar, near Lalbagh, Bangalore 560019'),
  ('550e8400-e29b-41d4-a716-446655440010'::uuid, 12.9718, 77.6022, 'Bangalore', 'Brigade Road', 'Brigade Road, Bangalore 560025'),
  ('550e8400-e29b-41d4-a716-446655440011'::uuid, 13.0006, 77.5707, 'Bangalore', 'Malleshwaram', 'Sampige Road, Malleshwaram, Bangalore 560003'),
  ('550e8400-e29b-41d4-a716-446655440012'::uuid, 12.9121, 77.6446, 'Bangalore', 'HSR Layout', '27th Main Road, HSR Layout, Bangalore 560102'),
  ('550e8400-e29b-41d4-a716-446655440013'::uuid, 12.9698, 77.7499, 'Bangalore', 'Whitefield', 'Whitefield Main Road, Bangalore 560066'),
  ('550e8400-e29b-41d4-a716-446655440014'::uuid, 12.9251, 77.5486, 'Bangalore', 'Banashankari', 'Kanakapura Road, Banashankari, Bangalore 560070'),
  ('550e8400-e29b-41d4-a716-446655440015'::uuid, 12.8456, 77.6603, 'Bangalore', 'Electronic City', 'Hosur Road, Electronic City, Bangalore 560100')
ON CONFLICT (id) DO NOTHING;

-- Step 4: Insert Vendors
INSERT INTO vendors (id, location_id, name, description, price_band, is_verified, status, popularity_score, created_at, updated_at)
VALUES
  ('660e8400-e29b-41d4-a716-446655440001'::uuid, '550e8400-e29b-41d4-a716-446655440001'::uuid, 
   'Sri Raghavendra Sweets & Snacks', 
   'Famous for fresh jalebis, hot vadas, and traditional Karnataka snacks', 
   '$', true, 'active', 85.5, NOW(), NOW()),
   
  ('660e8400-e29b-41d4-a716-446655440002'::uuid, '550e8400-e29b-41d4-a716-446655440002'::uuid, 
   'Siddappa Donne Biryani', 
   'Authentic mutton and chicken biryani in traditional donne', 
   '$', true, 'active', 92.3, NOW(), NOW()),
   
  ('660e8400-e29b-41d4-a716-446655440003'::uuid, '550e8400-e29b-41d4-a716-446655440003'::uuid, 
   'Veena Stores', 
   'Legendary masala dosa and filter coffee since 1948', 
   '$', true, 'active', 94.7, NOW(), NOW()),
   
  ('660e8400-e29b-41d4-a716-446655440004'::uuid, '550e8400-e29b-41d4-a716-446655440004'::uuid, 
   'Truffles', 
   'Popular burgers, shakes, and American comfort food', 
   '$$', true, 'active', 88.2, NOW(), NOW()),
   
  ('660e8400-e29b-41d4-a716-446655440005'::uuid, '550e8400-e29b-41d4-a716-446655440005'::uuid, 
   'Hole in the Wall Cafe', 
   'Cozy cafe with pancakes, eggs benedict, and great coffee', 
   '$$', true, 'active', 87.6, NOW(), NOW()),
   
  ('660e8400-e29b-41d4-a716-446655440006'::uuid, '550e8400-e29b-41d4-a716-446655440006'::uuid, 
   'Koshys', 
   'Historic restaurant serving Continental and Indian since 1940', 
   '$$', true, 'active', 89.4, NOW(), NOW()),
   
  ('660e8400-e29b-41d4-a716-446655440007'::uuid, '550e8400-e29b-41d4-a716-446655440007'::uuid, 
   'Shivaji Military Hotel', 
   'Authentic Karnataka non-veg meals with amazing mutton curry', 
   '$', true, 'active', 91.8, NOW(), NOW()),
   
  ('660e8400-e29b-41d4-a716-446655440008'::uuid, '550e8400-e29b-41d4-a716-446655440008'::uuid, 
   'Vidyarthi Bhavan', 
   'Iconic crispy masala dosa and traditional South Indian breakfast', 
   '$', true, 'active', 95.2, NOW(), NOW()),
   
  ('660e8400-e29b-41d4-a716-446655440009'::uuid, '550e8400-e29b-41d4-a716-446655440009'::uuid, 
   'Brahmins Coffee Bar', 
   'Legendary idli, vada, and filter coffee since 1965', 
   '$', true, 'active', 96.1, NOW(), NOW()),
   
  ('660e8400-e29b-41d4-a716-446655440010'::uuid, '550e8400-e29b-41d4-a716-446655440010'::uuid, 
   'Empire Restaurant', 
   'Famous Mughlai food, especially biryanis and kebabs', 
   '$$', true, 'active', 90.5, NOW(), NOW()),
   
  ('660e8400-e29b-41d4-a716-446655440011'::uuid, '550e8400-e29b-41d4-a716-446655440011'::uuid, 
   'CTR (Central Tiffin Room)', 
   'Historic spot famous for benne masala dosa (butter dosa)', 
   '$', true, 'active', 93.7, NOW(), NOW()),
   
  ('660e8400-e29b-41d4-a716-446655440012'::uuid, '550e8400-e29b-41d4-a716-446655440012'::uuid, 
   'Meghana Foods', 
   'Andhra-style biryani and spicy curries', 
   '$$', true, 'active', 88.9, NOW(), NOW()),
   
  ('660e8400-e29b-41d4-a716-446655440013'::uuid, '550e8400-e29b-41d4-a716-446655440013'::uuid, 
   'Nagarjuna', 
   'Authentic Andhra cuisine with gongura mutton and biryani', 
   '$$', true, 'active', 90.1, NOW(), NOW()),
   
  ('660e8400-e29b-41d4-a716-446655440014'::uuid, '550e8400-e29b-41d4-a716-446655440014'::uuid, 
   'Punjabi Dhaba', 
   'North Indian street food, butter chicken, and parathas', 
   '$', true, 'active', 84.3, NOW(), NOW()),
   
  ('660e8400-e29b-41d4-a716-446655440015'::uuid, '550e8400-e29b-41d4-a716-446655440015'::uuid, 
   'A2B (Adyar Ananda Bhavan)', 
   'South Indian vegetarian restaurant, sweets and snacks', 
   '$', true, 'active', 87.2, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT COUNT(*) as total_locations FROM locations;
SELECT COUNT(*) as total_vendors FROM vendors;
SELECT name, city FROM locations ORDER BY city, name;
