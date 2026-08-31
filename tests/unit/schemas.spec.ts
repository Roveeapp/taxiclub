import { describe, it, expect } from 'vitest'
import {
  crearReservaSchema, registroSchema, tarifaSchema, zonaSchema,
  crearOfertaSchema, configuracionSchema, errorClienteSchema, registrarCobroSchema,
} from '../../app/server/utils/schemas'

const EN_3_DIAS = new Date(Date.now() + 3 * 86400_000).toISOString()
const PARADA = '11111111-1111-1111-1111-111111111111'

describe('registroSchema', () => {
  it('impide registrarse como admin — la escalada de privilegios que cerró 6f2a', () => {
    const r = registroSchema.safeParse({ email: 'a@b.es', password: 'secreto123', role: 'admin' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0]?.message).toMatch(/cliente o taxista/)
  })

  it('tampoco admite roles inventados', () => {
    for (const role of ['superadmin', 'ADMIN', 'root', '']) {
      expect(registroSchema.safeParse({ email: 'a@b.es', password: 'secreto123', role }).success, role).toBe(false)
    }
  })

  it('permite los dos roles legítimos, y por defecto ninguno', () => {
    expect(registroSchema.safeParse({ email: 'a@b.es', password: 'secreto123', role: 'client' }).success).toBe(true)
    expect(registroSchema.safeParse({ email: 'a@b.es', password: 'secreto123', role: 'driver' }).success).toBe(true)
    expect(registroSchema.safeParse({ email: 'a@b.es', password: 'secreto123' }).success).toBe(true)
  })

  it('exige correo con forma y contraseña de al menos 6', () => {
    expect(registroSchema.safeParse({ email: 'no-es-correo', password: 'secreto123' }).success).toBe(false)
    expect(registroSchema.safeParse({ email: 'a@b.es', password: '12345' }).success).toBe(false)
  })
})

describe('crearReservaSchema', () => {
  const base = { originStationId: PARADA, destinationAddress: 'Oviedo', pickupAt: EN_3_DIAS }

  it('acepta una reserva mínima válida', () => {
    expect(crearReservaSchema.safeParse(base).success).toBe(true)
  })

  it('exige un origen, sea parada o dirección', () => {
    expect(crearReservaSchema.safeParse({ destinationAddress: 'Oviedo', pickupAt: EN_3_DIAS }).success).toBe(false)
    expect(crearReservaSchema.safeParse({ originAddress: 'Calle X', destinationAddress: 'Oviedo', pickupAt: EN_3_DIAS }).success).toBe(true)
  })

  it('rechaza pasajeros fuera de rango y no enteros', () => {
    for (const passengers of [0, -1, 9, 2.5]) {
      expect(crearReservaSchema.safeParse({ ...base, passengers }).success, String(passengers)).toBe(false)
    }
    expect(crearReservaSchema.safeParse({ ...base, passengers: 4 }).success).toBe(true)
  })

  it('rechaza identificadores que no son UUID', () => {
    expect(crearReservaSchema.safeParse({ ...base, originStationId: 'parada-1' }).success).toBe(false)
  })

  it('rechaza coordenadas imposibles', () => {
    expect(crearReservaSchema.safeParse({ ...base, destinationLat: 200 }).success).toBe(false)
    expect(crearReservaSchema.safeParse({ ...base, destinationLng: -999 }).success).toBe(false)
  })

  it('acepta que el cliente aún envíe precio, pero no lo propaga como número', () => {
    // El servidor lo ignora; el esquema solo evita que el envío rompa la petición
    const r = crearReservaSchema.safeParse({ ...base, basePrice: 0.01, totalPrice: 0.01 })
    expect(r.success).toBe(true)
  })
})

describe('tarifaSchema', () => {
  it('no admite tarifas de cero, negativas ni absurdas', () => {
    // El límite es el mismo que comprueba la ruta: > 100 €/km se rechaza
    for (const pricePerKm of [0, -1, 100.01, 500]) {
      expect(tarifaSchema.safeParse({ pricePerKm }).success, String(pricePerKm)).toBe(false)
    }
    for (const pricePerKm of [0.01, 1.2, 100]) {
      expect(tarifaSchema.safeParse({ pricePerKm }).success, String(pricePerKm)).toBe(true)
    }
  })

  it('admite vaciar el campo para volver a la tarifa global', () => {
    // El panel envía '' al borrar el valor; el esquema lo normaliza a null
    for (const pricePerKm of ['', null]) {
      const r = tarifaSchema.safeParse({ pricePerKm })
      expect(r.success, JSON.stringify(pricePerKm)).toBe(true)
      if (r.success) expect(r.data.pricePerKm).toBe(null)
    }
  })
})

describe('zonaSchema', () => {
  it('solo admite los dos modos que entiende la ruta', () => {
    expect(zonaSchema.safeParse({ stationId: PARADA, mode: 'exclude' }).success).toBe(true)
    expect(zonaSchema.safeParse({ stationId: PARADA, mode: 'borrar_todo' }).success).toBe(false)
  })

  it('con precio fijo, exige un precio mayor que cero', () => {
    expect(zonaSchema.safeParse({ stationId: PARADA, mode: 'fixed_price' }).success).toBe(false)
    expect(zonaSchema.safeParse({ stationId: PARADA, mode: 'fixed_price', fixedPrice: 0 }).success).toBe(false)
    expect(zonaSchema.safeParse({ stationId: PARADA, mode: 'fixed_price', fixedPrice: 30 }).success).toBe(true)
  })
})

describe('crearOfertaSchema', () => {
  it('no deja que la oferta termine antes de empezar', () => {
    const r = crearOfertaSchema.safeParse({
      destinationStationId: PARADA,
      availableFrom: new Date(Date.now() + 7200_000).toISOString(),
      availableUntil: new Date(Date.now() + 3600_000).toISOString(),
    })
    expect(r.success).toBe(false)
  })

  it('limita el descuento al 100 %', () => {
    const base = {
      destinationStationId: PARADA,
      availableFrom: new Date(Date.now() + 3600_000).toISOString(),
      availableUntil: new Date(Date.now() + 7200_000).toISOString(),
    }
    expect(crearOfertaSchema.safeParse({ ...base, discountPct: 500 }).success).toBe(false)
    expect(crearOfertaSchema.safeParse({ ...base, discountPct: 40 }).success).toBe(true)
  })
})

describe('configuracionSchema', () => {
  it('solo admite las claves de configuración conocidas', () => {
    expect(configuracionSchema.safeParse({ price_per_km: '1.5' }).success).toBe(true)
    expect(configuracionSchema.safeParse({ clave_inventada: 'x' }).success).toBe(false)
  })

  it('rechaza un cuerpo vacío', () => {
    expect(configuracionSchema.safeParse({}).success).toBe(false)
  })
})

describe('errorClienteSchema', () => {
  it('corta los mensajes desmedidos en lugar de registrarlos', () => {
    expect(errorClienteSchema.safeParse({ message: 'a'.repeat(6000) }).success).toBe(false)
    expect(errorClienteSchema.safeParse({ message: 'fallo al pagar' }).success).toBe(true)
  })
})

describe('registrarCobroSchema', () => {
  it('admite los cuatro métodos de cobro', () => {
    for (const method of ['transfer', 'stripe', 'cash', 'adjustment']) {
      expect(registrarCobroSchema.safeParse({ amount: 65, method }).success, method).toBe(true)
    }
  })

  it('rechaza métodos inventados', () => {
    expect(registrarCobroSchema.safeParse({ amount: 65, method: 'bizum' }).success).toBe(false)
  })

  it('acepta importes negativos: una devolución es un asiento, no un borrado', () => {
    expect(registrarCobroSchema.safeParse({ amount: -25, method: 'adjustment' }).success).toBe(true)
  })

  it('no admite un importe de cero, que no sería un movimiento', () => {
    expect(registrarCobroSchema.safeParse({ amount: 0, method: 'transfer' }).success).toBe(false)
  })

  it('corta importes desmedidos', () => {
    expect(registrarCobroSchema.safeParse({ amount: 999_999, method: 'transfer' }).success).toBe(false)
  })

  it('la referencia y las notas son opcionales pero acotadas', () => {
    expect(registrarCobroSchema.safeParse({ amount: 65, method: 'transfer', reference: 'TRF-001' }).success).toBe(true)
    expect(registrarCobroSchema.safeParse({ amount: 65, method: 'transfer', reference: 'x'.repeat(200) }).success).toBe(false)
  })
})
