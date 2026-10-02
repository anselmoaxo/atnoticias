-- Fontes configuráveis no painel, parâmetros da coleta e histórico detalhado de execuções.
-- A categoria 'Telecomunicações' entra na restrição de news_articles pela migração 002, que é reaplicada a cada db:migrate.

CREATE TABLE IF NOT EXISTS news_sources (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  name text NOT NULL UNIQUE CHECK (char_length(btrim(name)) BETWEEN 2 AND 80),
  site_url text NOT NULL CHECK (site_url ~ '^https://'),
  kind text NOT NULL CHECK (kind IN ('rss', 'sitemap', 'manual')),
  feed_url text CHECK (feed_url IS NULL OR feed_url ~ '^https://'),
  path_prefix text CHECK (path_prefix IS NULL OR path_prefix ~ '^https://'),
  source_type text NOT NULL DEFAULT 'editorial' CHECK (source_type IN ('editorial', 'official')),
  language text NOT NULL DEFAULT 'pt-BR' CHECK (language IN ('pt-BR', 'en')),
  default_category text NOT NULL DEFAULT 'Tecnologia',
  enabled boolean NOT NULL DEFAULT true,
  use_images boolean NOT NULL DEFAULT true,
  max_items integer NOT NULL DEFAULT 30 CHECK (max_items BETWEEN 1 AND 60),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 600),
  etag text,
  last_modified text,
  last_run_at timestamptz,
  last_success_at timestamptz,
  last_status text CHECK (last_status IS NULL OR last_status IN ('ok', 'empty', 'error', 'blocked')),
  last_message text,
  last_found integer NOT NULL DEFAULT 0,
  last_added integer NOT NULL DEFAULT 0,
  consecutive_failures integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind = 'manual' OR feed_url IS NOT NULL),
  CHECK (kind <> 'sitemap' OR path_prefix IS NOT NULL)
);

-- Fontes iniciais. ON CONFLICT DO NOTHING preserva o que o admin alterou no painel quando a migração roda de novo.
INSERT INTO news_sources (id, name, site_url, kind, feed_url, path_prefix, source_type, language, default_category, notes) VALUES
  ('tecnoblog', 'Tecnoblog', 'https://tecnoblog.net/', 'rss', 'https://tecnoblog.net/feed/', NULL, 'editorial', 'pt-BR', 'Tecnologia', NULL),
  ('canaltech', 'Canaltech', 'https://canaltech.com.br/', 'rss', 'https://canaltech.com.br/rss/google-assistente/', NULL, 'editorial', 'pt-BR', 'Tecnologia', 'O robots.txt bloqueia /rss/ para robôs em geral e libera só /rss/google-assistente/, que é o feed usado aqui.'),
  ('tecmundo', 'TecMundo', 'https://www.tecmundo.com.br/', 'rss', 'https://rss.tecmundo.com.br/feed', NULL, 'editorial', 'pt-BR', 'Tecnologia', NULL),
  ('olhar-digital', 'Olhar Digital', 'https://olhardigital.com.br/', 'rss', 'https://olhardigital.com.br/feed/', NULL, 'editorial', 'pt-BR', 'Tecnologia', NULL),
  ('techtudo', 'TechTudo', 'https://www.techtudo.com.br/', 'rss', 'https://pox.globo.com/rss/techtudo/', NULL, 'editorial', 'pt-BR', 'Tecnologia', NULL),
  ('adrenaline', 'Adrenaline', 'https://www.adrenaline.com.br/noticias/', 'manual', NULL, NULL, 'editorial', 'pt-BR', 'Tecnologia', 'O site recusa acesso automático (HTTP 403 no feed e no robots.txt). Use o cadastro manual ou peça à Adrenaline liberação do feed para este robô.'),
  ('convergencia-digital', 'Convergência Digital', 'https://convergenciadigital.com.br/', 'rss', 'https://convergenciadigital.com.br/feed/', NULL, 'editorial', 'pt-BR', 'Tecnologia', NULL),
  ('openai', 'OpenAI', 'https://openai.com/pt-BR/news/', 'rss', 'https://openai.com/news/rss.xml', NULL, 'official', 'en', 'Inteligência artificial', 'Feed oficial em inglês. A página em português não publica feed próprio.'),
  ('anthropic', 'Anthropic', 'https://www.anthropic.com/news', 'sitemap', 'https://www.anthropic.com/sitemap.xml', 'https://www.anthropic.com/news/', 'official', 'en', 'Inteligência artificial', 'Sem RSS oficial. A coleta usa o sitemap público e os metadados de cada página (robots.txt permite).'),
  ('google-gemini', 'Google Gemini', 'https://blog.google/products-and-platforms/products/gemini/', 'rss', 'https://blog.google/products/gemini/rss/', NULL, 'official', 'en', 'Inteligência artificial', 'Feed oficial do blog do Google, seção Gemini.')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS news_collector_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  frequency_minutes integer NOT NULL DEFAULT 60 CHECK (frequency_minutes IN (60, 120, 180, 360, 720, 1440)),
  max_age_hours integer NOT NULL DEFAULT 72 CHECK (max_age_hours BETWEEN 6 AND 168),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO news_collector_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'editorial';
ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'pt-BR';
ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS image_credit text;
ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS relevance smallint NOT NULL DEFAULT 0;
ALTER TABLE news_articles DROP CONSTRAINT IF EXISTS news_articles_source_type_check;
ALTER TABLE news_articles ADD CONSTRAINT news_articles_source_type_check CHECK (source_type IN ('editorial', 'official'));
UPDATE news_articles a SET source_id = s.id FROM news_sources s WHERE a.source_id IS NULL AND a.source_name = s.name;
UPDATE news_articles SET image_credit = 'Imagem: ' || source_name WHERE image_url IS NOT NULL AND image_credit IS NULL;
CREATE INDEX IF NOT EXISTS news_articles_source_idx ON news_articles (source_id, published_at DESC);

ALTER TABLE news_import_runs ADD COLUMN IF NOT EXISTS trigger text NOT NULL DEFAULT 'schedule';
ALTER TABLE news_import_runs ADD COLUMN IF NOT EXISTS items_found integer NOT NULL DEFAULT 0;
ALTER TABLE news_import_runs ADD COLUMN IF NOT EXISTS duplicates integer NOT NULL DEFAULT 0;
ALTER TABLE news_import_runs ADD COLUMN IF NOT EXISTS skipped_old integer NOT NULL DEFAULT 0;
ALTER TABLE news_import_runs ADD COLUMN IF NOT EXISTS skipped_irrelevant integer NOT NULL DEFAULT 0;
ALTER TABLE news_import_runs ADD COLUMN IF NOT EXISTS source_results jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE news_import_runs ADD COLUMN IF NOT EXISTS message text;

-- Só uma coleta por vez: execuções presas há mais de 15 minutos são encerradas como falha antes do índice único.
UPDATE news_import_runs SET status = 'failed', finished_at = now() WHERE status = 'running' AND started_at < now() - interval '15 minutes';
CREATE UNIQUE INDEX IF NOT EXISTS news_import_runs_single_running_idx ON news_import_runs (status) WHERE status = 'running';
