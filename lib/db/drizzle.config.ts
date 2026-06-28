import { defineConfig } from "drizzle-kit";
import path from "path";
import fs from "fs";

function loadEnv(p: string) {
  if (fs.existsSync(p)) {
    const lines = fs.readFileSync(p, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const idx = trimmed.indexOf("=");
        if (idx > 0) {
          const k = trimmed.substring(0, idx).trim();
          let v = trimmed.substring(idx + 1).trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.substring(1, v.length - 1);
          if (!process.env[k]) process.env[k] = v;
        }
      }
    }
  }
}
loadEnv(path.join(__dirname, "../../../.env"));
loadEnv(path.join(__dirname, "../../.env"));

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});

