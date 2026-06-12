import { defineStore } from 'pinia'

export const useDriverStore = defineStore('driver', () => {
  const vehicles = ref<any[]>([])
  const stations = ref<any[]>([])
  const availability = ref<any[]>([])
  const loading = ref(false)

  async function fetchVehicles() {
    loading.value = true
    try {
      const data = await $fetch('/api/taxista/vehiculos') as any[]
      vehicles.value = data
    } finally {
      loading.value = false
    }
  }

  async function fetchStations() {
    loading.value = true
    try {
      const data = await $fetch('/api/taxista/paradas') as any[]
      stations.value = data
    } finally {
      loading.value = false
    }
  }

  async function fetchAvailability(year: number, month: number) {
    loading.value = true
    try {
      const data = await $fetch('/api/taxista/disponibilidad', {
        query: { year, month },
      })
      availability.value = data as any[]
    } finally {
      loading.value = false
    }
  }

  return {
    vehicles,
    stations,
    availability,
    loading,
    fetchVehicles,
    fetchStations,
    fetchAvailability,
  }
})
