# back.md — Lógica de Negocio y Backend
> Club Taxis Asturias · v1.0 · Stack: Nuxt 3 (Nitro) + Supabase + Drizzle + Stripe

---

## 1. Arquitectura General

```
┌─────────────────────────────────────────────┐
│              Nuxt 3 (SSR)                   │
│  ┌──────────────────┐ ┌───────────────────┐ │
│  │  App Cliente     │ │  Panel Taxista    │ │
│  │  pages/ (Vue 3)  │ │  pages/taxista/   │ │
│  └──────────────────┘ └───────────────────┘ │
│  ┌──────────────────────────────────────────┤
│  │  Nitro Server Routes (API REST)          │
│  │  server/api/                             │
│  └──────────────────────────────────────────┤
└─────────────────────────────────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌──────────────────────┐
│   Supabase      │    │   Servicios externos  │
│ ─ PostgreSQL    │    │ ─ Stripe (pagos)      │
│ ─ Auth (JWT)    │    │ ─ Resend (email)      │
│ ─ Realtime      │    │ ─ Twilio (SMS)        │
│ ─ Storage       │    │ ─ Google Maps API     │
└─────────────────┘    └──────────────────────┘
```

### Principios

- Las rutas de API en Nitro son **server-only** — nunca exponen claves de Supabase service role al cliente
- Toda la lógica de negocio sensible (asignación de conductores, cálculo de comisiones, captura de pago) ocurre **en el servidor**
- El cliente Vue se suscribe a cambios en tiempo real vía Supabase Realtime solo para leer — nunca escribe directamente a tablas protegidas
- Las políticas RLS de Supabase son la **última línea de defensa** (defensa en profundidad)

---

## 2. Schema de Base de Datos

### Tabla `users`

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  phone       TEXT,
  full_name   TEXT,
  role        TEXT NOT NULL CHECK (role IN ('client','driver','admin')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

> Supabase Auth gestiona la autenticación. Esta tabla extiende `auth.users` via trigger.

### Tabla `drivers`

```sql
CREATE TABLE drivers (
  id                UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  license_number    TEXT UNIQUE NOT NULL,          -- Número de licencia de taxi
  license_city      TEXT NOT NULL,                 -- Ciudad que emite la licencia
  is_member         BOOLEAN DEFAULT FALSE,          -- Miembro del club
  member_since      DATE,                           -- Fecha de inicio membresía
  is_exempt         BOOLEAN DEFAULT FALSE,          -- Exento de cuota (grupo MVP)
  is_active         BOOLEAN DEFAULT TRUE,           -- Activo en el sistema
  last_assigned_at  TIMESTAMPTZ,                    -- Última asignación recibida (NULL = nunca)
  stripe_account_id TEXT,                           -- Stripe Connect account ID
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabla `vehicles`

```sql
CREATE TABLE vehicles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id         UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  plate             TEXT NOT NULL,                  -- Matrícula
  brand             TEXT NOT NULL,                  -- Marca (SEAT, Mercedes...)
  model             TEXT NOT NULL,                  -- Modelo
  year              INT,
  color             TEXT,
  max_passengers    INT NOT NULL DEFAULT 4,          -- Capacidad máxima de pasajeros
  max_luggage_big   INT NOT NULL DEFAULT 2,          -- Maletas grandes que caben
  max_luggage_hand  INT NOT NULL DEFAULT 4,          -- Equipaje de mano
  has_child_seat    BOOLEAN DEFAULT FALSE,
  has_pet_friendly  BOOLEAN DEFAULT FALSE,
  is_accessible     BOOLEAN DEFAULT FALSE,           -- PMR
  is_large_vehicle  BOOLEAN DEFAULT FALSE,           -- Minivan / vehículo grande
  is_active         BOOLEAN DEFAULT TRUE,            -- Vehículo en servicio
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabla `stations` (Paradas)

```sql
CREATE TABLE stations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,                         -- "Aeropuerto de Asturias"
  city        TEXT NOT NULL,
  address     TEXT,
  lat         DECIMAL(9,6),
  lng         DECIMAL(9,6),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabla `driver_stations` (Afiliación taxista–parada, bidireccional)

```sql
CREATE TABLE driver_stations (
  driver_id   UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  station_id  UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  is_active   BOOLEAN DEFAULT TRUE,
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (driver_id, station_id)
);
-- Índice para lookups por station
CREATE INDEX idx_driver_stations_station ON driver_stations(station_id) WHERE is_active = TRUE;
```

> Un conductor registrado en una parada aparece en el pool para viajes FROM esa parada **y** TO esa parada.

### Tabla `driver_availability`

```sql
CREATE TABLE driver_availability (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id   UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  hour_from   TIME,                                  -- NULL = día completo
  hour_to     TIME,
  UNIQUE(driver_id, date)
);
```

### Tabla `bookings`

```sql
CREATE TABLE bookings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             UUID NOT NULL REFERENCES users(id),
  origin_station_id     UUID NOT NULL REFERENCES stations(id),
  destination_address   TEXT NOT NULL,
  destination_lat       DECIMAL(9,6),
  destination_lng       DECIMAL(9,6),
  destination_station_id UUID REFERENCES stations(id),  -- NULL si el destino no es parada
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
```

### Tabla `booking_assignments`

```sql
CREATE TABLE booking_assignments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id            UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  driver_id             UUID NOT NULL REFERENCES drivers(id),
  assigned_at           TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at          TIMESTAMPTZ,
  -- Datos que confirma el taxista:
  confirmed_plate       TEXT,                         -- Matrícula del vehículo asignado
  confirmed_phone       TEXT,                         -- Teléfono de contacto
  -- Si lo gestiona un sustituto:
  substitute_plate      TEXT,
  substitute_phone      TEXT,
  has_substitute        BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_ba_driver ON booking_assignments(driver_id);
CREATE INDEX idx_ba_booking ON booking_assignments(booking_id);
```

### Tabla `return_offers` (Ofertas de Última Hora)

```sql
CREATE TABLE return_offers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id             UUID NOT NULL REFERENCES drivers(id),
  origin_booking_id     UUID REFERENCES bookings(id),  -- Reserva que origina esta oferta (opcional)
  origin_address        TEXT NOT NULL,                  -- Desde dónde sale el conductor
  origin_lat            DECIMAL(9,6),
  origin_lng            DECIMAL(9,6),
  destination_station_id UUID NOT NULL REFERENCES stations(id),  -- Parada base del conductor
  available_from        TIMESTAMPTZ NOT NULL,
  available_until       TIMESTAMPTZ NOT NULL,
  max_passengers        INT NOT NULL DEFAULT 4,
  discount_pct          INT NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 40),
  base_price            DECIMAL(8,2) NOT NULL,
  final_price           DECIMAL(8,2) NOT NULL,          -- base_price * (1 - discount_pct/100)
  status                TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','booked','expired','cancelled')),
  booked_by_id          UUID REFERENCES bookings(id),   -- Reserva que lo recogió
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ro_status ON return_offers(status) WHERE status = 'active';
CREATE INDEX idx_ro_until ON return_offers(available_until);
```

### Tabla `memberships`

```sql
CREATE TABLE memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id       UUID NOT NULL REFERENCES drivers(id),
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  amount          DECIMAL(6,2) NOT NULL,               -- 20.00 €
  is_exempt       BOOLEAN DEFAULT FALSE,
  stripe_invoice_id TEXT,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabla `driver_payouts`

```sql
CREATE TABLE driver_payouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id       UUID NOT NULL REFERENCES drivers(id),
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  gross_amount    DECIMAL(10,2) NOT NULL,              -- Suma de viajes completados
  commission_pct  DECIMAL(5,2) NOT NULL,               -- % comisión aplicada
  commission_amt  DECIMAL(10,2) NOT NULL,              -- Importe de comisión
  net_amount      DECIMAL(10,2) NOT NULL,              -- gross - commission
  membership_fee  DECIMAL(6,2) DEFAULT 0,             -- Cuota del mes (si aplica)
  final_payout    DECIMAL(10,2) NOT NULL,              -- net - membership_fee
  stripe_payout_id TEXT,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabla `system_config`

```sql
CREATE TABLE system_config (
  key    TEXT PRIMARY KEY,
  value  JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Valores iniciales:
INSERT INTO system_config (key, value) VALUES
  ('min_advance_hours',         '2'),
  ('commission_member_pct',     '10'),
  ('commission_non_member_pct', '12'),
  ('membership_monthly_fee',    '20.00'),
  ('max_cancel_hours_before',   '24');   -- Horas antes del viaje en que se puede cancelar
```

---

## 3. Algoritmo de Asignación Round-Robin

### Concepto

Las paradas son **afiliaciones bidireccionales**: un conductor registrado en la parada X entra en el pool para viajes **desde** X y también para viajes **hacia** X.

El pool combinado se ordena por `last_assigned_at ASC NULLS FIRST`: quien lleve más tiempo sin recibir una asignación tiene prioridad máxima. Los conductores que nunca han sido asignados (`NULL`) tienen la prioridad más alta.

### Determinación de paradas involucradas

```typescript
// server/services/assignment.ts

async function getStationIds(booking: BookingInput): Promise<string[]> {
  const stationIds = [booking.originStationId]

  // ¿Es el destino una parada registrada?
  if (booking.destinationStationId) {
    stationIds.push(booking.destinationStationId)
  }
  // Si el destino no viene pre-identificado, hacer lookup por coordenadas/nombre:
  // (opcional en MVP — el cliente puede seleccionar destino de parada en formulario)

  return stationIds
}
```

### Query de selección del conductor

```sql
-- Parámetros: $1=stationIds[], $2=passengers, $3=luggage_big, $4=luggage_hand,
--             $5=needs_child_seat, $6=needs_pet, $7=needs_accessible,
--             $8=needs_large, $9=pickup_at::timestamptz

SELECT DISTINCT ON (d.id)
  d.id,
  d.last_assigned_at,
  v.id AS vehicle_id,
  v.plate
FROM drivers d
JOIN driver_stations ds ON d.id = ds.driver_id
JOIN vehicles v         ON v.driver_id = d.id AND v.is_active = TRUE
WHERE
  ds.station_id       = ANY($1::uuid[])
  AND ds.is_active    = TRUE
  AND d.is_active     = TRUE
  AND v.max_passengers  >= $2
  AND v.max_luggage_big >= $3
  AND v.max_luggage_hand >= $4
  AND ($5 = FALSE OR v.has_child_seat = TRUE)
  AND ($6 = FALSE OR v.has_pet_friendly = TRUE)
  AND ($7 = FALSE OR v.is_accessible = TRUE)
  AND ($8 = FALSE OR v.is_large_vehicle = TRUE)
  -- Sin reservas confirmadas que solapen el horario (+/- 3h margen de servicio)
  AND NOT EXISTS (
    SELECT 1 FROM booking_assignments ba
    JOIN bookings b ON b.id = ba.booking_id
    WHERE ba.driver_id = d.id
      AND b.status IN ('pending','confirmed')
      AND b.pickup_at BETWEEN ($9::timestamptz - INTERVAL '3 hours')
                          AND ($9::timestamptz + INTERVAL '3 hours')
  )
  -- Conductor disponible en la fecha
  AND NOT EXISTS (
    SELECT 1 FROM driver_availability da
    WHERE da.driver_id = d.id
      AND da.date = DATE($9)
      AND da.is_available = FALSE
  )
ORDER BY d.id, d.last_assigned_at ASC NULLS FIRST
LIMIT 1;
```

### Transacción de asignación (atómica)

```typescript
// server/services/assignment.ts

export async function assignDriver(bookingInput: BookingInput) {
  return await db.transaction(async (tx) => {
    // 1. Crear la reserva
    const [booking] = await tx.insert(bookings)
      .values(bookingInput)
      .returning()

    // 2. Determinar paradas involucradas
    const stationIds = await getStationIds(bookingInput)

    // 3. Seleccionar conductor del pool combinado
    const result = await tx.execute(sql`
      SELECT DISTINCT ON (d.id) d.id, d.last_assigned_at
      FROM drivers d
      JOIN driver_stations ds ON d.id = ds.driver_id
      JOIN vehicles v ON v.driver_id = d.id AND v.is_active = TRUE
      WHERE ds.station_id = ANY(${stationIds}::uuid[])
        AND ...filtros de capacidad...
      ORDER BY d.id, d.last_assigned_at ASC NULLS FIRST
      LIMIT 1
    `)

    if (result.rows.length === 0) {
      // Sin conductores disponibles — reserva queda sin asignar
      // Se notifica al admin para gestión manual
      await notifyAdminNoDrivers(booking.id)
      throw new NoDriverAvailableError()
    }

    const driver = result.rows[0]

    // 4. Crear la asignación
    await tx.insert(bookingAssignments).values({
      bookingId: booking.id,
      driverId: driver.id,
    })

    // 5. Actualizar last_assigned_at (pasa al final del pool)
    await tx.update(drivers)
      .set({ lastAssignedAt: new Date() })
      .where(eq(drivers.id, driver.id))

    // 6. Notificar al conductor
    await notifyDriver(driver.id, booking)

    return { booking, driverId: driver.id }
  })
}
```

---

## 4. Máquina de Estados de la Reserva

```
                    ┌─────────────────┐
                    │    PENDIENTE    │  ← Creada, conductor asignado, esperando confirmación
                    └────────┬────────┘
                             │ conductor confirma (matrícula + tel)
                             ▼
                    ┌─────────────────┐
                    │   CONFIRMADA    │  ← Cliente puede ver matrícula y llamar
                    └────────┬────────┘
                             │ viaje realizado (marcado manualmente o automático)
                             ▼
                    ┌─────────────────┐
                    │   COMPLETADA    │  ← Stripe captura el pago
                    └─────────────────┘

Desde PENDIENTE o CONFIRMADA:
  ─ admin/cliente cancela → CANCELADA
     └─ Stripe libera la pre-autorización (void PaymentIntent)
```

### Transiciones de estado en la API

```typescript
// PENDIENTE → CONFIRMADA
// POST /api/bookings/[id]/confirm (solo taxista asignado)
async function confirmBooking(bookingId: string, driverId: string, data: ConfirmData) {
  // Verificar que el conductor es el asignado
  const assignment = await getAssignment(bookingId)
  if (assignment.driverId !== driverId) throw new ForbiddenError()

  await db.transaction(async (tx) => {
    await tx.update(bookingAssignments)
      .set({
        confirmedAt:    new Date(),
        confirmedPlate: data.plate,
        confirmedPhone: data.phone,
        hasSub:         data.hasSub,
        subPlate:       data.subPlate ?? null,
        subPhone:       data.subPhone ?? null,
      })
      .where(eq(bookingAssignments.bookingId, bookingId))

    await tx.update(bookings)
      .set({ status: 'confirmed', updatedAt: new Date() })
      .where(eq(bookings.id, bookingId))
  })

  // Notificar al cliente via email/push
  await notifyClientConfirmed(bookingId)
}

// CONFIRMADA → COMPLETADA
// POST /api/bookings/[id]/complete (admin o conductor)
async function completeBooking(bookingId: string) {
  await db.update(bookings)
    .set({ status: 'completed', updatedAt: new Date() })
    .where(eq(bookings.id, bookingId))

  // Capturar el pago en Stripe
  const booking = await getBooking(bookingId)
  await stripe.paymentIntents.capture(booking.stripePaymentIntentId)
}
```

---

## 5. Sistema de Pagos (Stripe)

### Flujo completo

```
1. RESERVA CREADA
   ├─ Cliente introduce datos en formulario
   ├─ Frontend pide al servidor: POST /api/payments/create-intent
   ├─ Servidor crea PaymentIntent con capture_method: 'manual'
   │   └─ Stripe pre-autoriza (bloquea fondos, no cobra)
   └─ Frontend monta Stripe Elements con el client_secret

2. PAGO PRE-AUTORIZADO
   ├─ Cliente completa el pago en Stripe Elements
   ├─ Stripe llama a webhook: payment_intent.amount_capturable_updated
   └─ Servidor crea la reserva y lanza el algoritmo de asignación

3. VIAJE COMPLETADO
   ├─ Servidor llama a stripe.paymentIntents.capture()
   └─ Stripe cobra el importe al cliente

4. CANCELACIÓN
   └─ Servidor llama a stripe.paymentIntents.cancel()
       └─ Stripe libera los fondos (no hay cargo)
```

### Creación del PaymentIntent

```typescript
// server/api/payments/create-intent.post.ts

export default defineEventHandler(async (event) => {
  const { bookingData } = await readBody(event)
  const price = calculatePrice(bookingData)

  const intent = await stripe.paymentIntents.create({
    amount:         Math.round(price * 100),    // En céntimos
    currency:       'eur',
    capture_method: 'manual',                   // Pre-autorización
    metadata: {
      origin:       bookingData.originStationId,
      destination:  bookingData.destinationAddress,
      pickup_at:    bookingData.pickupAt,
    },
    automatic_payment_methods: { enabled: true },
  })

  return { clientSecret: intent.client_secret }
})
```

### Webhook de Stripe

```typescript
// server/api/webhooks/stripe.post.ts

export default defineEventHandler(async (event) => {
  const body = await readRawBody(event)
  const sig  = getHeader(event, 'stripe-signature')!
  const stripeEvent = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)

  switch (stripeEvent.type) {
    case 'payment_intent.amount_capturable_updated':
      // El cliente ha completado el pago — crear reserva y asignar conductor
      await handlePaymentCapturable(stripeEvent.data.object)
      break

    case 'payment_intent.payment_failed':
      // Notificar al cliente del fallo de pago
      await handlePaymentFailed(stripeEvent.data.object)
      break
  }

  return { received: true }
})
```

### Cálculo de precio

```typescript
// server/services/pricing.ts

export function calculatePrice(booking: BookingInput): number {
  const config = await getSystemConfig()

  // En MVP: precio fijo por parada configurado desde admin
  // (En el futuro: precio por km usando Google Maps Distance Matrix)
  const routePrice = await getRoutePrice(
    booking.originStationId,
    booking.destinationStationId ?? booking.destinationAddress
  )

  // Extras
  let extras = 0
  if (booking.needsChildSeat)   extras += config.extraChildSeat ?? 0
  if (booking.needsPetFriendly) extras += config.extraPet ?? 0
  if (booking.needsLargeVehicle) extras += config.extraLargeVehicle ?? 0

  return routePrice + extras
}
```

### Cálculo de comisión y payout mensual

```typescript
// server/services/payouts.ts

export async function calculateMonthlyPayout(driverId: string, month: Date) {
  const config = await getSystemConfig()
  const driver = await getDriver(driverId)

  // Viajes completados en el mes
  const completedTrips = await getCompletedTrips(driverId, month)
  const gross = completedTrips.reduce((sum, t) => sum + t.totalPrice, 0)

  // Comisión según membresía
  const commissionPct = driver.isMember
    ? config.commissionMemberPct        // 10%
    : config.commissionNonMemberPct     // 12%

  const commissionAmt = gross * commissionPct / 100
  const net = gross - commissionAmt

  // Cuota de membresía (si no está exento)
  const membershipFee = (driver.isMember && !driver.isExempt)
    ? config.membershipMonthlyFee       // 20€
    : 0

  const finalPayout = net - membershipFee

  return { gross, commissionPct, commissionAmt, net, membershipFee, finalPayout }
}
```

---

## 6. Ofertas de Retorno

### Creación de oferta

```typescript
// server/api/taxista/ofertas.post.ts

export default defineEventHandler(async (event) => {
  const driver = await requireDriver(event)
  const data   = await readBody(event)

  // Calcular precio final con descuento
  const basePrice  = await getRoutePrice(data.originAddress, data.destinationStationId)
  const finalPrice = basePrice * (1 - data.discountPct / 100)

  const [offer] = await db.insert(returnOffers).values({
    driverId:             driver.id,
    originBookingId:      data.originBookingId ?? null,
    originAddress:        data.originAddress,
    destinationStationId: data.destinationStationId,
    availableFrom:        new Date(data.availableFrom),
    availableUntil:       new Date(data.availableUntil),
    maxPassengers:        data.maxPassengers,
    discountPct:          data.discountPct,
    basePrice,
    finalPrice,
    status:               'active',
  }).returning()

  return offer
})
```

### Expiración automática de ofertas

```typescript
// server/tasks/expire-offers.ts
// Se ejecuta cada 5 minutos via Nuxt scheduled tasks o Supabase Edge Functions cron

export async function expireOldOffers() {
  await db.update(returnOffers)
    .set({ status: 'expired' })
    .where(
      and(
        eq(returnOffers.status, 'active'),
        lt(returnOffers.availableUntil, new Date())
      )
    )
}
```

---

## 7. Endpoints de la API

### Auth
```
POST   /api/auth/login          Inicio de sesión (Supabase Auth)
POST   /api/auth/register       Registro de nuevo usuario
POST   /api/auth/logout         Cierre de sesión
GET    /api/auth/me             Usuario autenticado actual
```

### Reservas (cliente)
```
POST   /api/payments/create-intent      Crear PaymentIntent de Stripe
POST   /api/bookings                    Crear reserva (tras pago pre-auth)
GET    /api/bookings/[id]               Detalle de reserva
DELETE /api/bookings/[id]               Cancelar reserva
```

### Reservas (taxista)
```
GET    /api/taxista/reservas            Mis reservas asignadas
GET    /api/taxista/reservas/[id]       Detalle de reserva asignada
POST   /api/taxista/reservas/[id]/confirmar    Confirmar reserva (matrícula + tel)
POST   /api/taxista/reservas/[id]/completar   Marcar como completado
```

### Panel taxista
```
GET    /api/taxista/vehiculos           Mis vehículos
POST   /api/taxista/vehiculos           Añadir vehículo
PATCH  /api/taxista/vehiculos/[id]      Editar vehículo
DELETE /api/taxista/vehiculos/[id]      Desactivar vehículo
GET    /api/taxista/disponibilidad      Mi calendario de disponibilidad
PATCH  /api/taxista/disponibilidad      Actualizar disponibilidad (rango de fechas)
GET    /api/taxista/paradas             Mis paradas registradas
POST   /api/taxista/paradas/[id]        Solicitar afiliación a parada
GET    /api/taxista/liquidaciones       Mis pagos mensuales
```

### Ofertas de retorno
```
GET    /api/ofertas                     Listado activas (cliente, paginado)
GET    /api/ofertas/[id]                Detalle de oferta
POST   /api/taxista/ofertas             Crear oferta de retorno
DELETE /api/taxista/ofertas/[id]        Cancelar oferta propia
```

### Admin
```
GET    /api/admin/conductores           Listado de conductores
PATCH  /api/admin/conductores/[id]      Editar conductor (membresía, paradas, estado)
GET    /api/admin/reservas              Todas las reservas (con filtros)
POST   /api/admin/reservas/[id]/cancelar  Cancelar reserva manualmente
GET    /api/admin/paradas               Listado de paradas
POST   /api/admin/paradas               Crear parada
PATCH  /api/admin/paradas/[id]          Editar parada
GET    /api/admin/liquidaciones         Liquidaciones del mes + estado
POST   /api/admin/liquidaciones/procesar  Lanzar proceso de pago mensual
GET    /api/admin/config                Configuración global del sistema
PATCH  /api/admin/config                Actualizar parámetros globales
```

### Webhooks
```
POST   /api/webhooks/stripe             Eventos de Stripe (pago, captura, fallo)
```

---

## 8. Autenticación y Roles (RLS)

### Roles del sistema

| Rol | Acceso |
|---|---|
| `client` | Solo sus propias reservas, ofertas públicas |
| `driver` | Sus reservas asignadas, sus vehículos, su disponibilidad, sus ofertas |
| `admin` | Todo el sistema |

### Middleware de auth en Nuxt

```typescript
// server/middleware/auth.ts

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'sb-access-token')
    || getHeader(event, 'Authorization')?.replace('Bearer ', '')

  if (!token) return  // Rutas públicas pasan

  const { data: { user } } = await supabase.auth.getUser(token)
  event.context.user = user
  event.context.role = user?.user_metadata?.role
})

// Helper de uso en cada handler
export function requireRole(event: H3Event, role: string) {
  if (event.context.role !== role) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }
}
```

### Row Level Security (Supabase)

```sql
-- Clientes solo ven sus propias reservas
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_own_bookings" ON bookings
  FOR SELECT USING (auth.uid() = client_id);

-- Taxistas solo ven sus propias asignaciones
ALTER TABLE booking_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drivers_own_assignments" ON booking_assignments
  FOR SELECT USING (auth.uid() = driver_id);

-- Suscripción Realtime: cliente escucha su propia reserva
-- La política anterior ya filtra automáticamente lo que llega por Realtime
```

---

## 9. Notificaciones

### Canal prioritario por escenario

| Evento | Canal | Urgencia |
|---|---|---|
| Nueva reserva asignada al conductor | Push PWA + Email | CRÍTICA — debe llegar en segundos |
| Recordatorio a conductor si no confirma en 30min | SMS | ALTA |
| Reserva confirmada → cliente | Email + Push | ALTA |
| Oferta de retorno publicada | Push a clientes relevantes | MEDIA |
| Liquidación mensual procesada | Email | BAJA |
| Membresía próxima a vencer | Email | BAJA |

### Servicio de notificaciones

```typescript
// server/services/notifications.ts

export async function notifyDriver(driverId: string, booking: Booking) {
  const driver = await getDriverWithUser(driverId)

  // 1. Push notification (si tiene subscription)
  if (driver.pushSubscription) {
    await sendWebPush(driver.pushSubscription, {
      title: '🚕 Nueva reserva asignada',
      body:  `${booking.originStation.name} → ${booking.destinationAddress}`,
      data:  { bookingId: booking.id, url: `/taxista/reservas/${booking.id}` }
    })
  }

  // 2. Email (siempre)
  await resend.emails.send({
    from:    'noreply@clubtaxisasturias.es',
    to:      driver.user.email,
    subject: `Nueva reserva: ${booking.pickupAt.toLocaleDateString('es-ES')}`,
    html:    renderEmail('new-booking', { booking, driver })
  })
}
```

---

## 10. Cron Jobs

| Job | Frecuencia | Descripción |
|---|---|---|
| `expire-offers` | Cada 5 min | Expira ofertas de retorno pasada su hora límite |
| `remind-unconfirmed` | Cada 15 min | Envía SMS a conductor si lleva >30min sin confirmar |
| `process-payouts` | Día 1 de cada mes | Calcula y lanza liquidaciones mensuales vía Stripe |
| `charge-memberships` | Día 1 de cada mes | Cobra cuota mensual del club a conductores no exentos |
| `cleanup-intents` | Cada hora | Cancela PaymentIntents huérfanos (>2h sin completar) |

```typescript
// nuxt.config.ts
nitro: {
  experimental: {
    tasks: true,  // Nuxt 3.10+ scheduled tasks
  },
  scheduledTasks: {
    '*/5 * * * *':  ['tasks/expire-offers'],
    '*/15 * * * *': ['tasks/remind-unconfirmed'],
    '0 8 1 * *':    ['tasks/process-payouts'],
    '0 9 1 * *':    ['tasks/charge-memberships'],
  }
}
```

---

## 11. Variables de Entorno

```bash
# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...    # Solo server-side, NUNCA al cliente

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Email
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@clubtaxisasturias.es

# SMS
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+34...

# Google Maps (geocoding + places)
GOOGLE_MAPS_API_KEY=...

# App
NUXT_PUBLIC_APP_URL=https://clubtaxisasturias.es
NUXT_PUBLIC_SUPABASE_URL=...
NUXT_PUBLIC_SUPABASE_ANON_KEY=...
NUXT_PUBLIC_STRIPE_PK=...

# Push notifications (VAPID)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_MAILTO=admin@clubtaxisasturias.es
```

---

## 12. Seguridad

- Las claves `SERVICE_ROLE_KEY` de Supabase solo se usan en contexto Nitro server — **nunca expuestas al navegador**
- Los webhooks de Stripe validan la firma `stripe-signature` antes de procesar cualquier evento
- Las rutas `/api/admin/*` verifican rol `admin` en middleware de Nitro
- RLS de Supabase actúa como segunda capa de seguridad independiente del middleware
- Los datos del conductor (nombre, teléfono real) no son accesibles por el cliente hasta que la reserva está confirmada — solo la matrícula y el teléfono de contacto que el propio conductor introduce
- Todas las operaciones de dinero (captura, void, payout) solo las inicia el servidor, nunca el cliente
- Rate limiting en Nitro para rutas de auth y creación de pagos: máx. 10 req/min por IP
