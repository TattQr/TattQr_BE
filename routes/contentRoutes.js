const express = require("express");
const router = express.Router();
const contentController = require("../controllers/contentController");
// const upload = require("../middlewares/multer");
const upload = require("../middlewares/s3Uploader");
const { authenticate } = require("../middlewares/authMiddleware");
const { checkContentAccess } = require("../middlewares/checkContentAccess");

// router.get("/contents/:qrCodeId", authenticate, contentController.getContents);
router.post("/set/:id", authenticate, contentController.setCurrentContent);

router.post(
  "/content",
  authenticate,
  upload.single("file"),
  contentController.createContent
);

router.post(
  "/gallery",
  authenticate,
  upload.single("file"),
  contentController.addToGalleryContent
);

router.get(
  "/content/:qrCodeId",
  authenticate,
  contentController.getContentsByQRCode
);

router.get(
  "/contents/:id",
  authenticate,
  contentController.getAllContentsByQRCode
);

// Get the current content associated with a QR code
router.get(
  "/current-content/qr/:qrCodeId",
  authenticate,
  checkContentAccess,
  contentController.getCurrentContentByQRCode
);

router.get(
  "/current-content/user/:userId",
  checkContentAccess,
  contentController.getCurrentContentByQRCode
);

router.delete("/delete/:id", authenticate, contentController.deleteContent);
router.get(
  "/scans/summary",
  authenticate,
  contentController.getScanSummary
);
router.get(
  "/scans/notifications",
  authenticate,
  contentController.getScanNotifications
);
router.post(
  "/scans/notifications/read",
  authenticate,
  contentController.markScanNotificationsRead
);

module.exports = router;
