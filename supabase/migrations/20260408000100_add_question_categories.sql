CREATE TABLE IF NOT EXISTS public.question_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.question_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.question_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, slug)
);

ALTER TABLE public.question_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_subcategories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage question categories" ON public.question_categories;
CREATE POLICY "Admins can manage question categories"
ON public.question_categories
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated can view question categories" ON public.question_categories;
CREATE POLICY "Authenticated can view question categories"
ON public.question_categories
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage question subcategories" ON public.question_subcategories;
CREATE POLICY "Admins can manage question subcategories"
ON public.question_subcategories
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated can view question subcategories" ON public.question_subcategories;
CREATE POLICY "Authenticated can view question subcategories"
ON public.question_subcategories
FOR SELECT TO authenticated
USING (true);

DROP TRIGGER IF EXISTS update_question_categories_updated_at ON public.question_categories;
CREATE TRIGGER update_question_categories_updated_at
BEFORE UPDATE ON public.question_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_question_subcategories_updated_at ON public.question_subcategories;
CREATE TRIGGER update_question_subcategories_updated_at
BEFORE UPDATE ON public.question_subcategories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.question_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.question_subcategories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_question_categories_slug ON public.question_categories(slug);
CREATE INDEX IF NOT EXISTS idx_question_subcategories_category_id ON public.question_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_questions_category_id ON public.questions(category_id);
CREATE INDEX IF NOT EXISTS idx_questions_subcategory_id ON public.questions(subcategory_id);

WITH distinct_categories AS (
  SELECT DISTINCT
    trim(category) AS name,
    regexp_replace(lower(trim(category)), '\s+', '-', 'g') AS slug
  FROM public.questions
  WHERE trim(coalesce(category, '')) <> ''
)
INSERT INTO public.question_categories (name, slug)
SELECT name, slug
FROM distinct_categories
ON CONFLICT (slug) DO NOTHING;

WITH distinct_subcategories AS (
  SELECT DISTINCT
    qc.id AS category_id,
    trim(q.topic) AS name,
    regexp_replace(lower(trim(q.topic)), '\s+', '-', 'g') AS slug
  FROM public.questions q
  JOIN public.question_categories qc
    ON qc.slug = regexp_replace(lower(trim(q.category)), '\s+', '-', 'g')
  WHERE trim(coalesce(q.category, '')) <> ''
    AND trim(coalesce(q.topic, '')) <> ''
)
INSERT INTO public.question_subcategories (category_id, name, slug)
SELECT category_id, name, slug
FROM distinct_subcategories
ON CONFLICT (category_id, slug) DO NOTHING;

UPDATE public.questions q
SET category_id = qc.id
FROM public.question_categories qc
WHERE q.category_id IS NULL
  AND trim(coalesce(q.category, '')) <> ''
  AND qc.slug = regexp_replace(lower(trim(q.category)), '\s+', '-', 'g');

UPDATE public.questions q
SET subcategory_id = qs.id
FROM public.question_subcategories qs
JOIN public.question_categories qc ON qc.id = qs.category_id
WHERE q.subcategory_id IS NULL
  AND trim(coalesce(q.category, '')) <> ''
  AND trim(coalesce(q.topic, '')) <> ''
  AND qc.slug = regexp_replace(lower(trim(q.category)), '\s+', '-', 'g')
  AND qs.slug = regexp_replace(lower(trim(q.topic)), '\s+', '-', 'g');
