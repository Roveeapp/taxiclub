import { describe, it, expect } from 'vitest'
import { requiredRolesForPath, isRoleAllowed } from '../../app/server/utils/accessControl'

describe('requiredRolesForPath', () => {
  it('protege todas las rutas de taxista', () => {
    for (const path of [
      '/api/taxista/vehiculos',
      '/api/taxista/ofertas',
      '/api/taxista/zonas',
      '/api/taxista/tarifa',
      '/api/taxista/liquidaciones',
      '/api/taxista/reservas/abc/confirmar',
      '/api/taxista/vehiculos/abc/foto',
    ]) {
      expect(requiredRolesForPath(path), path).toEqual(['driver', 'admin'])
    }
  })

  it('admite al admin en el panel de taxista, porque en este club también conduce', () => {
    expect(requiredRolesForPath('/api/taxista/vehiculos')).toContain('admin')
  })

  it('reserva las rutas de admin solo al admin', () => {
    expect(requiredRolesForPath('/api/admin/reservas')).toEqual(['admin'])
    expect(requiredRolesForPath('/api/admin/conductores/abc')).toEqual(['admin'])
  })

  it('deja pasar las rutas públicas y las del cliente', () => {
    for (const path of [
      '/api/config',
      '/api/bookings',
      '/api/ofertas',
      '/api/saved-addresses',
      '/api/auth/me',
      '/api/stations',
    ]) {
      expect(requiredRolesForPath(path), path).toBeNull()
    }
  })

  it('no se deja engañar por rutas que solo contienen el prefijo', () => {
    // El prefijo tiene que estar al principio, no en cualquier posición
    expect(requiredRolesForPath('/api/publico/api/admin/x')).toBeNull()
    expect(requiredRolesForPath('/api/taxistas-publico')).toBeNull()
  })
})

describe('isRoleAllowed', () => {
  it('deja pasar al rol admitido', () => {
    expect(isRoleAllowed('driver', ['driver', 'admin'])).toBe(true)
    expect(isRoleAllowed('admin', ['driver', 'admin'])).toBe(true)
    expect(isRoleAllowed('admin', ['admin'])).toBe(true)
  })

  it('bloquea al cliente en rutas de taxista y de admin', () => {
    expect(isRoleAllowed('client', ['driver', 'admin'])).toBe(false)
    expect(isRoleAllowed('client', ['admin'])).toBe(false)
  })

  it('bloquea al taxista en rutas de admin', () => {
    expect(isRoleAllowed('driver', ['admin'])).toBe(false)
  })

  it('sin rol resuelto, no pasa', () => {
    expect(isRoleAllowed(undefined, ['driver', 'admin'])).toBe(false)
    expect(isRoleAllowed(null, ['admin'])).toBe(false)
    expect(isRoleAllowed('', ['admin'])).toBe(false)
  })
})
