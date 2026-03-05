import pg from "pg";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const { Client } = pg;

const c = new Client({
  user: "postgres.foivrgfmesjydyjfcgbn",
  password: "iu/LCuLN3x4g_vX",
  host: "aws-1-ap-south-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

c.connect()
  .then(() => c.query("SELECT COUNT(*) AS n FROM users"))
  .then((r) => {
    console.log("CONNECTED OK — Users:", r.rows[0].n);
    return c.end();
  })
  .catch((e) => {
    console.error("FAIL:", e.message);
    process.exit(1);
  });
