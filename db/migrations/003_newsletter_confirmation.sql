ALTER TABLE newsletter_subscribers DROP CONSTRAINT IF EXISTS newsletter_subscribers_status_check;
ALTER TABLE newsletter_subscribers DROP CONSTRAINT IF EXISTS newsletter_subscribers_check;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS confirm_token_hash text;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS confirm_sent_at timestamptz;
ALTER TABLE newsletter_subscribers DROP CONSTRAINT IF EXISTS newsletter_subscribers_state_check;
ALTER TABLE newsletter_subscribers ADD CONSTRAINT newsletter_subscribers_status_check CHECK (status IN ('pending', 'subscribed', 'unsubscribed'));
ALTER TABLE newsletter_subscribers ADD CONSTRAINT newsletter_subscribers_state_check CHECK (
  (status IN ('pending', 'subscribed') AND unsubscribed_at IS NULL) OR (status = 'unsubscribed' AND unsubscribed_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS newsletter_subscribers_confirm_token_idx ON newsletter_subscribers (confirm_token_hash) WHERE confirm_token_hash IS NOT NULL;
