import { neon, neonConfig } from "@neondatabase/serverless";

if (process.env.NODE_ENV === "development") {
  neonConfig.fetchConnectionCache = true;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined. Set it before running the application.");
}

export const sql = neon(connectionString);
