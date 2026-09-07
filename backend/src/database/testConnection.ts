import { Client } from "pg";

const client = new Client({
  host: "localhost",
  port: 5434,
  user: "hotel_user",
  password: "hotel_password",
  database: "hotel_db",
});

async function test() {
  try {
    await client.connect();

    console.log("CONNECTED TO POSTGRESQL");

    const result = await client.query("SELECT NOW()");

    console.log(result.rows);

    await client.end();
  } catch (error) {
    console.error("CONNECTION FAILED");
    console.error(error);
  }
}

test();