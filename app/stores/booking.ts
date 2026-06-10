import { defineStore } from 'pinia'

interface BookingFormData {
  originStationId: string
  destination: string
  date: string
  time: string
  passengers: number
  luggageBig: number
  luggageHand: number
  needsChildSeat: boolean
  needsPetFriendly: boolean
  needsAccessible: boolean
  needsLargeVehicle: boolean
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
