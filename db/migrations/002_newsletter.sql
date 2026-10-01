ALTER TABLE news_articles DROP CONSTRAINT IF EXISTS news_articles_category_check;
ALTER TABLE news_articles ADD CONSTRAINT news_articles_category_check CHECK (category IN (
  'Inteligência artificial', 'Aplicativos', 'Segurança digital', 'Celulares',
  'Computadores', 'Startups', 'Ciência e inovação', 'Games', 'Tecnologia'
));

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id text PRIMARY KEY,
  email text NOT NULL,
  normalized_email text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed')),
  consent_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  CHECK (normalized_email = lower(btrim(normalized_email))),
  CHECK (char_length(normalized_email) BETWEEN 3 AND 254),
  CHECK ((status = 'subscribed' AND unsubscribed_at IS NULL) OR (status = 'unsubscribed' AND unsubscribed_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_status_created_idx
  ON newsletter_subscribers (status, created_at DESC);

CREATE TABLE IF NOT EXISTS newsletter_signup_limits (
  client_key text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
