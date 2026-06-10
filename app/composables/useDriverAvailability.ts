export function useDriverAvailability() {
  const driverStore = useDriverStore()

  const toggleDay = async (date: string) => {
    await $fetch('/api/taxista/disponibilidad', {
      method: 'PATCH',
      body: { date, isAvailable: true },
    })
    await driverStore.fetchAvailability(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
    )
  }

  const setRange = async (dateFrom: string, dateTo: string, isAvailable: boolean) => {
    await $fetch('/api/taxista/disponibilidad', {
      method: 'PATCH',
      body: { dateFrom, dateTo, isAvailable },
    })
    await driverStore.fetchAvailability(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
    )
  }

  return {
    availability: driverStore.availability,
    loading: driverStore.loading,
    toggleDay,
    setRange,
  }
}
