-- 003_seed_stations.sql
-- Initial stations for Asturias MVP

INSERT INTO stations (name, city, address, lat, lng) VALUES
  ('Aeropuerto de Asturias', 'Castrillón', 'AS-19, 33459 Castrillón', 43.5584, -6.0340),
  ('Pravia', 'Pravia', 'Calle Mayor, Pravia', 43.4986, -6.1086),
  ('Avilés (RENFE)', 'Avilés', 'Pl. de la Estación, Avilés', 43.5537, -5.9232),
  ('Gijón (FEVE)', 'Gijón', 'Calle Sanz Crespo, Gijón', 43.5321, -5.6636);

-- Initial system config
INSERT INTO system_config (key, value) VALUES
  ('min_advance_hours', '2'),
  ('commission_member_pct', '10'),
  ('commission_non_member_pct', '12'),
  ('membership_monthly_fee', '20.00'),
  ('max_cancel_hours_before', '24');
