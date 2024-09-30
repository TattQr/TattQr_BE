const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const verifyRole = require("../middlewares/verifyRole");
const { authenticate } = require("../middlewares/authMiddleware");

// User Management Routes
router.get(
  "/users",
  authenticate,
  verifyRole(["admin"]),
  adminController.getAllUsers
);
router.get(
  "/users/search",
  authenticate,
  verifyRole(["admin"]),
  adminController.searchUsers
);
router.put(
  "/users/:id",
  authenticate,
  verifyRole(["admin"]),
  adminController.updateUser
);
router.delete(
  "/users",
  authenticate,
  verifyRole(["admin"]),
  adminController.deleteUser
);

// QR Code Management Routes
router.get(
  "/qrcodes",
  authenticate,
  verifyRole(["admin"]),
  adminController.getAllQRCodes
);
router.delete(
  "/qrcodes",
  authenticate,
  verifyRole(["admin"]),
  adminController.deleteQRCode
);

// App Statistics and Logs Routes
router.get(
  "/statistics",
  authenticate,
  verifyRole(["admin"]),
  adminController.getAppStatistics
);
// router.get("/logs", verifyRole(["admin"]), adminController.getLogs);
router.get(
  "/allcontents",
  authenticate,
  verifyRole(["admin"]),
  adminController.getAllContentsWithUsers
);
// router.get("/all-contents",
//   authenticate,
//   verifyRole(["admin"]),
//   adminController.getAllContentsWithUsers);

module.exports = router;
