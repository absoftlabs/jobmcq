CREATE OR REPLACE FUNCTION public.get_public_global_leaderboard(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  full_name TEXT,
  points INTEGER,
  passed_exams INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH passed_counts AS (
    SELECT
      a.user_id,
      COUNT(*)::INTEGER AS passed_exams
    FROM public.attempts a
    WHERE a.is_passed = true
      AND a.submitted_at IS NOT NULL
    GROUP BY a.user_id
  ),
  ranked AS (
    SELECT
      p.user_id,
      COALESCE(p.full_name, 'Participant') AS full_name,
      COALESCE(p.coin_balance, 0)::INTEGER AS points,
      COALESCE(pc.passed_exams, 0)::INTEGER AS passed_exams
    FROM public.profiles p
    LEFT JOIN passed_counts pc ON pc.user_id = p.user_id
  )
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY
        r.points DESC,
        r.passed_exams DESC,
        r.full_name ASC
    ) AS rank,
    r.user_id,
    r.full_name,
    r.points,
    r.passed_exams
  FROM ranked r
  LIMIT GREATEST(COALESCE(p_limit, 10), 1);
$$;

REVOKE ALL ON FUNCTION public.get_public_global_leaderboard(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_global_leaderboard(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_global_leaderboard(INTEGER) TO authenticated;
