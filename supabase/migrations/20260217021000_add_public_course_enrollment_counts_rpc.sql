CREATE OR REPLACE FUNCTION public.get_course_enrollment_counts(course_ids UUID[])
RETURNS TABLE(course_id UUID, total BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ce.course_id, COUNT(*)::BIGINT AS total
  FROM public.course_enrollments ce
  WHERE ce.course_id = ANY(course_ids)
  GROUP BY ce.course_id
$$;

REVOKE ALL ON FUNCTION public.get_course_enrollment_counts(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_course_enrollment_counts(UUID[]) TO anon;
GRANT EXECUTE ON FUNCTION public.get_course_enrollment_counts(UUID[]) TO authenticated;
