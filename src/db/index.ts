import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  var __ledwave_pg_client__: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_URL!;

const client =
  global.__ledwave_pg_client__ ??
  postgres(connectionString, { max: 10 });

if (process.env.NODE_ENV !== "production") {
  global.__ledwave_pg_client__ = client;
}

export const db = drizzle(client, { schema });
