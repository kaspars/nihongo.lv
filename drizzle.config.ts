import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({ path: ".env.local" });

const dbUrl = new URL(process.env.DATABASE_URL!);
dbUrl.searchParams.set("options", "-c client_min_messages=warning");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl.toString(),
  },
});
