ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS unsubscribe_token text;
UPDATE newsletter_subscribers SET unsubscribe_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') WHERE unsubscribe_token IS NULL;
ALTER TABLE newsletter_subscribers ALTER COLUMN unsubscribe_token SET DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
ALTER TABLE newsletter_subscribers ALTER COLUMN unsubscribe_token SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_unsubscribe_token_idx ON newsletter_subscribers (unsubscribe_token);
