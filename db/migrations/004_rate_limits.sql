CREATE TABLE IF NOT EXISTS rate_limits (
  scope text NOT NULL,
  client_key text NOT NULL,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, client_key)
);

CREATE INDEX IF NOT EXISTS rate_limits_updated_idx ON rate_limits (updated_at);
