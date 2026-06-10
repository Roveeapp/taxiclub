export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDb()

  const drivers = await db.execute`
    SELECT d.*, u.email, u.full_name, u.phone,
           (SELECT COUNT(*) FROM vehicles v WHERE v.driver_id = d.id AND v.is_active = TRUE) as vehicle_count
    FROM drivers d
    JOIN users u ON u.id = d.id
    ORDER BY d.created_at DESC
  `

  return drivers
})
