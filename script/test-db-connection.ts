import "dotenv/config";
import pg from "pg";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const { Pool } = pg;

async function testConnection() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is missing in .env");
    process.exit(1);
  }

  console.log("Testing connection strictly with TLS bypass...");

  // Clean URL of params to avoid conflict with config object
  const cleanUrl = url.split("?")[0];

  const pool = new Pool({
    connectionString: cleanUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    const res = await pool.query("SELECT NOW() as now");
    console.log("✅ Connection Successful!");
    console.log("Database Time:", res.rows[0].now);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ Connection Failed:", err);
    process.exit(1);
  }
}

testConnection().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
