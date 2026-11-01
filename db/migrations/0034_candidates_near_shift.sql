-- ════════════════════════════════════════════════════════════════════════════
-- Migration 0034 · candidates_near_shift
-- ════════════════════════════════════════════════════════════════════════════
--
-- RPC function to find shift-alert-opted-in candidates with a verified,
-- in-date SIA licence within radius_mi miles of a given lat/lng.
--
-- Distance is computed via Haversine (no PostGIS required).
-- A bounding-box pre-filter eliminates distant rows cheaply before the
-- trig is applied.  The final cut-off uses WHERE in an outer query
-- (not HAVING) so the query plan can use it as a filter, not an aggregate.
--
-- Access: service_role only.  anon and authenticated have NO execute
-- permission — this function must never be callable from the client.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION candidates_near_shift(
  shift_lat  double precision,
  shift_lng  double precision,
  radius_mi  double precision DEFAULT 15
)
RETURNS TABLE (
  candidate_id   uuid,
  email          text,
  first_name     text,
  postcode       text,
  distance_miles double precision
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT candidate_id, email, first_name, postcode, distance_miles
  FROM (
    SELECT
      c.id          AS candidate_id,
      c.email,
      pd.first_name,
      pd.postcode,
      3958.8 * 2 * ASIN(
        SQRT(
          POWER(SIN(RADIANS(pd.postcode_lat - shift_lat)  / 2), 2)
          + COS(RADIANS(shift_lat)) * COS(RADIANS(pd.postcode_lat))
            * POWER(SIN(RADIANS(pd.postcode_lng - shift_lng) / 2), 2)
        )
      ) AS distance_miles
    FROM candidates c
    JOIN personal_details pd ON pd.candidate_id = c.id
    WHERE c.shift_alerts_opt_in = TRUE
      AND pd.postcode_lat IS NOT NULL
      AND pd.postcode_lng IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM sia_licences sl
        WHERE  sl.candidate_id = c.id
          AND  sl.verified     = TRUE
          AND  sl.expiry_date >= CURRENT_DATE
      )
      -- Bounding-box pre-filter (cheap lat/lng range check before trig)
      AND pd.postcode_lat BETWEEN shift_lat - (radius_mi / 69.0)
                              AND shift_lat + (radius_mi / 69.0)
      AND pd.postcode_lng BETWEEN shift_lng - (radius_mi / (69.0 * COS(RADIANS(shift_lat))))
                              AND shift_lng + (radius_mi / (69.0 * COS(RADIANS(shift_lat))))
  ) sub
  WHERE distance_miles <= radius_mi
  ORDER BY distance_miles;
$$;

-- ── Permissions ──────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION candidates_near_shift(double precision, double precision, double precision) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION candidates_near_shift(double precision, double precision, double precision) FROM anon;
REVOKE EXECUTE ON FUNCTION candidates_near_shift(double precision, double precision, double precision) FROM authenticated;
GRANT  EXECUTE ON FUNCTION candidates_near_shift(double precision, double precision, double precision) TO service_role;
