-- Optimized query to fetch active shipments and their latest real-time tracking coordinates
-- Uses a LATERAL JOIN to efficiently retrieve only the single most recent tracking point per shipment

SELECT 
    s.id,
    s.business_id,
    s.pickup_address,
    s.drop_address,
    st_asgeojson(s.pickup_location)::jsonb as pickup_location,
    st_asgeojson(s.drop_location)::jsonb as drop_location,
    s.weight_kg,
    s.price,
    s.is_partial,
    s.status,
    s.created_at,
    t.location as current_truck_location,
    t.recorded_at as last_tracked_at
FROM shipments s
LEFT JOIN LATERAL (
    SELECT location, recorded_at
    FROM tracking
    WHERE booking_id = s.id
    ORDER BY recorded_at DESC
    LIMIT 1
) t ON true
WHERE s.status IN ('in_transit', 'active', 'dispatched')
ORDER BY s.created_at DESC;
