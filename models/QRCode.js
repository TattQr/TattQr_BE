// // models/QRCode.js
// const mongoose = require("mongoose");

// // Import the User model (assuming it is located in models/User.js)
// const User = require("./Users");

// const QRCodeSchema = new mongoose.Schema({
//   text: {
//     type: String,
//     required: false,
//   },
//   url: {
//     type: String,
//     required: true,
//   },
//   filePath: {
//     type: String,
//     required: true,
//   },
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//   },
// });

// const QRCode = mongoose.model("QRCode", QRCodeSchema);
// module.exports = QRCode;

// models/QRCode.js
const mongoose = require("mongoose");

const QRCodeSchema = new mongoose.Schema({
  text: {
    type: String,
    required: false,
  },
  url: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  currentContent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Content",
  },
  totalScans: {
    type: Number,
    default: 0,
  },
  uniqueVisitors: {
    type: Number,
    default: 0,
  },
  lastScannedAt: {
    type: Date,
    default: null,
  },
});

const QRCode = mongoose.model("QRCode", QRCodeSchema);
module.exports = QRCode;
