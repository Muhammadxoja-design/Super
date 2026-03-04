import pg from "pg";

const { Client } = pg;

const ips = [
  "52.59.152.35", // eu-central-1
  "18.198.30.239", // eu-central-1
  "52.8.172.168", // us-west-1
  "54.177.55.191", // us-west-1
  "3.221.71.4", // us-east-1
  "3.231.205.155", // us-east-1
  "52.213.238.2", // eu-west-1
  "52.31.111.95", // eu-west-1
];

const username = "postgres.foivrgfmesjydyjfcgbn";
const password = "iu/LCuLN3x4g_vX"; // Raw password for pg Client

async function test() {
  for (const ip of ips) {
    console.log(`Testing IP: ${ip}`);
    const client = new Client({
      host: ip,
      port: 6543,
      user: username,
      password: password,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();
      console.log(`SUCCESS! Connected to ${ip}`);
      await client.end();
      process.exit(0);
    } catch (err) {
      console.log(`Failed for ${ip}: ${err.message}`);
    }
  }
}

test();
