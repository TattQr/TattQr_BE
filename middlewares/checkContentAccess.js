
// const { default: mongoose } = require("mongoose");
// const { ContentModel, QRModel, UserModel } = require("../models/Index");

// const checkContentAccess = async (req, res, next) => {
//   try {
//     console.log("i am here");

//     // Extract qrCodeId or userId from request (assuming they are passed in params or headers)
//     const qrCodeId = req.params.qrCodeId || req.query.qrCodeId;
//     const userId = req.params.userId || req.user.id; // Adjust based on your setup

//     let qrCode;

//     if (qrCodeId) {
//       // If qrCodeId is provided, find the QR code directly
//       qrCode = await QRModel.findById(qrCodeId).populate("currentContent");
//       if (!qrCode) {
//         return res.status(404).json({
//           status: 404,
//           message: "QR Code not found",
//         });
//       }
//     } else if (userId) {
//       // If userId is provided, find the user and their QR code
//       console.log("user id is", typeof userId);
      
//       // const Id = new mongoose.Types.ObjectId(userId)
//       const user = await UserModel.findOne({tag:userId});
//       if (!user) {
//         return res.status(404).json({
//           status: 404,
//           message: "User not found",
//         });
//       }

//       qrCode = await QRModel.findOne({ user: user._id }).populate(
//         "currentContent"
//       );
//       if (!qrCode) {
//         return res.status(404).json({
//           status: 404,
//           message: "QR Code not found for this user",
//         });
//       }
//     } else {
//       // If neither qrCodeId nor userId is provided, return an error
//       return res.status(400).json({
//         status: 400,
//         message: "Either qrCodeId or userId must be provided",
//       });
//     }

//     // Get the current content
//     const content = qrCode.currentContent;
//     if (!content) {
//       return res.status(404).json({
//         status: 404,
//         message: "No content found for this QR code",
//       });
//     }

//     console.log("content is", content);

//     // Check if content has expired (if temporary)
//     if (content.type === "temporary" && content.expiryTime < new Date()) {
//       // Find and set permanent content as current if exists
//       const permanentContent = await ContentModel.findOne({
//         qrCode: qrCode._id,
//         type: "permanent",
//       });

//       if (permanentContent) {
//         await QRModel.findByIdAndUpdate(qrCode._id, {
//           currentContent: permanentContent._id,
//         });
//         req.content = permanentContent;
//       } else {
//         // If no permanent content exists, set currentContent to null
//         await QRModel.findByIdAndUpdate(qrCode._id, {
//           currentContent: null,
//         });
//         req.content = null;
//       }
//     } else {
//       req.content = content;
//     }

//     // Check if content is secure
//     if (req.content && req.content.isSecure) {
//       const providedPin = req.headers["x-content-pin"];
//       if (!providedPin || providedPin !== req.content.pin) {
//         return res.status(403).json({
//           status: 403,
//           message: "Invalid PIN provided",
//         });
//       }
//     }

//     next();
//   } catch (error) {
//     next(error);
//   }
// };

// module.exports = { checkContentAccess };


const { ContentModel, QRModel, UserModel } = require("../models/Index");
const { trackScanEvent } = require("../utils/scanTracking");

// const checkContentAccess = async (req, res, next) => {
//   try {
//     let qrCode;
//     const qrCodeId = req.params.qrCodeId || req.query.qrCodeId;
//     const userId = req.params.userId || req.user.id;

//     if (qrCodeId) {
//       qrCode = await QRModel.findById(qrCodeId).populate("currentContent");
//       if (!qrCode) {
//         return res.status(404).json({ message: "QR Code not found" });
//       }
//     } else if (userId) {
//       const user = await UserModel.findOne({ tag: userId });
//       if (!user) {
//         return res.status(404).json({ message: "User not found" });
//       }

//       qrCode = await QRModel.findOne({ user: user._id }).populate("currentContent");
//       if (!qrCode) {
//         return res.status(404).json({ message: "QR Code not found for this user" });
//       }
//     } else {
//       return res.status(400).json({ message: "Either qrCodeId or userId must be provided" });
//     }

//     const content = qrCode.currentContent;
//     console.log("qrCOde is", qrCode);
    
//     if (!content) {
//       return res.status(404).json({ message: "No content found for this QR code" });
//     }

//     // Handle temporary content expiration
//     if (content.type === "temporary" && content.expiryTime < new Date()) {
//       const permanentContent = await ContentModel.findOne({ qrCode: qrCode._id, type: "permanent" });
//       if (permanentContent) {
//         await QRModel.findByIdAndUpdate(qrCode._id, { currentContent: permanentContent._id });
//         req.content = permanentContent;
//       } else {
//         await QRModel.findByIdAndUpdate(qrCode._id, { currentContent: null });
//         req.content = null;
//       }
//     } else {
//       req.content = content;
//     }

//     // PIN validation for secure content
//     if (req.content && req.content.isSecure) {
//       const providedPin = req.headers["x-content-pin"];
//       if (!providedPin || providedPin !== req.content.pin) {
//         return res.status(403).json({ message: "Invalid PIN provided" });
//       }
//     }

//     next();
//   } catch (error) {
//     next(error);
//   }
// };

const checkContentAccess = async (req, res, next) => {
  try {
    let qrCode;
    const qrCodeId = req.params.qrCodeId || req.query.qrCodeId;
    const userId = req.params.userId || req.user.id;

    // Fetch QR Code based on qrCodeId or userId
    if (qrCodeId) {
      qrCode = await QRModel.findById(qrCodeId).populate("currentContent");
      if (!qrCode) {
        return res.status(404).json({ message: "QR Code not found" });
      }
    } else if (userId) {
      const user = await UserModel.findOne({ tag: userId });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      qrCode = await QRModel.findOne({ user: user._id }).populate("currentContent");
      if (!qrCode) {
        return res.status(404).json({ message: "QR Code not found for this user" });
      }
    } else {
      return res.status(400).json({ message: "Either qrCodeId or userId must be provided" });
    }

    let content = qrCode.currentContent;

    // Handle missing or expired temporary content
    if (!content || (content.type === "temporary" && content.expiryTime < new Date())) {
      console.log("Temporary content expired or missing. Checking for permanent content...");
      const permanentContent = await ContentModel.findOne({ qrCode: qrCode._id, type: "permanent" });

      if (permanentContent) {
        console.log("Updating QR code with permanent content...");
        await QRModel.findByIdAndUpdate(
          qrCode._id,
          { currentContent: permanentContent._id },
          { new: true }
        );
        content = permanentContent; // Update content reference
      } else {
        console.log("No permanent content found. Setting currentContent to null...");
        await QRModel.findByIdAndUpdate(qrCode._id, { currentContent: null });
        content = null;
      }
    }

    // Final check for content availability
    if (!content) {
      return res.status(404).json({ message: "No content found after checking expiration and fallback" });
    }

    // PIN validation for secure content
    if (content.isSecure) {
      const providedPin = req.headers["x-content-pin"];
      if (!providedPin || providedPin !== content.pin) {
        return res.status(403).json({ message: "Invalid PIN provided" });
      }
    }

    req.content = content; // Set the final content
    console.log("Final content assigned to req.content:", req.content);

    if (req.params.userId) {
      try {
        await trackScanEvent({
          qrCode,
          content,
          req,
        });
      } catch (trackingError) {
        console.error("Failed to track scan event:", trackingError.message);
      }
    }

    next();
  } catch (error) {
    console.error("Error in checkContentAccess middleware:", error);
    next(error);
  }
};

module.exports = { checkContentAccess };
