ALTER TABLE public.profiles
  ALTER COLUMN account_status DROP DEFAULT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_account_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_status_check
  CHECK (account_status IN ('pending', 'active', 'suspended', 'deleted'));

ALTER TABLE public.profiles
  ALTER COLUMN account_status SET DEFAULT 'pending';
