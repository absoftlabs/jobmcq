CREATE TABLE IF NOT EXISTS public.course_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  is_completed BOOLEAN NOT NULL DEFAULT TRUE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_course_lesson_progress_user_id
  ON public.course_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_course_lesson_progress_course_id
  ON public.course_lesson_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_course_lesson_progress_lesson_id
  ON public.course_lesson_progress(lesson_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_course_lesson_progress_updated_at'
  ) THEN
    CREATE TRIGGER update_course_lesson_progress_updated_at
    BEFORE UPDATE ON public.course_lesson_progress
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.course_lesson_progress ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_lesson_progress'
      AND policyname = 'Users manage own lesson progress'
  ) THEN
    CREATE POLICY "Users manage own lesson progress"
    ON public.course_lesson_progress
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_lesson_progress'
      AND policyname = 'Admins read all lesson progress'
  ) THEN
    CREATE POLICY "Admins read all lesson progress"
    ON public.course_lesson_progress
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
