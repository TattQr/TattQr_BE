// models/HistoricalContent.js
const mongoose = require("mongoose");

const HistoricalContentSchema = new mongoose.Schema({
  qrCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "QRCode",
    required: true,
  },
  contentType: {
    type: String,
    enum: ["text", "audio", "video", "image", "file"],
    required: true,
  },
  contentUrl: {
    type: String,
  },
  label: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const HistoricalContent = mongoose.model(
  "HistoricalContent",
  HistoricalContentSchema
);
module.exports = HistoricalContent;
