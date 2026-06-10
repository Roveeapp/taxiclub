# others.md — Infraestructura, Operaciones y Lanzamiento
> Club Taxis Asturias · v1.0

---

## 1. Estructura del Proyecto (Nuxt 3)

```
club-taxis/
├── app/
│   ├── pages/
│   │   ├── index.vue                  # Home + búsqueda
│   │   ├── reserva/[id].vue           # Detalle de reserva (cliente)
│   │   ├── ultima-hora/
│   │   │   ├── index.vue
│   │   │   └── [id].vue
│   │   ├── cuenta/
│   │   │   ├── index.vue
│   │   │   └── login.vue
│   │   ├── taxista/
│   │   │   ├── index.vue              # Dashboard taxista
│   │   │   ├── reservas/
│   │   │   │   ├── index.vue
│   │   │   │   └── [id].vue
│   │   │   ├── disponibilidad.vue
│   │   │   ├── vehiculos/
│   │   │   │   ├── index.vue
│   │   │   │   └── [id].vue
│   │   │   ├── ofertas/
│   │   │   │   ├── index.vue
│   │   │   │   └── nueva.vue
│   │   │   ├── cuenta.vue
│   │   │   ├── liquidaciones.vue
│   │   │   └── onboarding/[step].vue
│   │   └── admin/
│   │       ├── index.vue
│   │       ├── conductores/[id].vue
│   │       ├── reservas/[id].vue
│   │       ├── paradas.vue
│   │       ├── liquidaciones.vue
│   │       └── configuracion.vue
│   ├── components/
│   │   ├── ui/                        # Componentes genéricos
│   │   ├── booking/                   # Componentes de reserva
│   │   ├── offer/                     # Componentes de oferta
│   │   ├── driver/                    # Componentes del taxista
│   │   └── layout/                    # Header, nav, sidebar
│   ├── composables/
│   │   ├── useBookingRealtime.ts
│   │   ├── useAuth.ts
│   │   ├── useDriverAvailability.ts
│   │   └── useSystemConfig.ts
│   ├── stores/
│   │   ├── auth.ts
│   │   ├── booking.ts
│   │   ├── driver.ts
│   │   └── admin.ts
│   └── assets/
│       ├── css/
│       │   └── main.css
│       └── images/
├── server/
│   ├── api/
│   │   ├── auth/
│   │   ├── bookings/
│   │   ├── payments/
│   │   ├── taxista/
│   │   ├── ofertas/
│   │   ├── admin/
│   │   └── webhooks/
│   ├── services/
│   │   ├── assignment.ts              # Round-robin algorithm
│   │   ├── pricing.ts                 # Cálculo de precios
│   │   ├── payouts.ts                 # Liquidaciones mensuales
│   │   ├── notifications.ts           # Email, SMS, Push
│   │   └── stripe.ts                  # Wrapper Stripe
│   ├── middleware/
│   │   └── auth.ts
│   ├── tasks/
│   │   ├── expire-offers.ts
│   │   ├── remind-unconfirmed.ts
│   │   ├── process-payouts.ts
│   │   └── charge-memberships.ts
│   └── utils/
│       ├── db.ts                      # Drizzle client
│       └── supabase.ts                # Supabase admin client
├── supabase/
│   ├── migrations/                    # SQL migrations numeradas
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   └── 003_seed_stations.sql
│   └── seed.sql                       # Datos iniciales (paradas, config)
├── public/
│   ├── pwa-192.png
│   ├── pwa-512.png
│   └── favicon.ico
├── drizzle/
│   └── schema.ts                      # Definición completa del schema Drizzle
├── nuxt.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
└── .env.example
```

---

## 2. Stack y Dependencias Principales

```json
{
  "dependencies": {
    "nuxt":              "^3.x",
    "vue":               "^3.x",
    "@nuxt/ui":          "^2.x",
    "@nuxtjs/supabase":  "^1.x",
    "drizzle-orm":       "^0.x",
    "postgres":          "^3.x",
    "stripe":            "^14.x",
    "resend":            "^2.x",
    "twilio":            "^4.x",
    "@vueuse/core":      "^10.x",
    "pinia":             "^2.x",
    "v-calendar":        "^3.x",
    "web-push":          "^3.x",
    "@vite-pwa/nuxt":    "^0.x"
  },
  "devDependencies": {
    "drizzle-kit":           "^0.x",
    "vitest":                "^1.x",
    "@nuxt/test-utils":      "^3.x",
    "playwright":            "^1.x",
    "@typescript-eslint/*":  "^6.x",
    "prettier":              "^3.x",
    "husky":                 "^8.x",
    "lint-staged":           "^15.x"
  }
}
```

---

## 3. Infraestructura y Deploy

### Arquitectura de producción

```
┌─────────────────────────────────────────────────────────┐
│                     Vercel Edge                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │            Nuxt 3 (SSR + Nitro)                 │   │
│  │  - Rendering SSR para SEO de la app cliente     │   │
│  │  - API routes (Nitro server functions)          │   │
│  │  - Scheduled tasks (Nitro)                      │   │
│  └─────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    Supabase                             │
│  - PostgreSQL (base de datos principal)                 │
│  - Auth (JWT, magic link, OAuth)                        │
│  - Realtime (WebSocket para estado de reservas)         │
│  - Storage (licencias, documentos)                      │
└─────────────────────────────────────────────────────────┘
```

### Configuración de Vercel

```json
// vercel.json
{
  "buildCommand": "nuxt build",
  "outputDirectory": ".output",
  "framework": "nuxtjs",
  "regions": ["mad1"],
  "env": {
    "NUXT_PUBLIC_APP_URL": "https://clubtaxisasturias.es"
  }
}
```

### Dominios

| Entorno | URL |
|---|---|
| Producción | `https://clubtaxisasturias.es` |
| Panel taxista | `https://clubtaxisasturias.es/taxista` |
| Panel admin | `https://clubtaxisasturias.es/admin` |
| Staging | `https://staging.clubtaxisasturias.es` |

---

## 4. CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:unit
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL_TEST }}
          # ... resto de env de test

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx vercel --token=${{ secrets.VERCEL_TOKEN }} --env=staging

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### Proceso de release

```
develop  →  PR review  →  main  →  deploy automático a producción
              │
              └─ Tests automáticos obligatorios para merge
```

### Migraciones de BD

Las migraciones de Supabase se ejecutan manualmente o via script antes de cada deploy:

```bash
# package.json scripts
"db:generate": "drizzle-kit generate",
"db:migrate":  "drizzle-kit migrate",
"db:push":     "drizzle-kit push",        # Solo para dev
"db:studio":   "drizzle-kit studio"        # UI visual del schema
```

---

## 5. Testing

### Estrategia de testing (pirámide)

```
         ┌──────────────┐
         │   E2E Tests  │  Playwright — flujos críticos completos
         │   (~10 tests)│
         ├──────────────┤
         │ Integration  │  Vitest — endpoints API + lógica de asignación
         │ (~30 tests)  │
         ├──────────────┤
         │  Unit Tests  │  Vitest — servicios, cálculos, transformaciones
         │  (~60 tests) │
         └──────────────┘
```

### Tests unitarios prioritarios

```typescript
// tests/unit/assignment.test.ts

describe('assignDriver', () => {
  it('asigna al conductor con last_assigned_at más antiguo', async () => { ... })
  it('asigna a conductor con NULL last_assigned_at primero', async () => { ... })
  it('incluye conductores de parada destino en el pool', async () => { ... })
  it('excluye conductores sin vehículo compatible', async () => { ... })
  it('excluye conductores con reserva solapada', async () => { ... })
  it('excluye conductores marcados no disponibles', async () => { ... })
  it('lanza NoDriverAvailableError si pool vacío', async () => { ... })
  it('actualiza last_assigned_at tras asignación', async () => { ... })
})

// tests/unit/pricing.test.ts
describe('calculatePrice', () => {
  it('calcula precio base por ruta', async () => { ... })
  it('suma extra por silla de bebé', async () => { ... })
  it('aplica descuento correcto en oferta de retorno', async () => { ... })
})

// tests/unit/payouts.test.ts
describe('calculateMonthlyPayout', () => {
  it('aplica comisión de miembro (10%)', async () => { ... })
  it('aplica comisión de no miembro (12%)', async () => { ... })
  it('descuenta cuota mensual a miembros no exentos', async () => { ... })
  it('no descuenta cuota a miembros exentos', async () => { ... })
})
```

### Tests E2E prioritarios (Playwright)

```typescript
// tests/e2e/booking-flow.spec.ts

test('cliente completa reserva desde aeropuerto', async ({ page }) => {
  await page.goto('/')
  await page.click('[data-testid="from-selector"]')
  await page.click('[data-testid="station-aeropuerto"]')
  await page.fill('[data-testid="to-input"]', 'Oviedo')
  await page.fill('[data-testid="date-input"]', tomorrowDate())
  await page.fill('[data-testid="time-input"]', '10:00')
  await page.click('[data-testid="search-btn"]')
  // ... completar pago con tarjeta de test Stripe
  await expect(page.locator('[data-testid="booking-status"]'))
    .toHaveText('Pendiente de confirmar')
})

test('taxista confirma reserva y cliente ve matrícula', async ({ browser }) => {
  // Abrir sesiones paralelas: cliente + taxista
  const clientCtx = await browser.newContext()
  const driverCtx = await browser.newContext()
  // ...
})

test('oferta de última hora flujo completo', async ({ page }) => { ... })
test('admin cancela reserva y Stripe libera pago', async ({ page }) => { ... })
```

---

## 6. Monitorización y Observabilidad

### Error tracking — Sentry

```typescript
// nuxt.config.ts
sentry: {
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,               // 10% de trazas en prod
  replaysSessionSampleRate: 0.05,      // 5% de sesiones
  replaysOnErrorSampleRate: 1.0,       // 100% en caso de error
}
```

**Alertas críticas configuradas en Sentry:**
- `NoDriverAvailableError` — sin conductores disponibles para una reserva
- `PaymentCaptureError` — fallo al capturar el pago tras completar viaje
- Error en webhook de Stripe (cualquier 5xx)
- Más de 3 fallos de asignación en 1 hora

### Analytics — Plausible

Plausible (privacy-first, sin cookies, compatible con GDPR) para métricas de uso:

```html
<!-- Añadir en app.vue -->
<script defer data-domain="clubtaxisasturias.es" src="https://plausible.io/js/script.js"></script>
```

**Eventos personalizados a trackear:**
- `Búsqueda iniciada` (parada + destino)
- `Reserva completada` (con precio y ruta)
- `Oferta Última Hora vista`
- `Oferta Última Hora reservada`
- `App instalada (PWA)`

### Métricas de negocio (dashboard admin)

El panel admin mostrará en tiempo real:
- Reservas creadas hoy / semana / mes
- Conductores activos ahora
- Tasa de confirmación (% reservas confirmadas / total asignadas)
- Tiempo medio de confirmación
- Ingresos del mes + proyección
- Ofertas de Última Hora activas en este momento

---

## 7. Configuración PWA

```typescript
// nuxt.config.ts
modules: ['@vite-pwa/nuxt'],

pwa: {
  registerType: 'autoUpdate',
  injectRegister: 'auto',
  manifest: {
    name:             'Club Taxis Asturias',
    short_name:       'ClubTaxis',
    description:      'Tu taxi de confianza en Asturias',
    theme_color:      '#0c0c13',
    background_color: '#0c0c13',
    display:          'standalone',
    orientation:      'portrait-primary',
    start_url:        '/',
    lang:             'es',
    icons: [
      { src: '/pwa-192.png',  sizes: '192x192',  type: 'image/png' },
      { src: '/pwa-512.png',  sizes: '512x512',  type: 'image/png' },
      { src: '/pwa-512.png',  sizes: '512x512',  type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    navigateFallback:  '/',
    cleanupOutdatedCaches: true,
    globPatterns:      ['**/*.{js,css,html,png,svg,ico,woff2}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
        handler:    'NetworkFirst',
        options:    { cacheName: 'supabase-cache', expiration: { maxAgeSeconds: 60 } }
      }
    ]
  },
  client: {
    installPrompt: true,
    periodicSyncForUpdates: 3600,
  }
}
```

### Prompt de instalación

Mostrar el prompt de instalación de la PWA de forma inteligente:
- Para **clientes**: tras completar su primera reserva (momento de máxima satisfacción)
- Para **taxistas**: en el onboarding (paso 3 de 4), explicando que las notificaciones push requieren instalar la app

---

## 8. Consideraciones Legales y de Privacidad

### RGPD / LOPD-GDD

El servicio opera en España, bajo legislación europea. Requerimientos:

- [ ] **Aviso de privacidad** completo en la web
- [ ] **Política de cookies** (Plausible no usa cookies, pero Stripe sí en el checkout)
- [ ] **Términos y condiciones** de uso para clientes
- [ ] **Contrato de adhesión** para taxistas miembros del club (firmado digitalmente)
- [ ] **Derecho al olvido**: botón en "Mi cuenta" para solicitar eliminación de datos
- [ ] Datos de pago gestionados exclusivamente por Stripe — nunca almacenados en la BD propia
- [ ] Logs de la aplicación sin datos personales (usar UUIDs, no nombres ni emails)
- [ ] Retención de datos: reservas históricas conservadas 5 años (obligación fiscal)

### Datos sensibles y su protección

| Dato | Dónde se guarda | Quién puede verlo |
|---|---|---|
| Email del cliente | Supabase Auth | Admin, el propio cliente |
| Teléfono del cliente | `users.phone` | Admin |
| Nombre del conductor | `users.full_name` | Admin, el propio conductor |
| Número de licencia | `drivers.license_number` | Admin |
| Matrícula del vehículo | `vehicles.plate` | Admin, taxista, cliente (solo tras confirmación) |
| Teléfono de contacto de viaje | `booking_assignments.confirmed_phone` | Admin, cliente (solo tras confirmación) |
| Datos de pago | Stripe (externos) | Stripe, Admin (últimos 4 dígitos) |

### Regulación de taxis

- Los taxistas deben acreditar licencia vigente en el momento de alta en la plataforma
- La plataforma no es operadora de transporte — actúa como intermediaria tecnológica
- Incluir disclaimer claro: "Club Taxis Asturias es una plataforma tecnológica de intermediación. Los servicios de transporte son prestados por taxistas autorizados de forma independiente."
- Consultar con asesor legal si la figura de "pago diferido por plataforma" requiere alguna habilitación adicional en Asturias

---

## 9. Plan de Lanzamiento MVP

### Fase 0 — Pre-lanzamiento (semanas 1–2)

- [ ] Definir taxistas fundadores del MVP (objetivo: 5–8 conductores)
- [ ] Reunión de kick-off con conductores: explicar modelo, app, compromisos
- [ ] Recopilar datos: licencias, vehículos, paradas preferidas
- [ ] Setup Supabase + Vercel + Stripe en modo test
- [ ] Crear primera migración de BD con paradas reales de Asturias

**Paradas iniciales del MVP:**
```sql
INSERT INTO stations (name, city, address) VALUES
  ('Aeropuerto de Asturias', 'Castrillón', 'AS-19, 33459 Castrillón'),
  ('Pravia',                 'Pravia',     'Calle Mayor, Pravia'),
  ('Avilés (RENFE)',         'Avilés',     'Pl. de la Estación, Avilés'),
  ('Gijón (FEVE)',           'Gijón',      'Calle Sanz Crespo, Gijón');
```

### Fase 1 — Beta cerrada con taxistas (semanas 3–6)

- [ ] App funcional con Fase 1 completada (auth, búsqueda, asignación, panel taxista)
- [ ] Dar acceso a los 5–8 conductores fundadores
- [ ] Sesiones de formación (30 min por conductor, presencial o videollamada)
- [ ] Canal de Telegram o WhatsApp para feedback rápido durante beta
- [ ] Hacer reservas de prueba con pagos reales (Stripe live mode)
- [ ] Iterar según feedback: UX del formulario de confirmación, notificaciones, calendario

### Fase 2 — Apertura al público (semanas 7–10)

- [ ] Landing page pública con explicación del servicio
- [ ] Integración de pagos en producción verificada
- [ ] Sistema de "Última Hora" funcionando
- [ ] Publicar en grupos de Facebook/Telegram de Asturias para primeros usuarios
- [ ] Recopilar primeras reseñas / testimonios

### Checklist pre-producción

- [ ] Variables de entorno en producción (Vercel env vars)
- [ ] Stripe en live mode (webhook endpoint registrado)
- [ ] Supabase en plan Pro (o Free con límites monitorizados)
- [ ] Dominio personalizado configurado en Vercel
- [ ] SSL activo y forzado
- [ ] Rate limiting activo en rutas de auth y pago
- [ ] Sentry configurado y alertas activas
- [ ] Plausible configurado
- [ ] Backup automático de Supabase activo (diario)
- [ ] Política de privacidad y T&C publicados
- [ ] Email de soporte operativo: soporte@clubtaxisasturias.es

---

## 10. Rendimiento

### Objetivos de Core Web Vitals

| Métrica | Objetivo |
|---|---|
| LCP (Largest Contentful Paint) | < 2.5s |
| FID / INP | < 100ms |
| CLS | < 0.1 |
| Time to Interactive | < 3.5s (3G) |

### Estrategias

- **SSR de Nuxt 3** para la página home (formulario de búsqueda se renderiza en servidor, sin flash de hidratación)
- **Lazy loading** de componentes pesados: el calendario de disponibilidad, el panel de liquidaciones
- **Cache de configuración global** (`system_config`) en memory store — se recarga cada 5 minutos, no en cada request
- **Preload de paradas** (datos casi estáticos) en el build o en el primer request del día
- **Imágenes optimizadas** con `@nuxt/image` y lazy loading nativo
- **Fonts**: `<link rel="preload">` para Inter, subset solo caracteres usados

---

## 11. Estrategia de Precios de Ruta

En el MVP, los precios se definen como **tabla de precios fija** por par de paradas, gestionada desde el panel admin. No se usa Google Maps Distance Matrix en el MVP para simplificar.

```sql
CREATE TABLE route_prices (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_station_id     UUID REFERENCES stations(id),
  destination_station_id UUID REFERENCES stations(id),
  base_price            DECIMAL(8,2) NOT NULL,
  is_return             BOOLEAN DEFAULT FALSE,  -- Precio de vuelta puede ser distinto
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(origin_station_id, destination_station_id)
);
```

Para destinos libres (no paradas), el precio se calcula por distancia en línea recta hasta la estación más cercana usando la API de Google Maps. **Esto se implementa en Fase 2.**

---

## 12. Backups y Recuperación

### Supabase

- Backup automático diario incluido en todos los planes
- Point-in-time recovery disponible en plan Pro (recomendado para producción)
- Exports manuales programados semanalmente a Supabase Storage

### Política de retención

| Dato | Retención |
|---|---|
| Reservas completadas | 5 años (obligación fiscal) |
| Datos de pago (Stripe) | Gestionados por Stripe |
| Logs de aplicación (Sentry) | 90 días |
| Analytics (Plausible) | Indefinido (datos anonimizados) |
| Ofertas de retorno expiradas | 1 año |

---

## 13. Soporte y Operación Diaria

### Canal de soporte

- **Email**: soporte@clubtaxisasturias.es (SLA: respuesta en 24h laborables)
- **Para taxistas**: grupo de WhatsApp/Telegram del club para incidencias urgentes

### Responsabilidades del taxista (aceptadas en T&C al registrarse)

1. Confirmar toda reserva asignada, sin excepción
2. Si no puede realizar el servicio, gestionar un sustituto y notificar datos a la plataforma
3. Mantener calendario de disponibilidad actualizado
4. Mantener al menos un vehículo activo con datos correctos
5. Pagar cuota mensual (salvo exención)
6. Licencia de taxi vigente en todo momento

### Responsabilidades de la plataforma

1. Asignar equitativamente usando el algoritmo round-robin
2. Notificar al taxista la reserva de forma inmediata y fiable
3. Gestionar los pagos y liquidar mensualmente
4. Mantener la app disponible (objetivo uptime 99.5%)
5. Proteger los datos de usuarios y taxistas

---

## 14. Roadmap Futuro (Post-MVP)

| Feature | Fase |
|---|---|
| Precios dinámicos por distancia (Google Maps) | v1.1 |
| Valoraciones de clientes (anónimas) | v1.1 |
| Facturación automática para taxistas | v1.2 |
| App nativa iOS/Android (Capacitor) | v2.0 |
| Múltiples idiomas (inglés para turistas del aeropuerto) | v1.2 |
| Programa de fidelización para clientes frecuentes | v2.0 |
| API pública para integración con hoteles y empresas | v2.0 |
| Dashboard de analíticas avanzadas para taxistas | v1.3 |
| Chat in-app conductor ↔ cliente (tras confirmación) | v1.2 |
| Extensión a otras provincias asturianas | v2.0 |
