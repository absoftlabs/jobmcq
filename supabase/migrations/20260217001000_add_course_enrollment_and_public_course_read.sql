CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_id ON public.course_enrollments(user_id);

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'course_enrollments' AND policyname = 'Users read own enrollments'
  ) THEN
    CREATE POLICY "Users read own enrollments"
    ON public.course_enrollments
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'course_enrollments' AND policyname = 'Users enroll themselves'
  ) THEN
    CREATE POLICY "Users enroll themselves"
    ON public.course_enrollments
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'course_enrollments' AND policyname = 'Admins read all enrollments'
  ) THEN
    CREATE POLICY "Admins read all enrollments"
    ON public.course_enrollments
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'course_enrollments' AND policyname = 'Admins manage enrollments'
  ) THEN
    CREATE POLICY "Admins manage enrollments"
    ON public.course_enrollments
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'course_categories' AND policyname = 'Public read active course categories'
  ) THEN
    CREATE POLICY "Public read active course categories"
    ON public.course_categories
    FOR SELECT
    USING (is_active = true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'courses' AND policyname = 'Public read published courses'
  ) THEN
    CREATE POLICY "Public read published courses"
    ON public.courses
    FOR SELECT
    USING (status = 'published');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'course_lessons' AND policyname = 'Public read published course lessons'
  ) THEN
    CREATE POLICY "Public read published course lessons"
    ON public.course_lessons
    FOR SELECT
    USING (is_published = true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lesson_contents' AND policyname = 'Public read lesson contents'
  ) THEN
    CREATE POLICY "Public read lesson contents"
    ON public.lesson_contents
    FOR SELECT
    USING (true);
  END IF;
END $$;
