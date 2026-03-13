import pg from "pg";
import fs from "fs";

const { Pool } = pg;

const connectionString =
  "postgresql://appuser:JGNpooRoAK6vO9oryG6lpUF9S7xFP3ez@dpg-d5ov9ev5c7fs73aotkm0-a.oregon-postgres.render.com/taskbotfergana";

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function exportData() {
  const client = await pool.connect();
  try {
    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    `);

    const tables = tablesRes.rows.map((r) => r.table_name);
    let sql = "";

    for (const table of tables) {
      console.log(`Exporting table: ${table}`);

      // Get table structure (simplified for migration)
      // Note: We'll rely on Drizzle's push/migrate for schema usually,
      // but let's try to get data at least.

      const dataRes = await client.query(`SELECT * FROM ${table}`);
      if (dataRes.rows.length === 0) continue;

      const columns = Object.keys(dataRes.rows[0]);
      const columnsList = columns.join(", ");

      for (const row of dataRes.rows) {
        const values = columns.map((col) => {
          const val = row[col];
          if (val === null) return "NULL";
          if (typeof val === "string") return `'${val.replace(/'/g, "''")}'`;
          if (val instanceof Date) return `'${val.toISOString()}'`;
          if (typeof val === "object")
            return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          return val;
        });
        sql += `INSERT INTO ${table} (${columnsList}) VALUES (${values.join(", ")});\n`;
      }
      sql += "\n";
    }

    fs.writeFileSync("render_data.sql", sql);
    console.log("Export complete: render_data.sql");
  } catch (err) {
    console.error("Export failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

exportData();
