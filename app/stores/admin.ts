import { defineStore } from 'pinia'

export const useAdminStore = defineStore('admin', () => {
  const metrics = ref({
    bookingsToday: 0,
    activeDrivers: 0,
    monthlyRevenue: 0,
    activeOffers: 0,
  })
  const loading = ref(false)

  async function fetchMetrics() {
    loading.value = true
    try {
      const data = await $fetch('/api/admin/metrics')
      metrics.value = data
    } finally {
      loading.value = false
    }
  }

  return {
    metrics,
    loading,
    fetchMetrics,
  }
})
