// routes/qrRoutes.js
const express = require("express");
const qrController = require("../controllers/qrController.js");
// const upload = require("../middlewares/multer");
const upload = require("../middlewares/s3Uploader");
const { authenticate } = require("../middlewares/authMiddleware.js");
const router = express.Router();

router.post(
  "/qrcode",
  authenticate,
  upload.single("file"),
  qrController.createQRCode
);
router.get("/qrcode/:id", authenticate, qrController.getQRCode);
router.get("/user/qr", authenticate, qrController.getUserQR);
router.put("/user/qr", authenticate, qrController.updateUserQR);

module.exports = router;
