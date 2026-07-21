CREATE TABLE public.game_saves (
  code TEXT PRIMARY KEY CHECK (code ~ '^[A-Z0-9]{6}$'),
  state JSONB NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.game_saves TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_saves TO authenticated;
GRANT ALL ON public.game_saves TO service_role;

ALTER TABLE public.game_saves ENABLE ROW LEVEL SECURITY;

-- Anyone with the code can read, create, or overwrite the save (code acts as the key).
CREATE POLICY "Anyone can read game saves"
  ON public.game_saves FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create game saves"
  ON public.game_saves FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update game saves"
  ON public.game_saves FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.game_saves_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER game_saves_updated_at
  BEFORE UPDATE ON public.game_saves
  FOR EACH ROW EXECUTE FUNCTION public.game_saves_touch_updated_at();