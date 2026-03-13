/**
 * migrate-db.js
 *
 * Directly migrates all data from the old Render PostgreSQL database
 * to the new Supabase database.
 *
 * Run via: npm run migrate:db
 * (intended to be run from Render's environment so it can reach the Supabase pooler)
 */

import pg from "pg";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const { Pool } = pg;

// ─── Source: Old Render Database ─────────────────────────────────────────────
const SOURCE_URL =
  "postgresql://appuser:JGNpooRoAK6vO9oryG6lpUF9S7xFP3ez@dpg-d5ov9ev5c7fs73aotkm0-a.oregon-postgres.render.com/taskbotfergana";

// ─── Target: New Supabase Database ───────────────────────────────────────────
const TARGET_URL =
  "postgresql://postgres.foivrgfmesjydyjfcgbn:iu%2FLCuLN3x4g_vX@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require";

// Tables to migrate (order matters — respect foreign key dependencies)
const TABLES = [
  "users",
  "message_templates",
  "tasks",
  "task_assignments",
  "sessions",
  "audit_logs",
  "broadcasts",
  "broadcast_logs",
  "message_queue",
  "billing_transactions",
];

const sourcePool = new Pool({
  connectionString: SOURCE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

const targetPool = new Pool({
  connectionString: TARGET_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

async function migrateTable(srcClient, tgtClient, table) {
  console.log(`\n📦 Migrating table: ${table}`);

  let rows;
  try {
    const res = await srcClient.query(`SELECT * FROM ${table}`);
    rows = res.rows;
    console.log(`   Found ${rows.length} rows in source.`);
  } catch (err) {
    console.warn(
      `   ⚠️  Table "${table}" not found in source, skipping. (${err.message})`,
    );
    return;
  }

  if (rows.length === 0) {
    console.log("   Nothing to migrate.");
    return;
  }

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const cols = Object.keys(row);
    const vals = Object.values(row);
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");
    const colList = cols.map((c) => `"${c}"`).join(", ");

    const sql = `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

    try {
      const result = await tgtClient.query(sql, vals);
      if (result.rowCount > 0) inserted++;
      else skipped++;
    } catch (err) {
      console.error(`   ✗ Row failed: ${err.message}`);
    }
  }

  console.log(`   ✓ Inserted: ${inserted}, ↩ Skipped (conflict): ${skipped}`);
}

async function main() {
  console.log("🚀 Starting direct DB-to-DB migration...\n");
  console.log("  Source: Render (taskbotfergana)");
  console.log("  Target: Supabase (ap-south-1)\n");

  const srcClient = await sourcePool.connect();
  const tgtClient = await targetPool.connect();

  try {
    // Disable FK checks temporarily on target to avoid ordering issues
    await tgtClient.query("SET session_replication_role = 'replica'");

    for (const table of TABLES) {
      await migrateTable(srcClient, tgtClient, table);
    }

    // Re-enable FK checks
    await tgtClient.query("SET session_replication_role = DEFAULT");

    // ── Final report ─────────────────────────────────────────────────────────
    console.log("\n\n=== ✅ Migration Complete! ===");

    const userCount = await tgtClient.query("SELECT COUNT(*) AS n FROM users");
    console.log(`👥 Total users in Supabase: ${userCount.rows[0].n}`);
  } catch (err) {
    console.error("\n❌ Migration failed:", err.message);
    process.exit(1);
  } finally {
    srcClient.release();
    tgtClient.release();
    await sourcePool.end();
    await targetPool.end();
  }
}

main();
