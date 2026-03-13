import pg from "pg";
import fs from "fs";

const { Pool } = pg;

// Connection string from export-render.js
const connectionString =
  "postgresql://appuser:JGNpooRoAK6vO9oryG6lpUF9S7xFP3ez@dpg-d5ov9ev5c7fs73aotkm0-a.oregon-postgres.render.com/taskbotfergana";

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function exportSpecificData() {
  const client = await pool.connect();
  try {
    const tables = ["users", "tasks"];
    let sql = "";

    for (const table of tables) {
      console.log(`Exporting table: ${table}`);

      const dataRes = await client.query(`SELECT * FROM ${table}`);
      if (dataRes.rows.length === 0) {
        console.log(`Table ${table} is empty.`);
        continue;
      }

      const columns = Object.keys(dataRes.rows[0]);
      const columnsList = columns.map((c) => `"${c}"`).join(", ");

      for (const row of dataRes.rows) {
        const values = columns.map((col) => {
          const val = row[col];
          if (val === null) return "NULL";
          if (typeof val === "string") return `'${val.replace(/'/g, "''")}'`;
          if (val instanceof Date) return `'${val.toISOString()}'`;
          if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
          if (typeof val === "object")
            return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          return val;
        });
        sql += `INSERT INTO ${table} (${columnsList}) VALUES (${values.join(", ")});\n`;
      }
      sql += "\n";
    }

    fs.writeFileSync("specific_tables_data.sql", sql);
    console.log("Export complete: specific_tables_data.sql");
  } catch (err) {
    console.error("Export failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

exportSpecificData();
