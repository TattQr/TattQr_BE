const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    // unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  qrCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "QRCode",
    required: false,
  },
  tag: {
    type: String,
    required: false,
  },
});

const User = mongoose.model("User", UserSchema);
module.exports = User;
