const { Pool } = require("pg");
const { hasDatabaseUrl, isMockMode } = require("./runtime");

let pool = null;

if (!isMockMode && hasDatabaseUrl) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("localhost")
      ? false
      : { rejectUnauthorized: false }
  });
}

module.exports = pool;
