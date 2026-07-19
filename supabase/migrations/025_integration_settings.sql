-- ============================================================
-- 025 — Configuración de integraciones desde el panel admin
-- ============================================================
-- Claves de Stripe / Resend / Twilio gestionables desde la UI.
-- NO van en system_config porque esa tabla es de lectura pública
-- (RLS TRUE + /api/config). Esta tabla tiene RLS sin políticas:
-- solo el service role (servidor) puede leerla o escribirla.
-- Los valores de esta tabla tienen prioridad sobre las variables
-- de entorno; si no existen, se usa el .env como hasta ahora.
-- ============================================================

CREATE TABLE IF NOT EXISTS integration_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;
-- Sin políticas a propósito: solo accesible con service role.

COMMENT ON TABLE integration_settings IS 'Claves de integraciones (stripe_secret_key, stripe_publishable_key, stripe_webhook_secret, resend_api_key, email_from, twilio_account_sid, twilio_auth_token, twilio_phone_number). Prioridad sobre env.';
