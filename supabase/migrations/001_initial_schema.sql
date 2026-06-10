-- 001_initial_schema.sql
-- Club Taxis Asturias - Initial Database Schema

-- Users table (extends auth.users)
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  phone       TEXT,
  full_name   TEXT,
  role        TEXT NOT NULL CHECK (role IN ('client','driver','admin')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Drivers table
CREATE TABLE drivers (
  id                UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  license_number    TEXT UNIQUE NOT NULL,
  license_city      TEXT NOT NULL,
  is_member         BOOLEAN DEFAULT FALSE,
  member_since      DATE,
  is_exempt         BOOLEAN DEFAULT FALSE,
  is_active         BOOLEAN DEFAULT TRUE,
  last_assigned_at  TIMESTAMPTZ,
  stripe_account_id TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles table
CREATE TABLE vehicles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id         UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  plate             TEXT NOT NULL,
  brand             TEXT NOT NULL,
  model             TEXT NOT NULL,
  year              INT,
  color             TEXT,
  max_passengers    INT NOT NULL DEFAULT 4,
  max_luggage_big   INT NOT NULL DEFAULT 2,
  max_luggage_hand  INT NOT NULL DEFAULT 4,
  has_child_seat    BOOLEAN DEFAULT FALSE,
  has_pet_friendly  BOOLEAN DEFAULT FALSE,
  is_accessible     BOOLEAN DEFAULT FALSE,
  is_large_vehicle  BOOLEAN DEFAULT FALSE,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Stations table
CREATE TABLE stations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  city        TEXT NOT NULL,
  address     TEXT,
  lat         DECIMAL(9,6),
  lng         DECIMAL(9,6),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Driver-Stations relationship
CREATE TABLE driver_stations (
  driver_id   UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  station_id  UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  is_active   BOOLEAN DEFAULT TRUE,
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (driver_id, station_id)
);

CREATE INDEX idx_driver_stations_station ON driver_stations(station_id) WHERE is_active = TRUE;

-- Driver availability
CREATE TABLE driver_availability (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id   UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  hour_from   TIME,
  hour_to     TIME,
  UNIQUE(driver_id, date)
);

-- Bookings table
CREATE TABLE bookings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             UUID NOT NULL REFERENCES users(id),
  origin_station_id     UUID NOT NULL REFERENCES stations(id),
  destination_address   TEXT NOT NULL,
  destination_lat       DECIMAL(9,6),
  destination_lng       DECIMAL(9,6),
  destination_station_id UUID REFERENCES stations(id),
  pickup_at             TIMESTAMPTZ NOT NULL,
  passengers            INT NOT NULL DEFAULT 1,
  luggage_big           INT NOT NULL DEFAULT 0,
  luggage_hand          INT NOT NULL DEFAULT 0,
  needs_child_seat      BOOLEAN DEFAULT FALSE,
  needs_pet_friendly    BOOLEAN DEFAULT FALSE,
  needs_accessible      BOOLEAN DEFAULT FALSE,
  needs_large_vehicle   BOOLEAN DEFAULT FALSE,
  base_price            DECIMAL(8,2) NOT NULL,
  total_price           DECIMAL(8,2) NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','confirmed','completed','cancelled')),
  cancelled_at          TIMESTAMPTZ,
  cancelled_by          UUID REFERENCES users(id),
  cancellation_reason   TEXT,
  stripe_payment_intent_id TEXT UNIQUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_client ON bookings(client_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_pickup ON bookings(pickup_at);

-- Booking assignments
CREATE TABLE booking_assignments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id            UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  driver_id             UUID NOT NULL REFERENCES drivers(id),
  assigned_at           TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at          TIMESTAMPTZ,
  confirmed_plate       TEXT,
  confirmed_phone       TEXT,
  substitute_plate      TEXT,
  substitute_phone      TEXT,
  has_substitute        BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_ba_driver ON booking_assignments(driver_id);
CREATE INDEX idx_ba_booking ON booking_assignments(booking_id);

-- Return offers
CREATE TABLE return_offers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id             UUID NOT NULL REFERENCES drivers(id),
  origin_booking_id     UUID REFERENCES bookings(id),
  origin_address        TEXT NOT NULL,
  origin_lat            DECIMAL(9,6),
  origin_lng            DECIMAL(9,6),
  destination_station_id UUID NOT NULL REFERENCES stations(id),
  available_from        TIMESTAMPTZ NOT NULL,
  available_until       TIMESTAMPTZ NOT NULL,
  max_passengers        INT NOT NULL DEFAULT 4,
  discount_pct          INT NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 40),
  base_price            DECIMAL(8,2) NOT NULL,
  final_price           DECIMAL(8,2) NOT NULL,
  status                TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','booked','expired','cancelled')),
  booked_by_id          UUID REFERENCES bookings(id),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ro_status ON return_offers(status) WHERE status = 'active';
CREATE INDEX idx_ro_until ON return_offers(available_until);

-- Memberships
CREATE TABLE memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id       UUID NOT NULL REFERENCES drivers(id),
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  amount          DECIMAL(6,2) NOT NULL,
  is_exempt       BOOLEAN DEFAULT FALSE,
  stripe_invoice_id TEXT,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Driver payouts
CREATE TABLE driver_payouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id       UUID NOT NULL REFERENCES drivers(id),
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  gross_amount    DECIMAL(10,2) NOT NULL,
  commission_pct  DECIMAL(5,2) NOT NULL,
  commission_amt  DECIMAL(10,2) NOT NULL,
  net_amount      DECIMAL(10,2) NOT NULL,
  membership_fee  DECIMAL(6,2) DEFAULT 0,
  final_payout    DECIMAL(10,2) NOT NULL,
  stripe_payout_id TEXT,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- System config
CREATE TABLE system_config (
  key    TEXT PRIMARY KEY,
  value  JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Route prices
CREATE TABLE route_prices (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_station_id     UUID REFERENCES stations(id),
  destination_station_id UUID REFERENCES stations(id),
  base_price            DECIMAL(8,2) NOT NULL,
  is_return             BOOLEAN DEFAULT FALSE,
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(origin_station_id, destination_station_id)
);
