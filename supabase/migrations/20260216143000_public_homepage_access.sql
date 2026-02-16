-- Allow public users to view live/ended exams on the homepage.
CREATE POLICY "Public can view live and ended exams"
ON public.exams
FOR SELECT
TO anon
USING (status IN ('live', 'ended'));

-- Allow authenticated users (students) to also view ended exams for public leaderboard selection.
CREATE POLICY "Authenticated can view live and ended exams"
ON public.exams
FOR SELECT
TO authenticated
USING (status IN ('live', 'ended') OR public.has_role(auth.uid(), 'admin'));

-- Public leaderboard function (read-only).
CREATE OR REPLACE FUNCTION public.get_public_leaderboard(p_exam_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  rank BIGINT,
  full_name TEXT,
  score NUMERIC,
  time_taken_seconds INTEGER
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
  )
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY
        ba.score DESC NULLS LAST,
        ba.time_taken_seconds ASC NULLS LAST,
        ba.submitted_at ASC
    ) AS rank,
    COALESCE(p.full_name, 'Participant') AS full_name,
    COALESCE(ba.score, 0) AS score,
    COALESCE(ba.time_taken_seconds, 0) AS time_taken_seconds
  FROM best_attempt ba
  LEFT JOIN public.profiles p ON p.user_id = ba.user_id
  LIMIT GREATEST(COALESCE(p_limit, 10), 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_leaderboard(UUID, INTEGER) TO anon, authenticated;
