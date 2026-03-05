import pg from "pg";
const { Client } = pg;

const connectionString =
  "postgresql://appuser:JGNpooRoAK6vO9oryG6lpUF9S7xFP3ez@dpg-d5ov9ev5c7fs73aotkm0-a.oregon-postgres.render.com/taskbotfergana";

async function test() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  });

  try {
    console.log("Connecting...");
    await client.connect();
    console.log("Connected successfully!");

    const res = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    );
    console.log(
      "Tables found:",
      res.rows.map((r) => r.table_name),
    );

    await client.end();
  } catch (err) {
    console.error("Connection failed:", err.message);
    if (err.stack) console.error(err.stack);
  }
}

test();
