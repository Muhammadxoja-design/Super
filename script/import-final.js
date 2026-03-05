import pg from "pg";
import fs from "fs";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const { Pool } = pg;

const CONNECTION_STRING =
  "postgresql://postgres.foivrgfmesjydyjfcgbn:iu%2FLCuLN3x4g_vX@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require";

const pool = new Pool({
  connectionString: CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

/**
 * Converts a plain INSERT INTO ... VALUES (...) statement to
 * INSERT INTO ... VALUES (...) ON CONFLICT DO NOTHING
 */
function withOnConflict(sql) {
  return sql.replace(/;\s*$/, " ON CONFLICT DO NOTHING;");
}

async function importData() {
  console.log("Connecting to Supabase (ap-south-1)...");
  const client = await pool.connect();
  console.log("Connected!\n");

  try {
    const raw = fs.readFileSync("render_data.sql", "utf8");

    // Split on ";\n" or ";" at end of file
    const statements = raw
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    console.log(`Found ${statements.length} SQL statements to import.\n`);

    let success = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < statements.length; i++) {
      let stmt = statements[i];

      // Add ON CONFLICT DO NOTHING to all INSERT statements
      if (/^INSERT\s+INTO/i.test(stmt)) {
        stmt = stmt + " ON CONFLICT DO NOTHING";
      }

      try {
        const result = await client.query(stmt);
        if (result.rowCount > 0) {
          success++;
        } else {
          skipped++; // Row existed already — conflict was skipped
        }
      } catch (err) {
        errors++;
        console.error(`  ✗ Statement ${i + 1} failed: ${err.message}`);
      }
    }

    console.log("\n=== Import Summary ===");
    console.log(`  ✓ Inserted: ${success}`);
    console.log(`  ↩ Skipped (already exists): ${skipped}`);
    console.log(`  ✗ Errors: ${errors}`);

    // Verify user count
    const countRes = await client.query("SELECT COUNT(*) AS total FROM users");
    console.log(`\n👥 Total users in Supabase: ${countRes.rows[0].total}`);
  } catch (err) {
    console.error("Import failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

importData();
