const User = require("../models/Users");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../config/s3");

// Helper function to get the next tag
const getNextTag = async () => {
  const userCount = await User.countDocuments();
  let prefix = String.fromCharCode(97 + Math.floor(userCount / 999));
  let number = (userCount % 999) + 1;
  return `${prefix}${number}`;
};

const isValidEmail = (email) => {
  if (!email || typeof email !== "string") {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

const sanitizeUserResponse = (userDoc) => {
  if (!userDoc) {
    return null;
  }

  return {
    _id: userDoc._id,
    username: userDoc.username,
    email: userDoc.email,
    phoneNum: userDoc.phoneNum || "",
    location: userDoc.location || "",
    profileImageUrl: userDoc.profileImageUrl || null,
    role: userDoc.role,
    tag: userDoc.tag,
    qrCode: userDoc.qrCode || null,
  };
};

// Register a new user
exports.signup = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    if (!username || !email || !password) {
      return res.status(400).send({ message: "Username, email, and password are required" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).send({ message: "Please provide a valid email address" });
    }

    const lowerCaseUsername = username.toLowerCase();
    const existingUser = await User.findOne({ username: lowerCaseUsername });
    if (existingUser) {
      return res.status(400).send({ message: "Username already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const tag = await getNextTag();
    const user = new User({
      username: lowerCaseUsername,
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      tag,
    });
    await user.save();
    // const token = jwt.sign({ id: user._id }, "tattqr", {
    //   expiresIn: "24h",
    // });
    res.status(200).send({ message: "User Created SuccessFully", status: 200 });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

// Login user
exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) {
      return res.status(400).send({ message: "Username and password are required" });
    }

    const lowerCaseUsername = username.toLowerCase();
    const user = await User.findOne({ username: lowerCaseUsername });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send({ message: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id }, "tattqr", {
      expiresIn: "24h",
    });
    res
      .status(200)
      .send({
        token,
        message: "User LoggedIn Successfully",
        data: sanitizeUserResponse(user),
      });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    return res.status(200).send({
      message: "Profile fetched successfully",
      data: sanitizeUserResponse(user),
    });
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    const updates = {};
    const incomingUsername =
      typeof req.body.username === "string" ? req.body.username.trim() : "";
    const incomingEmail =
      typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const incomingPhone =
      typeof req.body.phoneNum === "string" ? req.body.phoneNum.trim() : "";
    const incomingLocation =
      typeof req.body.location === "string" ? req.body.location.trim() : "";

    if (incomingUsername) {
      if (incomingUsername.length < 3 || incomingUsername.length > 30) {
        return res.status(400).send({
          message: "Username must be between 3 and 30 characters",
        });
      }

      const normalizedUsername = incomingUsername.toLowerCase();
      if (normalizedUsername !== user.username) {
        const existing = await User.findOne({ username: normalizedUsername });
        if (existing) {
          return res.status(400).send({ message: "Username already exists" });
        }
      }
      updates.username = normalizedUsername;
    }

    if (incomingEmail) {
      if (!isValidEmail(incomingEmail)) {
        return res.status(400).send({ message: "Please provide a valid email address" });
      }
      updates.email = incomingEmail;
    }

    if (incomingPhone) {
      if (!/^[+0-9()\-.\s]{7,20}$/.test(incomingPhone)) {
        return res.status(400).send({
          message: "Phone number format is invalid",
        });
      }
      updates.phoneNum = incomingPhone;
    } else if (req.body.phoneNum !== undefined) {
      updates.phoneNum = "";
    }

    if (incomingLocation.length > 120) {
      return res.status(400).send({
        message: "Location must be 120 characters or fewer",
      });
    }
    if (req.body.location !== undefined) {
      updates.location = incomingLocation;
    }

    if (req.file) {
      updates.profileImageUrl = req.file.location;
      updates.profileImageKey = req.file.key;

      if (user.profileImageKey && user.profileImageKey !== req.file.key) {
        try {
          await s3.send(
            new DeleteObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: user.profileImageKey,
            })
          );
        } catch (s3Error) {
          // Do not block profile updates when old-image cleanup fails.
          console.error("Failed to delete previous profile image:", s3Error.message);
        }
      }
    }

    const updatedUser = await User.findByIdAndUpdate(user._id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    return res.status(200).send({
      message: "Profile updated successfully",
      data: sanitizeUserResponse(updatedUser),
    });
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
};
