import pg from "pg";
import fs from "fs";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const { Pool } = pg;

const connectionString =
  "postgresql://postgres.foivrgfmesjydyjfcgbn:iu%2FLCuLN3x4g_vX@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require";

const pool = new Pool({
  connectionString:
    "postgresql://postgres.foivrgfmesjydyjfcgbn:iu%2FLCuLN3x4g_vX@aws-0-us-west-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
});

async function importData() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync("render_data.sql", "utf8");

    // We split by semicolon but need to be careful with strings.
    // This is a simple split for standard INSERT statements.
    const statements = sql.split(";\n");

    console.log(`Starting import of ${statements.length} statements...`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt) continue;

      try {
        await client.query(stmt);
        if (i % 10 === 0) console.log(`Processed ${i}/${statements.length}...`);
      } catch (err) {
        console.error(`Error at statement ${i}:`, err.message);
        // Continue with other statements
      }
    }

    console.log("Import complete.");
  } catch (err) {
    console.error("Import failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

importData();
