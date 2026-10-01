import { getDb } from "@/lib/db";

export type NewsletterStatus = "subscribed" | "unsubscribed";
export type NewsletterSubscriber = {
  id: string;
  email: string;
  status: NewsletterStatus;
  created_at: string;
  consent_at: string;
  unsubscribed_at: string | null;
};

const subscriberFields = "id, email, status, created_at, consent_at, unsubscribed_at";

export async function listNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
  const rows = await getDb().query(`SELECT ${subscriberFields} FROM newsletter_subscribers ORDER BY created_at DESC LIMIT 10000`);
  return rows as NewsletterSubscriber[];
}

export async function updateNewsletterStatus(id: string, status: NewsletterStatus): Promise<boolean> {
  if (status !== "subscribed" && status !== "unsubscribed") throw new Error("InvalidNewsletterStatus");
  const rows = await getDb().query(
    `UPDATE newsletter_subscribers SET status = $2, updated_at = now(),
       unsubscribed_at = CASE WHEN $2 = 'unsubscribed' THEN now() ELSE NULL END
     WHERE id = $1 RETURNING id`,
    [id, status],
  );
  return rows.length > 0;
}

export async function deleteNewsletterSubscriber(id: string): Promise<boolean> {
  const rows = await getDb().query("DELETE FROM newsletter_subscribers WHERE id = $1 RETURNING id", [id]);
  return rows.length > 0;
}
