CREATE TABLE IF NOT EXISTS public.links (
  id serial PRIMARY KEY,
  legenda text NOT NULL,
  url text NOT NULL,
  code varchar(32) NOT NULL UNIQUE,
  clicks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_links_code ON public.links (code);
CREATE INDEX IF NOT EXISTS idx_links_created_at ON public.links (created_at DESC);
