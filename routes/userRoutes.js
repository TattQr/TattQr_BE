const express = require("express");
const authController = require("../controllers/userController");
const { authenticate } = require("../middlewares/authMiddleware");
const uploadProfileImage = require("../middlewares/profileImageUploader");
const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/profile", authenticate, authController.getProfile);
router.put(
  "/profile",
  authenticate,
  uploadProfileImage,
  authController.updateProfile
);

module.exports = router;
