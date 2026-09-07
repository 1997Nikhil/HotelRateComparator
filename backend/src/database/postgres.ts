import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

console.log("DATABASE_URL:", process.env.DATABASE_URL);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function testDatabaseConnection() {
  try {
    const result = await pool.query("SELECT NOW()");

    console.log(
      "PostgreSQL connected:",
      result.rows[0]
    );
  } catch (error) {
    console.error(
      "PostgreSQL connection failed:",
      error
    );
  }
}