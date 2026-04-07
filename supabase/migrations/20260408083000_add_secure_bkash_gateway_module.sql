DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'payment_connection_status'
  ) THEN
    CREATE TYPE public.payment_connection_status AS ENUM ('connected', 'failed', 'not_tested');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'payment_log_status'
  ) THEN
    CREATE TYPE public.payment_log_status AS ENUM ('success', 'error', 'warning', 'info');
  END IF;
END $$;

ALTER TABLE public.payment_gateway_settings
ADD COLUMN IF NOT EXISTS provider_name TEXT NOT NULL DEFAULT 'bkash',
ADD COLUMN IF NOT EXISTS payment_title TEXT NOT NULL DEFAULT 'Pay with bKash',
ADD COLUMN IF NOT EXISTS payment_description TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'BDT',
ADD COLUMN IF NOT EXISTS is_sandbox BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS show_on_checkout BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_logging BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_tokenized BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS callback_base_url TEXT,
ADD COLUMN IF NOT EXISTS success_url TEXT,
ADD COLUMN IF NOT EXISTS failure_url TEXT,
ADD COLUMN IF NOT EXISTS cancel_url TEXT,
ADD COLUMN IF NOT EXISTS redirect_success_url TEXT,
ADD COLUMN IF NOT EXISTS redirect_failure_url TEXT,
ADD COLUMN IF NOT EXISTS redirect_cancel_url TEXT,
ADD COLUMN IF NOT EXISTS standard_username_encrypted TEXT,
ADD COLUMN IF NOT EXISTS standard_password_encrypted TEXT,
ADD COLUMN IF NOT EXISTS standard_app_key_encrypted TEXT,
ADD COLUMN IF NOT EXISTS standard_app_secret_encrypted TEXT,
ADD COLUMN IF NOT EXISTS standard_base_url TEXT,
ADD COLUMN IF NOT EXISTS standard_grant_token_endpoint TEXT NOT NULL DEFAULT '/tokenized/checkout/token/grant',
ADD COLUMN IF NOT EXISTS standard_refresh_token_endpoint TEXT NOT NULL DEFAULT '/tokenized/checkout/token/refresh',
ADD COLUMN IF NOT EXISTS standard_create_payment_endpoint TEXT NOT NULL DEFAULT '/tokenized/checkout/create',
ADD COLUMN IF NOT EXISTS standard_execute_payment_endpoint TEXT NOT NULL DEFAULT '/tokenized/checkout/execute',
ADD COLUMN IF NOT EXISTS standard_query_payment_endpoint TEXT NOT NULL DEFAULT '/tokenized/checkout/payment/status',
ADD COLUMN IF NOT EXISTS standard_refund_endpoint TEXT NOT NULL DEFAULT '/tokenized/checkout/payment/refund',
ADD COLUMN IF NOT EXISTS standard_search_transaction_endpoint TEXT NOT NULL DEFAULT '/tokenized/checkout/general/searchTransaction',
ADD COLUMN IF NOT EXISTS tokenized_username_encrypted TEXT,
ADD COLUMN IF NOT EXISTS tokenized_password_encrypted TEXT,
ADD COLUMN IF NOT EXISTS tokenized_app_key_encrypted TEXT,
ADD COLUMN IF NOT EXISTS tokenized_app_secret_encrypted TEXT,
ADD COLUMN IF NOT EXISTS tokenized_base_url TEXT,
ADD COLUMN IF NOT EXISTS tokenized_grant_token_endpoint TEXT NOT NULL DEFAULT '/tokenized/checkout/token/grant',
ADD COLUMN IF NOT EXISTS tokenized_refresh_token_endpoint TEXT NOT NULL DEFAULT '/tokenized/checkout/token/refresh',
ADD COLUMN IF NOT EXISTS tokenized_create_endpoint TEXT NOT NULL DEFAULT '/tokenized/checkout/create',
ADD COLUMN IF NOT EXISTS tokenized_execute_endpoint TEXT NOT NULL DEFAULT '/tokenized/checkout/execute',
ADD COLUMN IF NOT EXISTS tokenized_agreement_status_endpoint TEXT NOT NULL DEFAULT '/tokenized/checkout/agreement/status',
ADD COLUMN IF NOT EXISTS tokenized_cancel_agreement_endpoint TEXT NOT NULL DEFAULT '/tokenized/checkout/agreement/cancel',
ADD COLUMN IF NOT EXISTS tokenized_payment_status_endpoint TEXT NOT NULL DEFAULT '/tokenized/checkout/payment/status',
ADD COLUMN IF NOT EXISTS tokenized_confirm_endpoint TEXT NOT NULL DEFAULT '/tokenized/checkout/payment/confirm',
ADD COLUMN IF NOT EXISTS tokenized_refund_endpoint TEXT NOT NULL DEFAULT '/tokenized/checkout/payment/refund',
ADD COLUMN IF NOT EXISTS tokenized_search_transaction_endpoint TEXT NOT NULL DEFAULT '/tokenized/checkout/general/searchTransaction',
ADD COLUMN IF NOT EXISTS last_standard_connection_status public.payment_connection_status NOT NULL DEFAULT 'not_tested',
ADD COLUMN IF NOT EXISTS last_standard_tested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_standard_test_message TEXT,
ADD COLUMN IF NOT EXISTS last_tokenized_connection_status public.payment_connection_status NOT NULL DEFAULT 'not_tested',
ADD COLUMN IF NOT EXISTS last_tokenized_tested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_tokenized_test_message TEXT;

UPDATE public.payment_gateway_settings
SET
  provider_name = COALESCE(NULLIF(provider_name, ''), provider),
  payment_title = COALESCE(NULLIF(payment_title, ''), display_name, 'Pay with bKash'),
  currency = COALESCE(NULLIF(currency, ''), 'BDT')
WHERE provider = 'bkash';

INSERT INTO public.payment_gateway_settings (
  provider,
  provider_name,
  display_name,
  payment_title,
  payment_description,
  currency,
  is_enabled,
  is_sandbox,
  show_on_checkout,
  enable_logging,
  enable_tokenized
)
SELECT
  'bkash',
  'bkash',
  'bKash',
  'Pay with bKash',
  'Pay securely with bKash checkout.',
  'BDT',
  false,
  true,
  true,
  true,
  false
WHERE NOT EXISTS (
  SELECT 1
  FROM public.payment_gateway_settings
  WHERE provider = 'bkash'
);

CREATE TABLE IF NOT EXISTS public.payment_gateway_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL DEFAULT 'bkash',
  log_type TEXT NOT NULL,
  endpoint_name TEXT,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.payment_log_status NOT NULL DEFAULT 'info',
  http_status INTEGER,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_gateway_logs_provider_name
ON public.payment_gateway_logs(provider_name);

CREATE INDEX IF NOT EXISTS idx_payment_gateway_logs_created_at
ON public.payment_gateway_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.payment_gateway_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL DEFAULT 'bkash',
  token_type TEXT NOT NULL,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_masked TEXT,
  expires_at TIMESTAMPTZ,
  last_refreshed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payment_gateway_tokens_token_type_check CHECK (token_type IN ('standard', 'tokenized')),
  CONSTRAINT payment_gateway_tokens_provider_type_unique UNIQUE (provider_name, token_type)
);

CREATE INDEX IF NOT EXISTS idx_payment_gateway_tokens_provider_name
ON public.payment_gateway_tokens(provider_name);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_payment_gateway_tokens_updated_at'
  ) THEN
    CREATE TRIGGER update_payment_gateway_tokens_updated_at
    BEFORE UPDATE ON public.payment_gateway_tokens
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.payment_gateway_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateway_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_gateway_settings'
      AND policyname = 'Admins read payment gateway settings'
  ) THEN
    CREATE POLICY "Admins read payment gateway settings"
    ON public.payment_gateway_settings
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_gateway_logs'
      AND policyname = 'Admins read payment gateway logs'
  ) THEN
    CREATE POLICY "Admins read payment gateway logs"
    ON public.payment_gateway_logs
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_gateway_logs'
      AND policyname = 'Admins manage payment gateway logs'
  ) THEN
    CREATE POLICY "Admins manage payment gateway logs"
    ON public.payment_gateway_logs
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_gateway_tokens'
      AND policyname = 'Admins read payment gateway token metadata'
  ) THEN
    CREATE POLICY "Admins read payment gateway token metadata"
    ON public.payment_gateway_tokens
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_public_bkash_config()
RETURNS TABLE (
  provider_name TEXT,
  payment_title TEXT,
  payment_description TEXT,
  currency TEXT,
  environment_mode TEXT,
  show_on_checkout BOOLEAN,
  is_enabled BOOLEAN,
  enable_tokenized BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    provider_name,
    payment_title,
    payment_description,
    currency,
    CASE WHEN is_sandbox THEN 'sandbox' ELSE 'live' END AS environment_mode,
    show_on_checkout,
    is_enabled,
    enable_tokenized
  FROM public.payment_gateway_settings
  WHERE provider = 'bkash'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_bkash_config() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_bkash_token_statuses()
RETURNS TABLE (
  token_type TEXT,
  token_exists BOOLEAN,
  token_masked TEXT,
  expires_at TIMESTAMPTZ,
  last_refreshed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.token_type,
    (t.access_token_encrypted IS NOT NULL AND t.access_token_encrypted <> '') AS token_exists,
    t.token_masked,
    t.expires_at,
    t.last_refreshed_at,
    t.created_at,
    t.updated_at
  FROM public.payment_gateway_tokens t
  WHERE t.provider_name = 'bkash'
    AND public.has_role(auth.uid(), 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.get_bkash_token_statuses() TO authenticated;
