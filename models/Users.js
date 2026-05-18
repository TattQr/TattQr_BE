const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  email: {
    type: String,
    required: true,
    // unique: true,
  },
  phoneNum: {
    type: String,
    default: "",
    trim: true,
    maxlength: 20,
  },
  location: {
    type: String,
    default: "",
    trim: true,
    maxlength: 120,
  },
  profileImageUrl: {
    type: String,
    default: null,
  },
  profileImageKey: {
    type: String,
    default: null,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
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
