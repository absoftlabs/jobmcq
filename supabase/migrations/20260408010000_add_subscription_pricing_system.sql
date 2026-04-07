DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_billing_type') THEN
    CREATE TYPE public.subscription_billing_type AS ENUM ('one_time', 'recurring');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_duration_type') THEN
    CREATE TYPE public.subscription_duration_type AS ENUM ('days', 'months', 'years', 'lifetime');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_payment_status') THEN
    CREATE TYPE public.subscription_payment_status AS ENUM ('pending', 'paid', 'failed', 'expired', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE public.subscription_status AS ENUM ('active', 'expired', 'cancelled', 'pending', 'lifetime');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'package_feature_type') THEN
    CREATE TYPE public.package_feature_type AS ENUM ('text', 'boolean', 'number', 'unlimited', 'not_included');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'package_feature_icon_type') THEN
    CREATE TYPE public.package_feature_icon_type AS ENUM ('check', 'cross', 'badge', 'numeric_pill');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.subscription_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  full_description TEXT,
  regular_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sale_price NUMERIC(10,2),
  currency TEXT NOT NULL DEFAULT 'BDT',
  billing_type public.subscription_billing_type NOT NULL DEFAULT 'one_time',
  duration_type public.subscription_duration_type NOT NULL DEFAULT 'months',
  duration_value INTEGER,
  is_lifetime BOOLEAN NOT NULL DEFAULT false,
  badge_text TEXT,
  badge_color TEXT,
  button_text TEXT NOT NULL DEFAULT 'Subscribe',
  button_url TEXT,
  accent_color TEXT,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_highlighted BOOLEAN NOT NULL DEFAULT false,
  show_on_pricing_page BOOLEAN NOT NULL DEFAULT true,
  show_on_homepage BOOLEAN NOT NULL DEFAULT false,
  available_for_guests BOOLEAN NOT NULL DEFAULT true,
  available_for_logged_in BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  visibility TEXT NOT NULL DEFAULT 'public',
  sort_order INTEGER NOT NULL DEFAULT 0,
  trial_enabled BOOLEAN NOT NULL DEFAULT false,
  trial_days INTEGER,
  renewal_allowed BOOLEAN NOT NULL DEFAULT true,
  limit_purchase_per_user INTEGER,
  allow_upgrade BOOLEAN NOT NULL DEFAULT true,
  allow_downgrade BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscription_package_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.subscription_packages(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  feature_label TEXT NOT NULL,
  feature_value TEXT,
  feature_type public.package_feature_type NOT NULL DEFAULT 'text',
  icon_type public.package_feature_icon_type NOT NULL DEFAULT 'check',
  is_highlighted BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscription_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.subscription_packages(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BDT',
  payment_method TEXT NOT NULL DEFAULT 'manual',
  payment_status public.subscription_payment_status NOT NULL DEFAULT 'pending',
  transaction_id TEXT,
  order_notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.subscription_packages(id) ON DELETE SET NULL,
  package_name TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  renewal_date TIMESTAMPTZ,
  is_lifetime BOOLEAN NOT NULL DEFAULT false,
  payment_status public.subscription_payment_status NOT NULL DEFAULT 'pending',
  subscription_status public.subscription_status NOT NULL DEFAULT 'pending',
  amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BDT',
  transaction_id TEXT,
  order_id UUID REFERENCES public.subscription_orders(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscription_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  pricing_page_title TEXT NOT NULL DEFAULT 'Choose the perfect plan',
  pricing_page_subtitle TEXT NOT NULL DEFAULT 'Flexible subscription packages for every serious MCQ learner.',
  currency_symbol TEXT NOT NULL DEFAULT 'BDT',
  pricing_enabled BOOLEAN NOT NULL DEFAULT true,
  show_discount_badge BOOLEAN NOT NULL DEFAULT true,
  show_popular_ribbon BOOLEAN NOT NULL DEFAULT true,
  show_comparison_table BOOLEAN NOT NULL DEFAULT true,
  show_faq BOOLEAN NOT NULL DEFAULT false,
  show_testimonials BOOLEAN NOT NULL DEFAULT false,
  show_support_block BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_package_id UUID REFERENCES public.subscription_packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subscription_packages_active ON public.subscription_packages(active, sort_order);
CREATE INDEX IF NOT EXISTS idx_subscription_package_features_package_id ON public.subscription_package_features(package_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_subscription_orders_user_id ON public.subscription_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_orders_package_id ON public.subscription_orders(package_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(subscription_status, payment_status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_subscriptions_order_id ON public.user_subscriptions(order_id) WHERE order_id IS NOT NULL;

ALTER TABLE public.subscription_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_package_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read pricing packages" ON public.subscription_packages;
CREATE POLICY "Public can read pricing packages"
ON public.subscription_packages
FOR SELECT
USING (active = true AND show_on_pricing_page = true);

DROP POLICY IF EXISTS "Admins manage subscription packages" ON public.subscription_packages;
CREATE POLICY "Admins manage subscription packages"
ON public.subscription_packages
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Public can read package features" ON public.subscription_package_features;
CREATE POLICY "Public can read package features"
ON public.subscription_package_features
FOR SELECT
USING (
  is_active = true
  AND EXISTS (
    SELECT 1
    FROM public.subscription_packages p
    WHERE p.id = package_id
      AND p.active = true
      AND p.show_on_pricing_page = true
  )
);

DROP POLICY IF EXISTS "Admins manage package features" ON public.subscription_package_features;
CREATE POLICY "Admins manage package features"
ON public.subscription_package_features
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users create own subscription orders" ON public.subscription_orders;
CREATE POLICY "Users create own subscription orders"
ON public.subscription_orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own subscription orders" ON public.subscription_orders;
CREATE POLICY "Users view own subscription orders"
ON public.subscription_orders
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage subscription orders" ON public.subscription_orders;
CREATE POLICY "Admins manage subscription orders"
ON public.subscription_orders
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users view own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users view own subscriptions"
ON public.user_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users create own subscriptions"
ON public.user_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins manage subscriptions"
ON public.user_subscriptions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Public can read subscription settings" ON public.subscription_settings;
CREATE POLICY "Public can read subscription settings"
ON public.subscription_settings
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins manage subscription settings" ON public.subscription_settings;
CREATE POLICY "Admins manage subscription settings"
ON public.subscription_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_subscription_packages_updated_at ON public.subscription_packages;
CREATE TRIGGER update_subscription_packages_updated_at
BEFORE UPDATE ON public.subscription_packages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_orders_updated_at ON public.subscription_orders;
CREATE TRIGGER update_subscription_orders_updated_at
BEFORE UPDATE ON public.subscription_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_settings_updated_at ON public.subscription_settings;
CREATE TRIGGER update_subscription_settings_updated_at
BEFORE UPDATE ON public.subscription_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.subscription_settings (
  id, pricing_page_title, pricing_page_subtitle, currency_symbol,
  pricing_enabled, show_discount_badge, show_popular_ribbon,
  show_comparison_table, show_faq, show_testimonials, show_support_block
)
VALUES (
  1,
  'Flexible plans for every MCQ learner',
  'Choose the package that matches your exam preparation intensity and unlock premium resources instantly.',
  'BDT',
  true, true, true, true, false, false, true
)
ON CONFLICT (id) DO NOTHING;

WITH seeded_packages AS (
  INSERT INTO public.subscription_packages (
    name, slug, short_description, full_description, regular_price, sale_price, currency,
    billing_type, duration_type, duration_value, is_lifetime, badge_text, badge_color,
    button_text, accent_color, is_popular, is_highlighted, show_on_pricing_page,
    show_on_homepage, available_for_guests, available_for_logged_in, active,
    visibility, sort_order, trial_enabled, trial_days, renewal_allowed,
    allow_upgrade, allow_downgrade
  )
  VALUES
    ('Monthly Plan', 'monthly-plan', '1 month access to core premium MCQ tools.', 'Best for short-term preparation sprints and quick premium access.', 100, NULL, 'BDT', 'one_time', 'months', 1, false, NULL, '#ef4444', 'Subscribe', '#16a34a', false, false, true, true, true, true, true, 'public', 1, false, NULL, true, true, true),
    ('3 Months Plan', '3-months-plan', '3 months access with better value.', 'Balanced package for regular learners who want extended access to premium practice.', 150, NULL, 'BDT', 'one_time', 'months', 3, false, 'Best Value', '#f97316', 'Subscribe', '#0f766e', true, true, true, true, true, true, true, 'public', 2, false, NULL, true, true, true),
    ('6 Months Plan', '6-months-plan', '6 months access for serious preparation.', 'Ideal for competitive exam candidates who need sustained access to practice and resources.', 200, NULL, 'BDT', 'one_time', 'months', 6, false, 'Recommended', '#dc2626', 'Subscribe', '#2563eb', false, false, true, false, true, true, true, 'public', 3, false, NULL, true, true, true),
    ('Yearly Plan', 'yearly-plan', '1 year premium access at the best long-term rate.', 'Unlock a full year of MCQ, notes, downloads and premium content support.', 300, NULL, 'BDT', 'one_time', 'years', 1, false, 'Most Popular', '#b91c1c', 'Subscribe', '#7c3aed', true, true, true, true, true, true, true, 'public', 4, false, NULL, true, true, true),
    ('Lifetime Plan', 'lifetime-plan', 'Pay once and access forever.', 'A single purchase for unlimited premium access without expiry.', 999, NULL, 'BDT', 'one_time', 'lifetime', NULL, true, 'Lifetime', '#1d4ed8', 'Subscribe', '#111827', false, true, true, false, true, true, true, 'public', 5, false, NULL, false, false, false)
  ON CONFLICT (slug) DO UPDATE
  SET
    name = EXCLUDED.name,
    short_description = EXCLUDED.short_description,
    full_description = EXCLUDED.full_description,
    regular_price = EXCLUDED.regular_price,
    sale_price = EXCLUDED.sale_price,
    currency = EXCLUDED.currency,
    billing_type = EXCLUDED.billing_type,
    duration_type = EXCLUDED.duration_type,
    duration_value = EXCLUDED.duration_value,
    is_lifetime = EXCLUDED.is_lifetime,
    badge_text = EXCLUDED.badge_text,
    badge_color = EXCLUDED.badge_color,
    button_text = EXCLUDED.button_text,
    accent_color = EXCLUDED.accent_color,
    is_popular = EXCLUDED.is_popular,
    is_highlighted = EXCLUDED.is_highlighted,
    show_on_pricing_page = EXCLUDED.show_on_pricing_page,
    show_on_homepage = EXCLUDED.show_on_homepage,
    available_for_guests = EXCLUDED.available_for_guests,
    available_for_logged_in = EXCLUDED.available_for_logged_in,
    active = EXCLUDED.active,
    visibility = EXCLUDED.visibility,
    sort_order = EXCLUDED.sort_order,
    trial_enabled = EXCLUDED.trial_enabled,
    trial_days = EXCLUDED.trial_days,
    renewal_allowed = EXCLUDED.renewal_allowed,
    allow_upgrade = EXCLUDED.allow_upgrade,
    allow_downgrade = EXCLUDED.allow_downgrade
  RETURNING id, slug
)
INSERT INTO public.subscription_package_features (
  package_id, feature_key, feature_label, feature_value, feature_type, icon_type, is_highlighted, sort_order, is_active
)
SELECT p.id, f.feature_key, f.feature_label, f.feature_value, f.feature_type::public.package_feature_type,
  f.icon_type::public.package_feature_icon_type, f.is_highlighted, f.sort_order, true
FROM seeded_packages p
JOIN (
  VALUES
    ('monthly-plan', 'free_model_test_limit', 'Free Model Test', '15', 'number', 'numeric_pill', true, 1),
    ('monthly-plan', 'paid_model_test_limit', 'Paid Model Test', '5', 'number', 'numeric_pill', false, 2),
    ('monthly-plan', 'handnote_download_limit', 'Download Hand-Note', '5', 'number', 'numeric_pill', false, 3),
    ('monthly-plan', 'generate_pdf_limit', 'Generate PDF/Print', '5', 'number', 'numeric_pill', false, 4),
    ('monthly-plan', 'paid_video_course_access', 'Paid Video Course', 'false', 'boolean', 'cross', false, 5),
    ('3-months-plan', 'free_model_test_limit', 'Free Model Test', '50', 'number', 'numeric_pill', true, 1),
    ('3-months-plan', 'paid_model_test_limit', 'Paid Model Test', '20', 'number', 'numeric_pill', true, 2),
    ('3-months-plan', 'handnote_download_limit', 'Download Hand-Note', '25', 'number', 'numeric_pill', false, 3),
    ('3-months-plan', 'generate_pdf_limit', 'Generate PDF/Print', '25', 'number', 'numeric_pill', false, 4),
    ('3-months-plan', 'ad_free_content_access', 'Ad Free Content', 'true', 'boolean', 'check', false, 5),
    ('6-months-plan', 'free_model_test_limit', 'Free Model Test', '120', 'number', 'numeric_pill', true, 1),
    ('6-months-plan', 'paid_model_test_limit', 'Paid Model Test', '40', 'number', 'numeric_pill', true, 2),
    ('6-months-plan', 'generate_pdf_limit', 'Generate PDF/Print', '60', 'number', 'numeric_pill', false, 3),
    ('6-months-plan', 'pdf_book_download_limit', 'Download PDF Book (SATT)', '10', 'number', 'numeric_pill', false, 4),
    ('6-months-plan', 'live_support_access', '24/7 Live Support', 'true', 'boolean', 'check', false, 5),
    ('yearly-plan', 'free_model_test_limit', 'Free Model Test', 'Unlimited', 'unlimited', 'badge', true, 1),
    ('yearly-plan', 'paid_model_test_limit', 'Paid Model Test', 'Unlimited', 'unlimited', 'badge', true, 2),
    ('yearly-plan', 'handnote_download_limit', 'Download Hand-Note', 'Unlimited', 'unlimited', 'badge', false, 3),
    ('yearly-plan', 'paid_video_course_access', 'Paid Video Course', 'true', 'boolean', 'check', false, 4),
    ('yearly-plan', 'ad_free_content_access', 'Ad Free Content', 'true', 'boolean', 'check', false, 5),
    ('lifetime-plan', 'free_model_test_limit', 'Free Model Test', 'Unlimited', 'unlimited', 'badge', true, 1),
    ('lifetime-plan', 'paid_model_test_limit', 'Paid Model Test', 'Unlimited', 'unlimited', 'badge', true, 2),
    ('lifetime-plan', 'generate_pdf_limit', 'Generate PDF/Print', 'Unlimited', 'unlimited', 'badge', false, 3),
    ('lifetime-plan', 'paid_video_course_access', 'Paid Video Course', 'true', 'boolean', 'check', false, 4),
    ('lifetime-plan', 'live_support_access', '24/7 Live Support', 'true', 'boolean', 'check', false, 5)
) AS f(slug, feature_key, feature_label, feature_value, feature_type, icon_type, is_highlighted, sort_order)
ON p.slug = f.slug
ON CONFLICT DO NOTHING;
