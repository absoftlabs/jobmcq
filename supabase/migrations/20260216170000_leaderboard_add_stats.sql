-- Extend public leaderboard payload with earned coins and total submitted exams.
DROP FUNCTION IF EXISTS public.get_public_leaderboard(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.get_public_leaderboard(p_exam_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  full_name TEXT,
  score NUMERIC,
  time_taken_seconds INTEGER,
  coin_balance INTEGER,
  exams_given INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH best_attempt AS (
    SELECT DISTINCT ON (a.user_id)
      a.user_id,
      a.score,
      a.time_taken_seconds,
      a.submitted_at
    FROM public.attempts a
    WHERE a.exam_id = p_exam_id
      AND a.submitted_at IS NOT NULL
    ORDER BY
      a.user_id,
      a.score DESC NULLS LAST,
      a.time_taken_seconds ASC NULLS LAST,
      a.submitted_at ASC
  ),
  attempt_totals AS (
    SELECT
      a.user_id,
      COUNT(*)::INTEGER AS exams_given
    FROM public.attempts a
    WHERE a.submitted_at IS NOT NULL
    GROUP BY a.user_id
  )
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY
        ba.score DESC NULLS LAST,
        ba.time_taken_seconds ASC NULLS LAST,
        ba.submitted_at ASC
    ) AS rank,
    ba.user_id,
    COALESCE(p.full_name, 'Participant') AS full_name,
    COALESCE(ba.score, 0) AS score,
    COALESCE(ba.time_taken_seconds, 0) AS time_taken_seconds,
    COALESCE(p.coin_balance, 0)::INTEGER AS coin_balance,
    COALESCE(at.exams_given, 0)::INTEGER AS exams_given
  FROM best_attempt ba
  LEFT JOIN public.profiles p ON p.user_id = ba.user_id
  LEFT JOIN attempt_totals at ON at.user_id = ba.user_id
  LIMIT GREATEST(COALESCE(p_limit, 10), 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_leaderboard(UUID, INTEGER) TO anon, authenticated;
