const mongoose = require("mongoose");

const ScanEventSchema = new mongoose.Schema({
  qrCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "QRCode",
    required: true,
    index: true,
  },
  ownerUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  content: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Content",
    required: false,
    default: null,
    index: true,
  },
  visitorId: {
    type: String,
    required: true,
    index: true,
  },
  isUniqueVisitor: {
    type: Boolean,
    default: false,
  },
  scannedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  ipAddress: {
    type: String,
    default: "",
  },
  userAgent: {
    type: String,
    default: "",
  },
  deviceType: {
    type: String,
    default: "desktop",
  },
  browser: {
    type: String,
    default: "Unknown",
  },
  os: {
    type: String,
    default: "Unknown",
  },
  platform: {
    type: String,
    default: "",
  },
  locale: {
    type: String,
    default: "",
  },
  timezone: {
    type: String,
    default: "",
  },
  city: {
    type: String,
    default: "",
  },
  region: {
    type: String,
    default: "",
  },
  country: {
    type: String,
    default: "",
  },
  latitude: {
    type: Number,
    default: null,
  },
  longitude: {
    type: Number,
    default: null,
  },
  referrer: {
    type: String,
    default: "",
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
});

ScanEventSchema.index({ qrCode: 1, visitorId: 1, scannedAt: -1 });

const ScanEvent = mongoose.model("ScanEvent", ScanEventSchema);
module.exports = ScanEvent;
