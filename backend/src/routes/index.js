const express = require("express");
const authRoutes = require("./authRoutes");
const manufacturerRoutes = require("./manufacturerRoutes");
const productRoutes = require("./productRoutes");
const dashboardRoutes = require("./dashboardRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/manufacturers", manufacturerRoutes);
router.use("/products", productRoutes);
router.use("/dashboard", dashboardRoutes);

module.exports = router;
