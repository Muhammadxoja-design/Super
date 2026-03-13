import pg from "pg";
const { Client } = pg;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function test() {
  const regions = ["us-west-1", "eu-central-1"];

  for (const region of regions) {
    console.log(`Testing region: ${region}`);
    const client = new Client({
      user: "postgres.foivrgfmesjydyjfcgbn",
      password: "iu/LCuLN3x4g_vX",
      host: `aws-0-${region}.pooler.supabase.com`,
      port: 6543,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();
      console.log(`Successfully connected to ${region}!`);
      await client.end();
      return;
    } catch (err) {
      console.log(`Failed for ${region}: ${err.message}`);
    }
  }
}

test();
