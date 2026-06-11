export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const sql = useSql()

  const vehicles = await sql`
    SELECT v.*, COALESCE(
      json_agg(json_build_object('id', a.id, 'name', a.name, 'icon', a.icon))
        FILTER (WHERE a.id IS NOT NULL),
      '[]'::json
    ) AS accessories
    FROM vehicles v
    LEFT JOIN vehicle_accessories va ON va.vehicle_id = v.id
    LEFT JOIN accessories a ON a.id = va.accessory_id
    WHERE v.driver_id = ${user.id} AND v.is_active = TRUE
    GROUP BY v.id
    ORDER BY v.created_at DESC
  `

  return vehicles
})
