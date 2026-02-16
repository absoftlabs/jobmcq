ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'BDT';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'courses_price_non_negative'
  ) THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_price_non_negative CHECK (price >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'courses_paid_requires_price'
  ) THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_paid_requires_price CHECK (
        (is_paid = false AND price = 0)
        OR (is_paid = true AND price > 0)
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.course_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'bkash',
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BDT',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_reference TEXT,
  trx_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_payments_user_id ON public.course_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_payments_course_id ON public.course_payments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_payments_status ON public.course_payments(status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_course_payments_trx_id ON public.course_payments(trx_id) WHERE trx_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_course_payments_updated_at'
  ) THEN
    CREATE TRIGGER update_course_payments_updated_at
    BEFORE UPDATE ON public.course_payments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.course_payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'course_payments' AND policyname = 'Users manage own course payments'
  ) THEN
    CREATE POLICY "Users manage own course payments"
    ON public.course_payments
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'course_payments' AND policyname = 'Admins manage all course payments'
  ) THEN
    CREATE POLICY "Admins manage all course payments"
    ON public.course_payments
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DROP POLICY IF EXISTS "Users enroll themselves" ON public.course_enrollments;

CREATE POLICY "Users enroll themselves"
ON public.course_enrollments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = course_id
        AND c.is_paid = false
    )
    OR EXISTS (
      SELECT 1
      FROM public.course_payments cp
      WHERE cp.course_id = course_id
        AND cp.user_id = auth.uid()
        AND cp.status = 'completed'
    )
  )
);
