-- ============================================================
-- 015 — Accesorios formalizados, Realtime y políticas faltantes
-- ============================================================
-- 1. Formaliza las tablas accessories / vehicle_accessories (antes solo
--    creadas por scripts/accessories-seed.ts, fuera de las migraciones).
-- 2. Añade columna `slug` estable para mapear accesorios a los flags
--    de bookings (needs_child_seat, etc.) sin depender del nombre.
-- 3. Habilita Realtime para bookings y booking_assignments — sin esto
--    la pantalla de reserva del cliente NO recibe la matrícula en vivo.
-- 4. Política RLS para que el cliente pueda leer la asignación de su
--    propia reserva (necesario para el payload de Realtime).
-- ============================================================

-- 1. Tablas (idempotente por si el script ya las creó)
CREATE TABLE IF NOT EXISTS accessories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicle_accessories (
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  accessory_id UUID NOT NULL REFERENCES accessories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (vehicle_id, accessory_id)
);

-- 2. Slug estable
ALTER TABLE accessories ADD COLUMN IF NOT EXISTS slug TEXT;

UPDATE accessories SET slug = CASE
  WHEN name ILIKE '%silla%'                THEN 'child_seat'
  WHEN name ILIKE '%mascota%'              THEN 'pet_friendly'
  WHEN name ILIKE '%pmr%' OR name ILIKE '%accesible%' THEN 'accessible'
  WHEN name ILIKE '%grande%'               THEN 'large_vehicle'
  WHEN name ILIKE '%wifi%'                 THEN 'wifi'
  WHEN name ILIKE '%agua%'                 THEN 'water'
  WHEN name ILIKE '%usb%' OR name ILIKE '%cargador%' THEN 'usb_charger'
  WHEN name ILIKE '%tarjeta%'              THEN 'card_payment'
  WHEN name ILIKE '%equipaje%'             THEN 'extra_luggage'
  ELSE lower(regexp_replace(name, '[^a-zA-Z0-9]+', '_', 'g'))
END
WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS accessories_slug_key ON accessories (slug);

-- Seed (no-op si ya existen gracias al índice único de slug)
INSERT INTO accessories (name, icon, description, slug) VALUES
  ('Silla Bebé', 'tabler:armchair', 'Silla de retención infantil', 'child_seat'),
  ('Mascotas', 'tabler:paw', 'Se aceptan mascotas', 'pet_friendly'),
  ('Accesible PMR', 'tabler:wheelchair', 'Vehículo adaptado para silla de ruedas', 'accessible'),
  ('Vehículo Grande', 'tabler:car', 'Furgoneta o vehículo de gran capacidad', 'large_vehicle'),
  ('WiFi', 'tabler:wifi', 'Conexión WiFi a bordo', 'wifi'),
  ('Agua', 'tabler:bottle', 'Botella de agua de cortesía', 'water'),
  ('Cargador USB', 'tabler:usb', 'Carga USB disponible', 'usb_charger'),
  ('Pago con Tarjeta', 'tabler:credit-card', 'Datáfono a bordo', 'card_payment'),
  ('Espacio Extra Equipaje', 'tabler:luggage', 'Capacidad extra de maletero', 'extra_luggage')
ON CONFLICT (slug) DO NOTHING;

-- RLS de accesorios: lectura pública de activos, escritura solo service role
ALTER TABLE accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_accessories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accessories_read_active" ON accessories;
CREATE POLICY "accessories_read_active" ON accessories
  FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "vehicle_accessories_driver" ON vehicle_accessories;
CREATE POLICY "vehicle_accessories_driver" ON vehicle_accessories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM vehicles v
      WHERE v.id = vehicle_accessories.vehicle_id AND v.driver_id = auth.uid()
    )
  );

-- 3. Realtime: publicar cambios de bookings y booking_assignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'booking_assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE booking_assignments;
  END IF;
END $$;

-- Realtime necesita REPLICA IDENTITY FULL para filtrar por columnas en UPDATE
ALTER TABLE bookings REPLICA IDENTITY FULL;
ALTER TABLE booking_assignments REPLICA IDENTITY FULL;

-- 4. El cliente puede leer la asignación de SU reserva
--    (imprescindible para recibir confirmed_plate / confirmed_phone por Realtime)
DROP POLICY IF EXISTS "clients_read_own_assignment" ON booking_assignments;
CREATE POLICY "clients_read_own_assignment" ON booking_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_assignments.booking_id AND b.client_id = auth.uid()
    )
  );
