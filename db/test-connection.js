const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM events");
    console.log("Database connected! Events count:", result.rows[0].count);
    const notices = await pool.query("SELECT COUNT(*) FROM notices");
    console.log("Notices count:", notices.rows[0].count);
    process.exit(0);
  } catch (err) {
    console.error("Connection failed:", err.message);
    process.exit(1);
  }
}

test();
