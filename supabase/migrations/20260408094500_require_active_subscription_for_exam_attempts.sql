CREATE OR REPLACE FUNCTION public.has_active_paid_subscription(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_subscriptions us
    WHERE us.user_id = _user_id
      AND us.payment_status = 'paid'
      AND (
        us.subscription_status = 'lifetime'
        OR us.is_lifetime = true
        OR (
          us.subscription_status = 'active'
          AND us.end_date IS NOT NULL
          AND us.end_date > now()
        )
      )
  )
$$;

DROP POLICY IF EXISTS "Users can insert own attempts" ON public.attempts;
CREATE POLICY "Users can insert own attempts"
ON public.attempts
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.has_active_paid_subscription(auth.uid())
);
