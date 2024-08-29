const jwt = require("jsonwebtoken");
const { UserModel } = require("../models/Index");
// const { ObjectId } = require("mongodb"); // Import ObjectId
const mongoose = require("mongoose");
// const { logger } = require("../utils/logger");
// require("dotenv").config();

const authenticate = async (req, res, next) => {
  // console.log("tokenHeader", req.headers);
  const tokenHeader =
    req.headers["authorization"] || req.headers["Authorization"];
  const token = tokenHeader && tokenHeader.split(" ")[1];

  // console.log("tokenHeader", tokenHeader);

  // console.log("token is", token);

  if (!token) {
    return res
      .status(401)
      .json({ status: 401, error: "Unauthorized: Missing token" });
  }
  // console.log("token is", token);
  try {
    const decoded = jwt.verify(token, "tattqr");
    // console.log("Decoded Token:", decoded);
    var userId = new mongoose.Types.ObjectId(decoded.id);

    // console.log("user id is", userId);

    const user = await UserModel.findOne({
      _id: userId,
      // enable: true,
      // deleted: false,
    });

    // console.log("user is", user);

    if (!user) {
      return res
        .status(401)
        .json({ status: 401, error: "Unauthorized: Invalid token" });
    }

    req.user = {
      id: user._id,
      userName: user.username,
      tag: user.tag,
      email: user.email,
      qrCode: user.qrCode,
      role: user.role,
    };
    // console.log("req.user is", req.user);
    next();
  } catch (error) {
    console.error("Error in authentication middleware:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

module.exports = { authenticate };
