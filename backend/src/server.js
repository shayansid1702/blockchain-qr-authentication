require("dotenv").config();
const app = require("./app");
const { testConnection } = require("./config/db");

const PORT = process.env.PORT || 5000;

async function start() {
  // Fail fast if MySQL isn't reachable, rather than starting a server that
  // will error on every single request.
  await testConnection();

  app.listen(PORT, () => {
    console.log(`🚀 Backend API running on http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
  });
}

start();
