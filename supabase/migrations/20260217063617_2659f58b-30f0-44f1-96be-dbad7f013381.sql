
-- Flash Card Types enum
CREATE TYPE public.flash_card_type AS ENUM ('flip', 'mcq', 'true_false', 'image');

-- Flash Card Categories (reusable topic grouping)
CREATE TABLE public.flash_card_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.flash_card_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active flash card categories"
  ON public.flash_card_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage flash card categories"
  ON public.flash_card_categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Flash Cards table
CREATE TABLE public.flash_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.flash_card_categories(id) ON DELETE SET NULL,
  card_type public.flash_card_type NOT NULL DEFAULT 'flip',
  question TEXT NOT NULL,
  answer TEXT, -- for flip cards
  options JSONB DEFAULT '[]'::jsonb, -- for MCQ/TF: [{text, is_correct}]
  image_url TEXT, -- for image-based cards
  explanation TEXT,
  difficulty TEXT NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  coin_points INTEGER NOT NULL DEFAULT 1,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  topic TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.flash_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view enabled flash cards"
  ON public.flash_cards FOR SELECT USING (true);
CREATE POLICY "Admins can manage flash cards"
  ON public.flash_cards FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Flash Card Game Sessions (logged-in users only)
CREATE TABLE public.flash_card_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.flash_card_categories(id) ON DELETE SET NULL,
  total_cards INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  wrong_answers INTEGER NOT NULL DEFAULT 0,
  coins_earned INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.flash_card_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.flash_card_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sessions"
  ON public.flash_card_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions"
  ON public.flash_card_sessions FOR UPDATE USING (auth.uid() = user_id);

-- Flash Card Answers (per card per session)
CREATE TABLE public.flash_card_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.flash_card_sessions(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.flash_cards(id) ON DELETE CASCADE,
  user_answer TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  coins_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.flash_card_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own answers"
  ON public.flash_card_answers FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.flash_card_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
CREATE POLICY "Users can insert own answers"
  ON public.flash_card_answers FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.flash_card_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_flash_card_categories_updated_at
  BEFORE UPDATE ON public.flash_card_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_flash_cards_updated_at
  BEFORE UPDATE ON public.flash_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
