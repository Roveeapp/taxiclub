# front.md — UI, UX y Arquitectura Frontend
> Club Taxis Asturias · v1.0 · Stack: Nuxt 3 + Vue 3 + Tailwind + NuxtUI

---

## 1. Productos / Apps

El proyecto tiene **tres superficies** con sus propios objetivos de UX:

| Superficie | Quién la usa | Naturaleza |
|---|---|---|
| **App cliente** (`/`) | Viajeros que reservan | Mobile-first PWA, sesiones cortas |
| **Panel taxista** (`/taxista`) | Conductores miembros y no miembros | Dashboard, sesiones más largas |
| **Panel admin** (`/admin`) | Operadores de la plataforma | Backoffice completo |

---

## 2. Personas de Usuario

### Persona 1 — El Viajero
- Necesita ir del Aeropuerto a Oviedo, o similar
- Puede ser turista, ejecutivo o residente
- Espera simplicidad: reservar en <2 minutos
- No quiere registrarse si no es imprescindible (considerar guest checkout)
- Puntos de dolor: incertidumbre sobre si llegará el taxi, no saber la matrícula, no poder llamar si hay problema

### Persona 2 — El Taxista Miembro
- Trabaja en la zona del Aeropuerto y/o paradas registradas
- Quiere gestionar su disponibilidad fácilmente
- Necesita ver reservas entrantes de forma inmediata (push notification)
- Frustraciones: apps complicadas, confirmaciones lentas, liquidaciones opacas
- Usa el móvil en el vehículo — UI debe ser grande, clara y usable con una sola mano

### Persona 3 — El Taxista No Miembro
- Solo accede para publicar ofertas de retorno
- Experiencia más limitada: onboarding mínimo, formulario de oferta, seguimiento básico
- Alta fricción de entrada → comisión más alta es la barrera natural al club

### Persona 4 — El Administrador
- Gestiona el club desde un PC o tablet
- Necesita visibilidad total: conductores activos, reservas del día, liquidaciones pendientes
- Configura parámetros del sistema (comisiones, tiempo mínimo de reserva)

---

## 3. Estructura de Navegación

### App Cliente

```
/                          → Home (formulario de búsqueda + Última Hora)
/reserva/[id]              → Detalle de reserva (estados en tiempo real)
/reserva/[id]/confirmacion → Pantalla post-pago
/cuenta                    → Mis reservas históricas
/cuenta/login              → Login / Registro
/ultima-hora               → Listado completo de ofertas de retorno
/ultima-hora/[id]          → Detalle de oferta de retorno
```

### Panel Taxista

```
/taxista                   → Dashboard (resumen, próximas reservas)
/taxista/reservas          → Listado de reservas asignadas
/taxista/reservas/[id]     → Detalle de reserva + formulario de confirmación
/taxista/disponibilidad    → Calendario mensual de disponibilidad
/taxista/vehiculos         → Gestión de vehículos
/taxista/ofertas           → Mis ofertas de retorno activas + crear oferta
/taxista/cuenta            → Perfil, licencia, paradas, membresía
/taxista/liquidaciones     → Historial de pagos mensuales recibidos
```

### Panel Admin

```
/admin                     → Dashboard global (métricas del día)
/admin/conductores         → Listado + gestión de conductores
/admin/conductores/[id]    → Perfil de conductor + historial
/admin/reservas            → Todas las reservas + filtros
/admin/reservas/[id]       → Detalle de reserva
/admin/paradas             → CRUD de paradas/estaciones
/admin/liquidaciones       → Gestión de pagos mensuales a conductores
/admin/comisiones          → Configuración de comisiones y parámetros globales
/admin/miembros            → Gestión de membresías (alta, baja, exenciones)
```

---

## 4. Flujos de Usuario Detallados

### Flujo A — Cliente reserva un viaje

```
1. Home
   ├─ Selecciona parada origen (dropdown de paradas registradas)
   ├─ Escribe destino (texto libre, autocomplete Google Places)
   ├─ Selecciona fecha y hora (mínimo +2h desde ahora, configurable)
   ├─ Ajusta pasajeros con stepper (1–8)
   ├─ Ajusta equipaje de mano (0–10)
   ├─ Ajusta maletas grandes (0–5)
   ├─ Activa extras con chips toggle (silla bebé, mascota, PMR, vehículo grande)
   └─ Pulsa "Buscar viaje" (deshabilitado hasta formulario completo + hora válida)

2. Pago (Stripe Payment Element)
   ├─ Muestra precio calculado + desglose (tarifa base, extras)
   ├─ Stripe pre-autoriza (no cobra aún)
   └─ Redirige a detalle de reserva

3. Detalle de reserva — estado: PENDIENTE DE CONFIRMAR
   ├─ Resumen del viaje (origen, destino, fecha, hora, precio)
   ├─ "Matrícula del vehículo: Pendiente de asignar" (placeholder animado)
   ├─ Nota: "El conductor confirmará en breve"
   └─ Actualización en tiempo real vía Supabase Realtime

4. Detalle de reserva — estado: CONFIRMADA (tras confirmar el taxista)
   ├─ Matrícula del vehículo visible
   ├─ Botón [Llamar al conductor] → tel: link al número asignado
   ├─ Resumen completo del viaje
   └─ Opción de cancelar (si política de cancelación lo permite)
```

### Flujo B — Cliente reserva una oferta de Última Hora

```
1. Home o /ultima-hora
   └─ Toca una tarjeta de oferta

2. Detalle de oferta
   ├─ Ruta (ej. Oviedo → Aeropuerto)
   ├─ Ventana horaria (ej. 18:00 – 19:30)
   ├─ Descuento aplicado y precio final
   ├─ Plazas disponibles
   └─ Botón [Reservar esta oferta]

3. Pago (mismo flujo Stripe)

4. Confirmación inmediata
   ├─ Esta oferta está pre-asignada al conductor que la publicó
   ├─ La matrícula aparece directamente (no hay estado "pendiente")
   └─ Botón de llamada disponible inmediatamente
```

### Flujo C — Taxista recibe y confirma una reserva

```
1. Notificación push / email
   ├─ "Nueva reserva asignada: Aeropuerto → Oviedo, mañana 10:00"
   └─ Link directo a /taxista/reservas/[id]

2. Detalle de reserva
   ├─ Resumen completo (origen, destino, pasajeros, equipaje, extras)
   ├─ Datos del cliente (solo nombre, sin datos sensibles)
   └─ Formulario de confirmación:
      ├─ Matrícula del vehículo (pre-rellena el principal, editable)
      ├─ Teléfono de contacto (pre-rellena el suyo)
      ├─ Toggle: "¿Enviará un compañero?" → si sí, campos extra:
      │   ├─ Matrícula del compañero
      │   └─ Teléfono del compañero
      └─ Botón [Confirmar reserva]

3. Post-confirmación
   ├─ Estado cambia a CONFIRMADA
   ├─ Cliente recibe notificación con matrícula
   └─ Aparece botón [Crear oferta de retorno] si el viaje tiene sentido de vuelta
```

### Flujo D — Taxista crea oferta de retorno

```
1. Desde detalle de reserva confirmada, o desde /taxista/ofertas

2. Formulario de oferta de retorno:
   ├─ Origen: ciudad/dirección de entrega (autocomplete, pre-rellena con destino del viaje)
   ├─ Destino: parada base (dropdown, pre-rellena con parada de la reserva original)
   ├─ Ventana de disponibilidad: hora "desde" y hora "hasta" (ej. 18:00 – 19:30)
   ├─ Descuento: slider 0%–40%
   ├─ Precio estimado resultante (calculado automáticamente)
   ├─ Número de plazas disponibles
   └─ Botón [Publicar oferta]

3. La oferta aparece en "Última Hora" para clientes
4. Expira automáticamente al llegar a la hora "hasta"
```

---

## 5. Pantallas — Inventario Completo

### App Cliente

| ID | Pantalla | Componente Vue |
|---|---|---|
| C-01 | Home / búsqueda | `pages/index.vue` |
| C-02 | Pago (Stripe) | `pages/pagar/[id].vue` |
| C-03 | Reserva en espera | `pages/reserva/[id].vue` |
| C-04 | Reserva confirmada | `pages/reserva/[id].vue` (mismo, estado distinto) |
| C-05 | Detalle Última Hora | `pages/ultima-hora/[id].vue` |
| C-06 | Listado Última Hora | `pages/ultima-hora/index.vue` |
| C-07 | Mis reservas | `pages/cuenta/index.vue` |
| C-08 | Login / Registro | `pages/cuenta/login.vue` |

### Panel Taxista

| ID | Pantalla | Componente Vue |
|---|---|---|
| T-01 | Dashboard | `pages/taxista/index.vue` |
| T-02 | Mis reservas | `pages/taxista/reservas/index.vue` |
| T-03 | Detalle + confirmación | `pages/taxista/reservas/[id].vue` |
| T-04 | Calendario disponibilidad | `pages/taxista/disponibilidad.vue` |
| T-05 | Mis vehículos | `pages/taxista/vehiculos/index.vue` |
| T-06 | Añadir/editar vehículo | `pages/taxista/vehiculos/[id].vue` |
| T-07 | Mis ofertas | `pages/taxista/ofertas/index.vue` |
| T-08 | Crear oferta de retorno | `pages/taxista/ofertas/nueva.vue` |
| T-09 | Mi cuenta (perfil) | `pages/taxista/cuenta.vue` |
| T-10 | Mis liquidaciones | `pages/taxista/liquidaciones.vue` |
| T-11 | Onboarding (1ª vez) | `pages/taxista/onboarding/[step].vue` |

### Panel Admin

| ID | Pantalla | Componente Vue |
|---|---|---|
| A-01 | Dashboard global | `pages/admin/index.vue` |
| A-02 | Gestión conductores | `pages/admin/conductores/index.vue` |
| A-03 | Perfil conductor | `pages/admin/conductores/[id].vue` |
| A-04 | Todas las reservas | `pages/admin/reservas/index.vue` |
| A-05 | Detalle reserva | `pages/admin/reservas/[id].vue` |
| A-06 | Paradas / estaciones | `pages/admin/paradas.vue` |
| A-07 | Liquidaciones | `pages/admin/liquidaciones.vue` |
| A-08 | Configuración global | `pages/admin/configuracion.vue` |

---

## 6. Componentes Compartidos

```
components/
├─ ui/
│   ├─ AppButton.vue          # Botón primario/secundario con estados
│   ├─ AppInput.vue           # Input con label flotante
│   ├─ AppStepper.vue         # +/- control numérico con límites
│   ├─ AppChip.vue            # Chip togglable para extras
│   ├─ AppBadge.vue           # Badge de estado (colores semánticos)
│   ├─ AppDropdown.vue        # Dropdown in-flow (sin position:fixed)
│   ├─ AppToast.vue           # Notificación temporal slide-up
│   └─ AppSkeleton.vue        # Placeholder de carga
├─ booking/
│   ├─ SearchForm.vue         # Formulario completo de búsqueda
│   ├─ BookingCard.vue        # Tarjeta de reserva en listado
│   ├─ BookingStatus.vue      # Indicador de estado con realtime
│   ├─ PlateDisplay.vue       # Matrícula + botón llamar
│   └─ LuggageSelector.vue    # Stepper de equipaje con iconos
├─ offer/
│   ├─ OfferCard.vue          # Tarjeta de Última Hora
│   ├─ OfferForm.vue          # Formulario crear oferta de retorno
│   └─ OfferTimer.vue         # Countdown hasta expiración
├─ driver/
│   ├─ AvailabilityCalendar.vue  # Calendario mensual de disponibilidad
│   ├─ VehicleCard.vue           # Tarjeta de vehículo registrado
│   ├─ ConfirmBookingForm.vue    # Formulario de confirmación de reserva
│   └─ EarningsSummary.vue       # Resumen de ingresos/comisiones
└─ layout/
    ├─ AppHeader.vue          # Header con logo + nav + avatar
    ├─ BottomNav.vue          # Navegación inferior móvil (cliente)
    ├─ SidebarNav.vue         # Sidebar (panel taxista / admin)
    └─ BrandDot.vue           # Punto dorado pulsante de marca
```

---

## 7. Patrones de Formulario

### Input de parada (dropdown in-flow)

El dropdown de selección de parada se despliega **en flujo normal** (no absolute/fixed) para evitar problemas con PWA e iframes. Al abrirse empuja el contenido hacia abajo:

```vue
<div class="from-selector" @click="toggleDropdown">
  <IconWrap icon="ti-map-pin-2" variant="dark" />
  <div class="input-content">
    <span class="field-label">DESDE · PARADA</span>
    <span class="field-value">{{ selectedStation.name }}</span>
  </div>
  <i class="ti ti-chevron-down" :class="{ rotated: isOpen }" />
</div>

<Transition name="dropdown">
  <div v-if="isOpen" class="station-list">
    <div v-for="station in stations" :key="station.id"
         class="station-option"
         @click="selectStation(station)">
      <i :class="station.icon" />
      {{ station.name }}
    </div>
  </div>
</Transition>
```

### Validación de tiempo mínimo

```vue
const isTimeValid = computed(() => {
  if (!form.date || !form.time) return null
  const selected = new Date(`${form.date}T${form.time}`)
  const minAllowed = new Date(Date.now() + minAdvanceHours.value * 60 * 60 * 1000)
  return selected >= minAllowed
})

const minTimeLabel = computed(() => {
  const min = new Date(Date.now() + minAdvanceHours.value * 60 * 60 * 1000)
  return min.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
})
```

### Stepper de pasajeros/equipaje

```vue
<!-- AppStepper.vue -->
<div class="stepper-row">
  <button @click="decrement" :disabled="value <= min" aria-label="Reducir">−</button>
  <span>{{ value }}</span>
  <button @click="increment" :disabled="value >= max" aria-label="Aumentar">+</button>
</div>
```

### Formulario de confirmación del taxista

El taxista ve el botón "¿Enviará un compañero?" que despliega campos adicionales:

```vue
<div class="confirm-section">
  <AppInput v-model="form.plate" label="Matrícula del vehículo" required />
  <AppInput v-model="form.phone" label="Teléfono de contacto" type="tel" required />

  <label class="toggle-row">
    <input type="checkbox" v-model="form.hasSub" />
    <span>Gestionará el servicio un compañero</span>
  </label>

  <Transition name="expand">
    <div v-if="form.hasSub" class="substitute-fields">
      <AppInput v-model="form.subPlate" label="Matrícula del compañero" required />
      <AppInput v-model="form.subPhone" label="Teléfono del compañero" type="tel" required />
    </div>
  </Transition>

  <AppButton @click="confirm" :loading="submitting">
    Confirmar reserva
  </AppButton>
</div>
```

---

## 8. Estado en Tiempo Real (Supabase Realtime)

La pantalla de reserva del cliente se suscribe a cambios en la tabla `booking_assignments`:

```typescript
// composables/useBookingRealtime.ts
export function useBookingRealtime(bookingId: string) {
  const booking = ref(null)

  const channel = supabase
    .channel(`booking:${bookingId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'booking_assignments',
      filter: `booking_id=eq.${bookingId}`
    }, (payload) => {
      booking.value = payload.new
    })
    .subscribe()

  onUnmounted(() => supabase.removeChannel(channel))

  return { booking }
}
```

---

## 9. Calendario de Disponibilidad (Panel Taxista)

El taxista gestiona su disponibilidad por **días completos** o con **franjas horarias**. Implementado con una librería de calendario (recomendada: `v-calendar` para Vue 3).

### Modelo de disponibilidad

```
Por defecto: DISPONIBLE todos los días
El taxista MARCA los días que NO está disponible
O puede configurar horarios específicos por día
```

### UX del calendario

- Vista mensual con días coloreados (verde = disponible, gris = no disponible)
- Click en día: toggle disponible/no disponible
- Click y drag: marcar rango de días
- Advertencia si hay una reserva confirmada para un día que intenta marcar como no disponible

---

## 10. PWA — Configuración

```typescript
// nuxt.config.ts
pwa: {
  registerType: 'autoUpdate',
  manifest: {
    name: 'Club Taxis Asturias',
    short_name: 'ClubTaxis',
    theme_color: '#0c0c13',
    background_color: '#0c0c13',
    display: 'standalone',
    orientation: 'portrait',
    icons: [
      { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
    ],
    start_url: '/',
  },
  workbox: {
    navigateFallback: '/',
    globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
  },
  client: {
    installPrompt: true,
  },
  devOptions: {
    enabled: true,
    type: 'module',
  },
}
```

### Push notifications (Web Push API)

Las notificaciones push a taxistas se implementan con Web Push (VAPID keys) usando el service worker de la PWA. Alternativa más simple para MVP: SMS via Twilio como canal principal, push como complemento.

---

## 11. Gestión de Estado (Pinia)

```
stores/
├─ useAuthStore.ts         # Usuario actual, rol, tokens de sesión
├─ useBookingStore.ts      # Datos del formulario de búsqueda en curso
├─ useDriverStore.ts       # Datos del taxista (vehículos, paradas, disponibilidad)
├─ useOffersStore.ts       # Ofertas de última hora en cache
└─ useAdminStore.ts        # Config global, métricas del admin
```

---

## 12. Accesibilidad

- Todos los botones de stepper tienen `aria-label` descriptivos
- Los dropdowns son navegables con teclado (`Tab`, `Enter`, `Escape`)
- Los estados de la reserva se anuncian via `aria-live="polite"` para lectores de pantalla
- Contraste mínimo WCAG AA en todos los textos
- Touch targets mínimo 44×44px en toda la interfaz móvil
- El botón de llamada tiene `aria-label="Llamar al conductor"` además del icono

---

## 13. Gestión de Errores en UI

| Escenario | Respuesta UI |
|---|---|
| Sin taxistas disponibles para ese horario | Pantalla amable con sugerencia de cambiar horario o fecha |
| Error de pago (Stripe declinado) | Toast de error + mantener formulario + guía al usuario |
| Reserva no encontrada | 404 personalizada con enlace al home |
| Taxista sin vehículo activo al intentar confirmar | Modal de error con enlace a gestión de vehículos |
| Oferta de retorno expirada antes de confirmar | Pantalla de "oferta no disponible" + listado de otras ofertas |
| Sin conexión (offline) | Banner sticky con indicador de red + reintento automático |

---

## 14. UX — Decisiones y Rationale

| Decisión | Motivo |
|---|---|
| Dropdown de paradas in-flow (no absolute) | Compatibilidad PWA, evita overflow en iframes |
| Mínimo de reserva configurable desde admin | El MVP empieza en 2h pero podría cambiar según operación |
| Botón Buscar deshabilitado hasta formulario válido | Evita requests vacíos y educa al usuario sobre campos requeridos |
| Cliente nunca ve datos del conductor hasta confirmación | Privacidad del conductor + expectativa gestionada |
| Matrícula como identificador, no nombre | Suficiente para identificar el vehículo en el aeropuerto |
| Chip "toggle" para extras (no checkbox) | Mayor superficie táctil en móvil, más visual |
| "Última Hora" en el home, no en pestaña separada | Máxima visibilidad para impulsar uso del feature |
