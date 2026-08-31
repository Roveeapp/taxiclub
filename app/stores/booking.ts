import { defineStore } from 'pinia'

interface BookingFormData {
  originStationId?: string
  originAddress?: string
  originLat?: number | null
  originLng?: number | null
  destination: string
  // La parada de destino y sus coordenadas las elige el cliente en el buscador.
  // Antes no viajaban hasta aquí, y el servidor tenía que adivinar la parada a
  // partir del texto libre, con la que activa la tarifa fija del conductor.
  destinationStationId?: string
  destinationLat?: number | null
  destinationLng?: number | null
  date: string
  time: string
  passengers: number
  luggageBig: number
  luggageHand: number
  accessoryIds?: string[]
  needsChildSeat?: boolean
  needsPetFriendly?: boolean
  needsAccessible?: boolean
  needsLargeVehicle?: boolean
  guestName?: string
  guestEmail?: string
  guestPhone?: string
}

export const useBookingStore = defineStore('booking', () => {
  const formData = ref<BookingFormData | null>(null)
  const currentBooking = ref<any>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  function setFormData(data: BookingFormData) {
    formData.value = data
  }

  function clearFormData() {
    formData.value = null
  }

  function setCurrentBooking(booking: any) {
    currentBooking.value = booking
  }

  return {
    formData,
    currentBooking,
    loading,
    error,
    setFormData,
    clearFormData,
    setCurrentBooking,
  }
})
