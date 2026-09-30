import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

type NeonSql = NeonQueryFunction<false, false>;
let client: NeonSql | undefined;

export function getDb(): NeonSql {
  if (!client) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL não está configurada no servidor.");
    client = neon(connectionString, { fullResults: false });
  }
  return client;
}
