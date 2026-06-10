export function useBookingRealtime(bookingId: string) {
  const supabase = useSupabaseClient()
  const booking = ref<any>(null)
  const assignment = ref<any>(null)

  const channel = supabase
    .channel(`booking:${bookingId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'bookings',
        filter: `id=eq.${bookingId}`,
      },
      (payload) => {
        booking.value = payload.new
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'booking_assignments',
        filter: `booking_id=eq.${bookingId}`,
      },
      (payload) => {
        assignment.value = payload.new
      },
    )
    .subscribe()

  onUnmounted(() => {
    supabase.removeChannel(channel)
  })

  return { booking, assignment }
}
