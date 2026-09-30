CREATE TABLE IF NOT EXISTS news_articles (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 5 AND 240),
  summary text NOT NULL CHECK (char_length(btrim(summary)) BETWEEN 1 AND 900),
  category text NOT NULL CHECK (category IN (
    'Inteligência artificial', 'Aplicativos', 'Segurança digital', 'Celulares',
    'Computadores', 'Startups', 'Ciência e inovação', 'Games'
  )),
  author text,
  image_url text,
  source_name text NOT NULL,
  source_url text NOT NULL UNIQUE,
  published_at timestamptz NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'archived')),
  views integer NOT NULL DEFAULT 0 CHECK (views >= 0)
);

CREATE INDEX IF NOT EXISTS news_articles_public_date_idx
  ON news_articles (published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS news_articles_public_category_idx
  ON news_articles (category, published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS news_articles_popular_idx
  ON news_articles (views DESC, published_at DESC) WHERE status = 'published';

CREATE TABLE IF NOT EXISTS news_import_runs (
  id text PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL CHECK (status IN ('running', 'completed', 'partial', 'failed')),
  feeds_checked integer NOT NULL DEFAULT 0 CHECK (feeds_checked >= 0),
  articles_added integer NOT NULL DEFAULT 0 CHECK (articles_added >= 0),
  errors jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS news_import_runs_started_idx
  ON news_import_runs (started_at DESC);
