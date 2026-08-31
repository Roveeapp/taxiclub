# design.md — Identidad Visual y Diseño Gráfico
> Club Taxis Asturias · v1.0

---

## 1. Concepto de Marca

**Nombre de producto:** Club Taxis Asturias  
**Tagline:** *Tu taxi de confianza, cuando lo necesitas*

La identidad visual debe transmitir **exclusividad sin ostentación**, **fiabilidad profesional** y **tecnología accesible**. No es una app de transporte masivo como Uber — es un servicio de confianza de calidad premium para un mercado local. El estilo visual se inspira en marcas de servicios premium (tarjetas negras, lounges de aeropuerto) pero sin caer en el lujo excesivo que alejaría a usuarios cotidianos.

**Tres palabras que definen la marca:**
- Exclusivo
- Confiable
- Local

---

## 2. Paleta de Colores

### Colores primarios

| Token | Hex | Uso |
|---|---|---|
| `--color-brand-dark` | `#0c0c13` | Fondo principal de la app, navbar, header |
| `--color-brand-gold` | `#fabd32` | Acento primario: botones CTA, badges, iconos clave, punto de marca. En Tailwind es `brand-gold` (89 usos) |
| `--color-brand-white` | `#ffffff` | Tarjetas de formulario, fondos de contenido |

### Colores de superficie

| Token | Hex | Uso |
|---|---|---|
| `--color-surface-dark` | `#14141e` | Superficies secundarias sobre el fondo oscuro |
| `--color-surface-card` | `rgba(255,255,255,0.05)` | Tarjetas "Última Hora" sobre fondo oscuro |
| `--color-surface-card-border` | `rgba(255,255,255,0.09)` | Bordes de tarjetas sobre oscuro |
| `--color-surface-input` | `#f4f4f8` | Fondo de inputs dentro de la tarjeta blanca |
| `--color-surface-divider` | `#ebebf0` | Divisores internos dentro de tarjetas blancas |

### Colores de texto

| Token | Hex | Uso |
|---|---|---|
| `--color-text-on-dark` | `#ffffff` | Texto principal sobre fondo oscuro |
| `--color-text-muted-dark` | `rgba(255,255,255,0.45)` | Texto secundario sobre oscuro |
| `--color-text-on-light` | `#0c0c13` | Texto principal sobre tarjeta blanca |
| `--color-text-muted-light` | `#999999` | Labels de campos, texto secundario sobre blanco |

### Colores semánticos

| Token | Hex | Uso |
|---|---|---|
| `--color-success` | `#1a9e6a` | Reserva confirmada, estado activo |
| `--color-warning` | `#e5990a` | Pendiente de confirmación, advertencias |
| `--color-error` | `#d93025` | Cancelaciones, errores |
| `--color-info` | `#2563eb` | Información neutral, estados intermedios |

### Colores del acento dorado (escala)

```
gold-50:  #fffbeb   (fondos de badges, hover suave)
gold-100: #fef3c7   (chips seleccionados, fondo de alertas)
gold-200: #fde68a   (bordes de elementos gold)
gold-400: #fabd32   (acento principal — color de marca, `brand-gold`)
gold-500: #f0b429   (tono más profundo; en el tema de PrimeVue es el 500)
gold-600: #d97706   (hover sobre gold, texto sobre gold-100)
gold-800: #92400e   (texto sobre gold-50)
```

### Uso del color dorado con transparencia (sobre fondo oscuro)

```css
/* Badge de descuento */
background: rgba(240, 180, 41, 0.18);
color: #f0b429;

/* Icono destacado */
background: rgba(240, 180, 41, 0.12);
color: #f0b429;

/* Punto de marca animado */
background: #f0b429;
animation: pulse 2s ease-in-out infinite;
```

---

## 3. Tipografía

### Fuente principal

**Inter** — para toda la UI de la app web/PWA.

```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

> *Si en el futuro se plantea una identidad más premium, considerar **DM Sans** (moderna, redondeada) o **Sora** (técnica, fresca) como alternativa a Inter.*

### Escala tipográfica

| Rol | Tamaño | Peso | Uso |
|---|---|---|---|
| Display | 28px | 600 | Título de pantalla principal ("¿A dónde te llevamos?") |
| H1 | 22px | 500 | Títulos de sección |
| H2 | 18px | 500 | Títulos de tarjeta, subsecciones |
| H3 | 15px | 500 | Títulos de elemento (nombre de ruta, nombre de conductor) |
| Body | 14px | 400 | Texto de formulario, contenido estándar |
| Label | 13px | 400 | Descripciones, subtítulos |
| Caption | 12px | 400 | Metadatos, timestamps, info secundaria |
| Micro | 11px | 500 | Labels de campo (uppercase + letter-spacing), badges |

### Reglas tipográficas

- Los **labels de campo** (como "DESDE · PARADA") van en `11px / 500 / uppercase / letter-spacing: 0.08em`
- Los **precios** van siempre en `500` o `600`, nunca en `400`
- Los **estados** (PENDIENTE, CONFIRMADO) van en `11px / 600 / uppercase`
- Usar `line-height: 1.5` para texto de párrafo, `1.2` para títulos display

---

## 4. Iconografía

**Librería:** [Tabler Icons](https://tabler.io/icons) — variante outline exclusivamente.

### Iconos clave del sistema

| Icono | Nombre Tabler | Uso |
|---|---|---|
| Parada origen | `ti-map-pin-2` | Punto de recogida, siempre con fondo `#0c0c13` y color `#f0b429` |
| Destino | `ti-map-pin` | Destino libre, fondo `#f0b429`, icono `#0c0c13` |
| Pasajeros | `ti-users` | Contador de personas |
| Equipaje mano | `ti-briefcase` | Maleta pequeña |
| Maleta grande | `ti-luggage` | Maleta grande |
| Silla de bebé | `ti-armchair` | Extra: silla para niño |
| Mascota | `ti-paw` | Extra: pet friendly |
| PMR | `ti-wheelchair` | Extra: accesibilidad |
| Llamada | `ti-phone-call` | Botón de contacto en reserva |
| Aviación | `ti-plane-arrival` | Ofertas de retorno al aeropuerto |
| Club | `ti-crown` | Taxista miembro del club |
| Última Hora | `ti-bolt` | Ofertas de retorno, sección temporal |
| Calendario | `ti-calendar` | Panel de disponibilidad taxista |
| Vehículo | `ti-steering-wheel` | Gestión de vehículos |
| Admin | `ti-settings` | Panel de administración |

### Tamaños de icono

| Contexto | Tamaño |
|---|---|
| Inline en texto | 14px |
| Input field | 15–16px |
| Tarjeta grande (destacado) | 18–20px |
| Nav icon | 20px |
| Avatar / icono featured | 22–24px |

### Contenedores de icono

Los iconos en contextos de acción se envuelven en un contenedor circular o redondeado:

```css
/* Icono de origen (oscuro con dorado) */
.icon-wrap-dark {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #0c0c13;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Icono de destino (dorado con oscuro) */
.icon-wrap-gold {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #f0b429;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Icono de categoría en tarjeta (sutil) */
.icon-wrap-subtle {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  background: rgba(240, 180, 41, 0.12);
}
```

---

## 5. Espaciado y Layout

### Grid

La app es **mobile-first**. El ancho óptimo de diseño es **375px** (iPhone estándar). La web de escritorio centra el contenido en un max-width de **480px** con fondo oscuro a los lados.

```
Base unit: 4px
Spacing scale: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48
```

### Border radius

| Elemento | Radio |
|---|---|
| Botón primario, tarjeta grande | `14px` |
| Tarjeta de formulario | `20px` |
| Input field, item de lista | `12px` |
| Badge, chip | `20px` (pill) |
| Avatar | `50%` |
| Icon wrap grande | `11px` |
| Icon wrap pequeño | `50%` |

---

## 6. Componentes Visuales Clave

### Botón primario

```css
.btn-primary {
  background: #0c0c13;
  color: #ffffff;
  border: none;
  border-radius: 14px;
  padding: 15px;
  font-size: 15px;
  font-weight: 500;
  width: 100%;
  /* Estado deshabilitado */
  opacity: 0.4;
  cursor: not-allowed;
  /* Estado activo */
  opacity: 1;
  cursor: pointer;
}
```

### Badge de descuento (Última Hora)

```css
.badge-discount {
  font-size: 11px;
  font-weight: 600;
  background: rgba(240, 180, 41, 0.18);
  color: #f0b429;
  padding: 3px 8px;
  border-radius: 5px;
}
```

### Badge de estado de reserva

```css
.badge-pending   { background: #fff8e1; color: #b45309; }  /* Pendiente */
.badge-confirmed { background: #ecfdf5; color: #065f46; }  /* Confirmada */
.badge-cancelled { background: #fef2f2; color: #991b1b; }  /* Cancelada */
.badge-completed { background: #eff6ff; color: #1e40af; }  /* Completada */
```

### Chip / Extra toggle

Estado inactivo: borde `#dde`, fondo `white`, texto `#555`  
Estado activo: borde `#0c0c13`, fondo `#0c0c13`, texto `white`

### Punto de marca animado

El punto dorado pulsante en el header y en la sección "Última Hora" es un elemento de identidad clave:

```css
.brand-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #f0b429;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(1.3); }
}
```

---

## 7. Modo Oscuro y Claro

La **app para clientes** usa predominantemente el fondo oscuro `#0c0c13` como pantalla de inicio y navegación, con tarjetas blancas para los formularios. Este contraste es intencional y diferenciador.

El **panel de taxistas** y el **panel de administración** pueden usar un tema más claro (fondo `#f8f8fc`, tarjetas blancas) para facilitar el trabajo prolongado frente a la pantalla.

```
App cliente:
  - Header/nav: #0c0c13
  - Formularios: tarjetas blancas sobre oscuro
  - Listas (Última Hora): tarjetas translúcidas sobre oscuro

Panel taxista / Admin:
  - Fondo general: #f8f8fc
  - Tarjetas: #ffffff con border 1px #ebebf0
  - Sidebar: #0c0c13
```

---

## 8. Motion y Animaciones

Todas las animaciones deben respetar `prefers-reduced-motion`.

| Elemento | Tipo | Duración | Easing |
|---|---|---|---|
| Punto de marca (pulsado) | CSS keyframes | 2s | `ease-in-out` |
| Apertura de dropdown de parada | height + opacity | 200ms | `ease-out` |
| Toggle de chip extra | background/color | 150ms | `ease` |
| Botón press (feedback táctil) | `scale(0.97)` | 100ms | `ease` |
| Transición entre pantallas | slide + fade | 300ms | `ease-in-out` |
| Loading skeleton | shimmer | 1.5s | `ease-in-out infinite` |
| Toast de confirmación | slide up + fade | 350ms | `spring` |

---

## 9. Estados Visuales de Reserva

La reserva es el core del producto y debe tener estados visuales inequívocos:

| Estado | Color | Icono | Label |
|---|---|---|---|
| Buscando | `#2563eb` | `ti-loader` animado | "Buscando taxista…" |
| Pendiente de confirmar | `#d97706` | `ti-clock` | "Pendiente de confirmar" |
| Confirmada | `#1a9e6a` | `ti-check` | "Confirmada" |
| En curso | `#2563eb` | `ti-car` | "En camino" |
| Completada | `#6b7280` | `ti-check-circle` | "Completada" |
| Cancelada | `#d93025` | `ti-x` | "Cancelada" |

---

## 10. Assets necesarios

- [ ] Logo vectorial en SVG (versión positiva sobre oscuro + negativa sobre blanco)
- [ ] Favicon 32×32 y 16×16 (ICO)
- [ ] PWA icons: 192×192 y 512×512 (PNG)
- [ ] OG Image (1200×630) para compartir en redes
- [ ] Splash screen PWA (fondo `#0c0c13` + logo centrado)
- [ ] Imágenes de paradas (foto representativa del Aeropuerto, Pravia, Avilés, Gijón)

---

## 11. Naming Conventions para CSS/Clases

```
Componentes: PascalCase para Vue (SearchForm.vue, BookingCard.vue)
Clases CSS: kebab-case (brand-dot, badge-discount, icon-wrap-gold)
Tokens CSS: --color-brand-*, --color-surface-*, --color-text-*
```

Usar **Tailwind CSS** como base con un `tailwind.config.ts` que extienda los tokens de marca:

```ts
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      brand: {
        dark:  '#0c0c13',
        gold:  '#f0b429',
        white: '#ffffff',
      },
    },
    borderRadius: {
      card: '20px',
      btn:  '14px',
      input:'12px',
    }
  }
}
```
