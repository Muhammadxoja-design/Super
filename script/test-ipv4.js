import pg from "pg";
import dns from "dns";

const { Client } = pg;

const host = "db.foivrgfmesjydyjfcgbn.supabase.co";
const port = 6543;
const user = "postgres.foivrgfmesjydyjfcgbn";
const password = "iu/LCuLN3x4g_vX";
const database = "postgres";

async function testWithIPv4() {
  console.log(`Resolving ${host} to IPv4...`);

  dns.lookup(host, { family: 4 }, async (err, address) => {
    if (err) {
      console.error(`DNS lookup failed: ${err.message}`);
      process.exit(1);
    }

    console.log(`Resolved to IPv4: ${address}. Connecting...`);

    const client = new Client({
      host: address,
      port: port,
      user: user,
      password: password,
      database: database,
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();
      console.log("SUCCESS! Connected to Supabase via IPv4.");

      // Perform a test query
      const res = await client.query("SELECT current_database(), version()");
      console.log("Query Result:", res.rows[0]);

      await client.end();
      process.exit(0);
    } catch (connectErr) {
      console.error("Connection failed:", connectErr.message);
      process.exit(1);
    }
  });
}

testWithIPv4();
