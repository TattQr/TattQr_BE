const User = require("../models/Users");
const QRCode = require("../models/QRCode");
const { default: mongoose } = require("mongoose");
const { HistoricalContentModel, ContentModel } = require("../models/Index");

// View a list of users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    const usersWithQRs = await Promise.all(
      users.map(async (user) => {
        const qrCodes = await QRCode.find({ user: user._id });
        return {
          ...user.toObject(),
          qrCodes: qrCodes,
        };
      })
    );

    res.status(200).json(usersWithQRs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Search users by username or email
exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    }).select("-password");

    const usersWithQRs = await Promise.all(
      users.map(async (user) => {
        const qrCodes = await QRCode.find({ user: user._id });
        return {
          ...user.toObject(),
          qrCodes: qrCodes,
        };
      })
    );
    res.status(200).json(usersWithQRs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a user's details
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedUser = await User.findByIdAndUpdate(id, req.body, {
      new: true,
    }).select("-password");
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete or deactivate a user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.query;

    console.log("id is", id);
    const objId = new mongoose.Types.ObjectId(id);
    console.log(objId);
    await User.findByIdAndDelete(objId);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// View all generated QR codes
exports.getAllQRCodes = async (req, res) => {
  try {
    const qrCodes = await QRCode.find();
    console.log(qrCodes,"--------------------allqr");
    res.status(200).json({data:qrCodes,message:"QR Codes retrieved successfully"});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a QR codes
exports.deleteQRCode = async (req, res) => {
  try {
    const { id } = req.query;
    await QRCode.findByIdAndDelete(id);
    res.status(200).json({ message: "QR Code deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Monitor overall app statistics
exports.getAppStatistics = async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const qrCodeCount = await QRCode.countDocuments();
    const contentCount = await ContentModel.countDocuments();

    res.status(200).json({
      userCount,
      qrCodeCount,
      contentCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllContentsWithUsers = async (req, res) => {
  try {
    // Fetch all content along with user data
    const contents = await ContentModel.find()
      .populate({
        path: "qrCode",
        populate: {
          path: "user",
          model: "User",
          select: "username email",
        },
      })
      .exec();

    // Fetch all historical content along with user data
    const historicalContents = await HistoricalContentModel.find()
      .populate({
        path: "qrCode",
        populate: {
          path: "user",
          model: "User",
          select: "username email",
        },
      })
      .exec();

    res.status(200).json({
      success: true,
      data: {
        contents,
        historicalContents,
      },
    });
  } catch (error) {
    console.error("Error fetching contents: ", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
