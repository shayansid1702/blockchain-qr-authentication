const express = require("express");
const { stats } = require("../controllers/dashboardController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/stats", requireAuth, requireRole("ADMIN"), stats);

module.exports = router;
