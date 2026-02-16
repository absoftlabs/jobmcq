ALTER TABLE public.course_payments
ADD COLUMN IF NOT EXISTS payment_id TEXT,
ADD COLUMN IF NOT EXISTS merchant_invoice TEXT,
ADD COLUMN IF NOT EXISTS bkash_payment_status TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_course_payments_payment_id
ON public.course_payments(payment_id)
WHERE payment_id IS NOT NULL;
