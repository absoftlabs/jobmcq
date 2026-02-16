-- Award exam reward coins once when a passed attempt is submitted.
CREATE OR REPLACE FUNCTION public.apply_attempt_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward INTEGER := 0;
BEGIN
  -- Guard for safety. Trigger WHEN clause already narrows this.
  IF NEW.submitted_at IS NULL OR OLD.submitted_at IS NOT NULL OR NEW.is_passed IS DISTINCT FROM true OR COALESCE(NEW.coins_awarded, false) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(reward_coins, 0)
  INTO v_reward
  FROM public.exams
  WHERE id = NEW.exam_id;

  IF v_reward <= 0 THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles
  SET coin_balance = coin_balance + v_reward
  WHERE user_id = NEW.user_id;

  INSERT INTO public.coin_transactions (user_id, amount, transaction_type, reference_id, description)
  VALUES (NEW.user_id, v_reward, 'reward', NEW.id, 'Exam pass reward');

  NEW.coins_awarded := true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_attempt_reward ON public.attempts;

CREATE TRIGGER trg_apply_attempt_reward
BEFORE UPDATE ON public.attempts
FOR EACH ROW
WHEN (
  NEW.submitted_at IS NOT NULL
  AND OLD.submitted_at IS NULL
  AND NEW.is_passed = true
  AND COALESCE(NEW.coins_awarded, false) = false
)
EXECUTE FUNCTION public.apply_attempt_reward();

-- Backfill rewards for already-submitted passed attempts that never got credited.
WITH eligible AS (
  SELECT a.id AS attempt_id, a.user_id, e.reward_coins
  FROM public.attempts a
  JOIN public.exams e ON e.id = a.exam_id
  WHERE a.submitted_at IS NOT NULL
    AND a.is_passed = true
    AND COALESCE(a.coins_awarded, false) = false
    AND COALESCE(e.reward_coins, 0) > 0
    AND NOT EXISTS (
      SELECT 1
      FROM public.coin_transactions ct
      WHERE ct.reference_id = a.id
        AND ct.transaction_type = 'reward'
    )
),
per_user AS (
  SELECT user_id, SUM(reward_coins)::INTEGER AS total_reward
  FROM eligible
  GROUP BY user_id
),
inserted_tx AS (
  INSERT INTO public.coin_transactions (user_id, amount, transaction_type, reference_id, description)
  SELECT user_id, reward_coins, 'reward', attempt_id, 'Exam pass reward (backfill)'
  FROM eligible
  RETURNING reference_id
)
UPDATE public.profiles p
SET coin_balance = p.coin_balance + pu.total_reward
FROM per_user pu
WHERE p.user_id = pu.user_id;

UPDATE public.attempts a
SET coins_awarded = true
WHERE a.id IN (
  SELECT attempt_id
  FROM (
    SELECT a2.id AS attempt_id
    FROM public.attempts a2
    JOIN public.exams e2 ON e2.id = a2.exam_id
    WHERE a2.submitted_at IS NOT NULL
      AND a2.is_passed = true
      AND COALESCE(a2.coins_awarded, false) = false
      AND COALESCE(e2.reward_coins, 0) > 0
      AND EXISTS (
        SELECT 1
        FROM public.coin_transactions ct2
        WHERE ct2.reference_id = a2.id
          AND ct2.transaction_type = 'reward'
      )
  ) s
);
