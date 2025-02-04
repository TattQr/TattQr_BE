const mongoose = require("mongoose");

const ContentSchema = new mongoose.Schema({
  qrCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "QRCode",
    required: true,
  },
  contentType: {
    type: String,
    enum: ["text", "audio", "video", "image", "file"],
    // required: true,
  },
  contentUrl: {
    type: String,
  },
  text: {
    type: String,
  },
  label: {
    type: String,
  },
  category: {
    type: String,
  },
  type: {
    type: String,
    enum: ['temporary', 'permanent'],
    required: true
  },
  expiryTime: { 
    type: Date,
    default: null
  },
  isSecure: {
    type: Boolean,
    default: false
  },
  pin: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Content = mongoose.model("Content", ContentSchema);
module.exports = Content;
