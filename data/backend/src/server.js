require("dotenv").config();

const app = require("./app");
const pool = require("./config/db");
const { isMockMode } = require("./config/runtime");

const PORT = process.env.BACKEND_PORT || (isMockMode ? 4000 : process.env.PORT || 4000);

async function startServer() {
  try {
    if (isMockMode) {
      console.log("Running in mock mode without database");
    } else {
      await pool.query("SELECT NOW()");
      console.log("Database connected successfully");
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
