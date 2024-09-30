const express = require("express");
const authRoutes = require("./userRoutes"); // Update with your actual file name
const qrRoutes = require("./qrRoutes");
const contentRoutes = require("./contentRoutes");
const adminRoutes = require("./adminRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/qrcode", qrRoutes);
router.use("/content", contentRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
