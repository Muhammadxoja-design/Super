import pg from "pg";
import dns from "dns/promises";

const { Client } = pg;

const HOST = "dpg-d5ov9ev5c7fs73aotkm0-a.oregon-postgres.render.com";
const USER = "appuser";
const PASSWORD = "JGNpooRoAK6vO9oryG6lpUF9S7xFP3ez";
const DATABASE = "taskbotfergana";

async function run() {
  console.log(`Resolving ${HOST}...`);
  let host = HOST;
  try {
    const addresses = await dns.resolve4(HOST);
    host = addresses[0];
    console.log(`Resolved to IPv4: ${host}`);
  } catch (e) {
    console.warn("DNS resolve failed, using hostname:", e.message);
  }

  const client = new Client({
    host,
    port: 5432,
    user: USER,
    password: PASSWORD,
    database: DATABASE,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 60000,
    query_timeout: 30000,
  });

  try {
    console.log("Connecting...");
    await client.connect();
    console.log("Connected!");

    for (const table of ["users", "tasks"]) {
      const res = await client.query(`SELECT * FROM ${table}`);
      console.log(`\n-- TABLE: ${table} (${res.rows.length} rows)`);
      if (res.rows.length === 0) {
        console.log(`-- (empty)`);
        continue;
      }
      const cols = Object.keys(res.rows[0]);
      for (const row of res.rows) {
        const vals = cols.map((c) => {
          const v = row[c];
          if (v === null) return "NULL";
          if (v instanceof Date) return `'${v.toISOString()}'`;
          if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
          if (typeof v === "object")
            return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
          if (typeof v === "string") return `'${v.replace(/'/g, "''")}'`;
          return v;
        });
        console.log(
          `INSERT INTO ${table} (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${vals.join(", ")});`,
        );
      }
    }

    await client.end();
  } catch (err) {
    console.error("FAILED:", err.message);
    process.exit(1);
  }
}

run();
