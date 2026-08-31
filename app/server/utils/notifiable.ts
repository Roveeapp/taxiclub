/**
 * Forma mínima de una reserva para los servicios de notificación.
 *
 * Declara solo los campos que notifications.ts y webpush.ts leen de verdad, en
 * lugar de aceptar `any`. El índice abierto permite pasar la fila completa que
 * devuelve la base de datos sin tener que enumerarla entera.
 */
export interface ReservaNotificable {
  id: string
  client_id?: string | null
  guest_email?: string | null
  guest_name?: string | null
  guest_phone?: string | null
  origin_station_id?: string | null
  origin_address?: string | null
  destination_address?: string | null
  pickup_at?: string | null
  passengers?: number | null
  total_price?: number | string | null
  [columna: string]: unknown
}
