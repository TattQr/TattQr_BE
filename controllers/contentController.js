const QRCodeModel = require("../models/QRCode");
const ContentModel = require("../models/Content");
const UserModel = require("../models/Users");
const HistoricalContentModel = require("../models/HistoricalContent");
const ScanEventModel = require("../models/ScanEvent");
const mongoose = require("mongoose");
const path = require("path");

const parseBoolean = (value) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }
  return false;
};

const resolveContentTypeFromFile = (fileName = "") => {
  const fileExtension = path.extname(fileName).toLowerCase();
  if (
    fileExtension === ".mp3" ||
    fileExtension === ".wav" ||
    fileExtension === ".m4a" ||
    fileExtension === ".flac" ||
    fileExtension === ".3gp" ||
    fileExtension === ".aac" ||
    fileExtension === ".wma"
  ) {
    return "audio";
  }
  if (
    fileExtension === ".mp4" ||
    fileExtension === ".avi" ||
    fileExtension === ".mov" ||
    fileExtension === ".wmv" ||
    fileExtension === ".webm" ||
    fileExtension === ".mkv" ||
    fileExtension === ".flv"
  ) {
    return "video";
  }
  if (
    [
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".svg",
      ".apng",
      ".avif",
      ".webp",
    ].includes(fileExtension)
  ) {
    return "image";
  }
  return "file";
};

const createContentEntry = async (req, { setAsCurrent = false } = {}) => {
  const {
    qrCodeId,
    contentType: reqContentType,
    text,
    label,
    category,
    contentDuration,
    isTemporary,
    isSecure,
    pin,
  } = req.query;

  if (!qrCodeId || !mongoose.Types.ObjectId.isValid(qrCodeId)) {
    return {
      status: 400,
      payload: { message: "Valid qrCodeId is required", status: 400 },
    };
  }

  const qrId = new mongoose.Types.ObjectId(qrCodeId);
  const qrCode = await QRCodeModel.findById(qrId);
  if (!qrCode) {
    return {
      status: 404,
      payload: { message: "QR Code not found", status: 404 },
    };
  }

  if (
    qrCode.user &&
    req.user?.id &&
    qrCode.user.toString() !== req.user.id.toString()
  ) {
    return {
      status: 403,
      payload: { message: "You are not authorized for this QR Code", status: 403 },
    };
  }

  const hasTextInput = typeof text === "string" && text.trim().length > 0;
  if (!req.file && !hasTextInput) {
    return {
      status: 400,
      payload: { message: "Either file or text is required", status: 400 },
    };
  }

  let contentType = reqContentType;
  let contentUrl = null;
  if (req.file) {
    contentType = resolveContentTypeFromFile(req.file.originalname);
    contentUrl = req.file.location;
  } else {
    contentType = reqContentType || "text";
    if (contentType === "text") {
      contentUrl = req.body.contentUrl ? req.body.contentUrl : null;
    }
  }

  const temporaryContent = parseBoolean(isTemporary);
  const secureContent = parseBoolean(isSecure);

  let expiryTime = null;
  if (temporaryContent) {
    const durationMinutes = Number(contentDuration);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return {
        status: 400,
        payload: {
          message: "Invalid contentDuration provided for temporary content",
          status: 400,
        },
      };
    }
    expiryTime = new Date(Date.now() + durationMinutes * 60000);
  }

  if (secureContent && (!pin || !String(pin).trim())) {
    return {
      status: 400,
      payload: { message: "PIN is required for secure content", status: 400 },
    };
  }

  const newContent = new ContentModel({
    qrCode: qrId,
    contentType: contentType ? contentType : "text",
    contentUrl: contentUrl || null,
    text: text ? text : "",
    label: label ? label : "",
    category: category ? category : "",
    type: temporaryContent ? "temporary" : "permanent",
    expiryTime,
    isSecure: secureContent,
    pin: secureContent ? String(pin).trim() : null,
  });

  await newContent.save();

  if (setAsCurrent) {
    if (qrCode.currentContent) {
      const currentContent = await ContentModel.findById(qrCode.currentContent);
      if (currentContent) {
        const historicalContent = new HistoricalContentModel({
          qrCode: qrCodeId,
          contentType: currentContent.contentType,
          contentUrl: currentContent.contentUrl,
          label: currentContent.label,
        });
        await historicalContent.save();
      }
    }

    qrCode.currentContent = newContent._id;
    await qrCode.save();
  }

  return {
    status: 201,
    payload: {
      message: setAsCurrent
        ? "Content created and set as current"
        : "Content added to gallery successfully",
      newContent,
      setAsCurrent,
    },
  };
};

const createContent = async (req, res) => {
  try {
    const result = await createContentEntry(req, { setAsCurrent: true });
    return res.status(result.status).send(result.payload);
  } catch (error) {
    console.error("Error creating content", error);
    res.status(500).send({ message: error.message });
  }
};

const addToGalleryContent = async (req, res) => {
  try {
    const result = await createContentEntry(req, { setAsCurrent: false });
    return res.status(result.status).send(result.payload);
  } catch (error) {
    console.error("Error adding content to gallery", error);
    return res.status(500).send({ message: error.message });
  }
};

const getContentsByQRCode = async (req, res) => {
  try {
    const { qrCodeId } = req.params;
    const qrCode = await QRCodeModel.findById(qrCodeId)
      .populate("currentContent")
      .exec();

    if (!qrCode) {
      return res
        .status(404)
        .send({ message: "QR Code not found", status: 404 });
    }

    const historicalContents = await HistoricalContentModel.find({
      qrCode: qrCodeId,
    });

    res.status(200).send({
      currentContent: qrCode.currentContent,
      historicalContents: historicalContents,
    });
  } catch (error) {
    console.error("Error fetching contents", error);
    res.status(500).send({ message: error.message });
  }
};

const setCurrentContent = async (req, res) => {
  try {
    console.log("body is", req);
    const { id } = req.params;
    const { qrId } = req.body;
    // const userId = req.user.id;

    console.log("content id is", req.params);

    console.log("body is ", req.body);
    console.log("body id ", req.body.id);

    const qrCodeId = new mongoose.Types.ObjectId(qrId);
    const conId = new mongoose.Types.ObjectId(id);

    const qrCode = await QRCodeModel.findById(qrCodeId);

    console.log("qrCode is", qrCode);

    if (!qrCode) {
      return res
        .status(404)
        .send({ message: "QR Code not found", status: 404 });
    }

    // if (qrCode.user.toString() !== userId) {
    //   return res
    //     .status(403)
    //     .send({ message: "You are not the owner of this QR Code" });
    // }

    const content = await ContentModel.findById(conId);

    if (!content) {
      return res.status(404).send({ message: "Content not found" });
    }
    if (content.qrCode.toString() !== qrCodeId.toString()) {
      return res.status(400).send({
        message: "Selected content does not belong to this QR code",
      });
    }

    if (
      qrCode.currentContent &&
      qrCode.currentContent.toString() !== conId.toString()
    ) {
      const currentContent = await ContentModel.findById(qrCode.currentContent);
      if (currentContent) {
        const historicalContent = new HistoricalContentModel({
          qrCode: qrCodeId,
          contentType: currentContent.contentType,
          contentUrl: currentContent.contentUrl,
        });
        await historicalContent.save();
      }
    }

    qrCode.currentContent = conId;

    await qrCode.save();

    res
      .status(200)
      .send({ message: "Current content updated", currentContent: content });
  } catch (error) {
    console.error("Error setting current content", error);
    res.status(500).send({ message: error.message });
  }
};

const getContents = async (req, res) => {
  try {
    const { qrCodeId } = req.params;

    const qrId = new mongoose.Types.ObjectId(qrCodeId);

    // Find the QR code by ID
    const qrCode = await QRCodeModel.findById(qrId);
    if (!qrCode) {
      return res.status(404).send({ message: "QR Code not found" });
    }

    // Find all  contents associated with the QR code
    const Contents = await ContentModel.find({
      qrCode: qrId,
    });

    res.status(200).send({
      message: "Contents fetched successfully",
      qrCode,
      Contents,
    });
  } catch (error) {
    console.error("Error fetching  contents", error);
    res.status(500).send({ message: "Error fetching  contents", status: 500 });
  }
};

const getHistoricalContentsByQRCode = async (req, res) => {
  try {
    const { qrCodeId } = req.params;
    const qrId = new mongoose.Types.ObjectId(qrCodeId);

    // Find the QR code by ID
    const qrCode = await QRCodeModel.findById(qrId);
    if (!qrCode) {
      return res.status(404).send({ message: "QR Code not found" });
    }

    // Find all historical contents associated with the QR code
    const historicalContents = await HistoricalContentModel.find({
      qrCode: qrId,
    });

    res.status(200).send({
      qrCode,
      historicalContents,
    });
  } catch (error) {
    console.error("Error fetching historical contents", error);
    res
      .status(500)
      .send({ message: "Error fetching historical contents", status: 500 });
  }
};


// const getCurrentContentByQRCode = async (req, res) => {
//   try {
//     let qrCodeId = req.params.qrCodeId;
//     let qrCode;

//     if (!qrCodeId) {
//       const { userId } = req.params;
//       console.log("req.params is", req.params);

//       if (!userId) {
//         return res.status(400).send({
//           message: "QR Code ID or User ID must be provided",
//           status: 400,
//         });
//       }

//       // const userObjId = new mongoose.Types.ObjectId(userId);

//       // Find the QR code by user ID
//       const user = await UserModel.findOne({ tag: userId }).populate("qrCode");
//       console.log("user is", user);
//       if (!user) {
//         return res
//           .status(404)
//           .send({ message: "QR Code not found for this user" });
//       }

//       qrCodeId = user._id;
//       // Find the QR code by ID and populate the current content
//       qrCode = await QRCodeModel.findOne({ user: qrCodeId }).populate(
//         "currentContent"
//       );
//     } else {
//       const qrId = new mongoose.Types.ObjectId(qrCodeId);
//       // Find the QR code by ID and populate the current content
//       qrCode = await QRCodeModel.findById(qrId).populate("currentContent");
//     }
//     if (!qrCode) {
//       return res
//         .status(404)
//         .send({ message: "QR Code not found", status: 400 });
//     }

//     if (!qrCode.currentContent) {
//       return res
//         .status(404)
//         .send({ message: "No current content found", status: 400 });
//     }

//     res.status(200).send({
//       message: "Current content fetched successfully",
//       currentContent: qrCode.currentContent,
//     });
//   } catch (error) {
//     console.error("Error fetching current content", error);
//     res.status(500).send({ message: "Error fetching current content" });
//   }
// };


const getCurrentContentByQRCode = async (req, res) => {
  try {
    // The middleware already populated `req.content`
    const content = req.content;
    console.log("req.content is", content);
    

    if (!content) {
      return res.status(404).send({
        message: "No current content found",
        status: 404,
      });
    }

    // Return the fetched content
    res.status(200).send({
      message: "Current content fetched successfully",
      currentContent: content,
    });
  } catch (error) {
    console.error("Error fetching current content", error);
    res.status(500).send({ message: "Error fetching current content" });
  }
};


const getAllContentsByQRCode = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("id", id);
    const qrId = new mongoose.Types.ObjectId(id);
    console.log("qr id is", qrId);

    // Find the QR code by ID and populate the current content
    const qrCode = await QRCodeModel.findById(qrId).populate("currentContent");
    if (!qrCode) {
      return res.status(404).send({ message: "QR Code not found" });
    }

    // Find all contents associated with the QR code
    const contents = await ContentModel.find({ qrCode: qrId }).sort({
      createdAt: -1,
    });

    res.status(200).send({
      message: "Contents fetched successfully",
      currentContent: qrCode.currentContent,
      contents,
    });
  } catch (error) {
    console.error("Error fetching contents", error);
    res.status(500).send({ message: "Error fetching contents" });
  }
};

const deleteContent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const contentId = new mongoose.Types.ObjectId(id);

    const content = await ContentModel.findById(contentId);
    if (!content) {
      return res
        .status(404)
        .send({ message: "Content not found", status: 404 });
    }

    const qrCode = await QRCodeModel.findById(content.qrCode);
    // if (!qrCode || qrCode.user.toString() !== userId) {
    //   return res.status(403).send({
    //     message: "You are not authorized to delete this content",
    //     status: 403,
    //   });
    // }

    if (qrCode.currentContent && qrCode.currentContent.toString() === id) {
      // qrCode.currentContent = null;
      // await qrCode.save();
      return res.status(400).send({
        message: "Cannot delete the current content update it first",
        status: 400,
      });
    } else {
      await ContentModel.findByIdAndDelete(contentId);
    }

    res
      .status(200)
      .send({ message: "Content deleted successfully", status: 200 });
  } catch (error) {
    res.status(500).send({ message: error.message, status: 500 });
  }
};

const getScanSummary = async (req, res) => {
  try {
    const qrCode = await QRCodeModel.findOne({ user: req.user.id }).lean();
    if (!qrCode) {
      return res.status(200).send({
        message: "Scan summary fetched successfully",
        summary: {
          totalScans: 0,
          uniqueVisitors: 0,
          lastScannedAt: null,
          unreadNotifications: 0,
        },
      });
    }

    const unreadNotifications = await ScanEventModel.countDocuments({
      ownerUser: req.user.id,
      qrCode: qrCode._id,
      isRead: false,
    });

    return res.status(200).send({
      message: "Scan summary fetched successfully",
      summary: {
        totalScans: Number(qrCode.totalScans || 0),
        uniqueVisitors: Number(qrCode.uniqueVisitors || 0),
        lastScannedAt: qrCode.lastScannedAt || null,
        unreadNotifications,
      },
    });
  } catch (error) {
    console.error("Error fetching scan summary", error);
    return res.status(500).send({ message: error.message });
  }
};

const getScanNotifications = async (req, res) => {
  try {
    const qrCode = await QRCodeModel.findOne({ user: req.user.id }).lean();
    if (!qrCode) {
      return res.status(200).send({
        message: "Scan notifications fetched successfully",
        notifications: [],
        unreadNotifications: 0,
      });
    }

    const requestedLimit = Number(req.query.limit || 20);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(requestedLimit, 100))
      : 20;

    const notifications = await ScanEventModel.find({
      ownerUser: req.user.id,
      qrCode: qrCode._id,
    })
      .populate("content", "label contentType text")
      .sort({ scannedAt: -1 })
      .limit(limit)
      .lean();

    const unreadNotifications = await ScanEventModel.countDocuments({
      ownerUser: req.user.id,
      qrCode: qrCode._id,
      isRead: false,
    });

    const formatted = notifications.map((item) => ({
      _id: item._id,
      scannedAt: item.scannedAt,
      isUniqueVisitor: Boolean(item.isUniqueVisitor),
      isRead: Boolean(item.isRead),
      content: item.content
        ? {
            _id: item.content._id,
            label: item.content.label || "",
            contentType: item.content.contentType || "",
            text: item.content.text || "",
          }
        : null,
      location: {
        city: item.city || "",
        region: item.region || "",
        country: item.country || "",
        timezone: item.timezone || "",
        latitude: item.latitude,
        longitude: item.longitude,
      },
      device: {
        deviceType: item.deviceType || "desktop",
        browser: item.browser || "Unknown",
        os: item.os || "Unknown",
        platform: item.platform || "",
        locale: item.locale || "",
      },
      ipAddress: item.ipAddress || "",
    }));

    return res.status(200).send({
      message: "Scan notifications fetched successfully",
      notifications: formatted,
      unreadNotifications,
    });
  } catch (error) {
    console.error("Error fetching scan notifications", error);
    return res.status(500).send({ message: error.message });
  }
};

const markScanNotificationsRead = async (req, res) => {
  try {
    const qrCode = await QRCodeModel.findOne({ user: req.user.id }).lean();
    if (!qrCode) {
      return res.status(200).send({
        message: "No notifications to update",
      });
    }

    await ScanEventModel.updateMany(
      {
        ownerUser: req.user.id,
        qrCode: qrCode._id,
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    );

    return res.status(200).send({
      message: "Notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking scan notifications as read", error);
    return res.status(500).send({ message: error.message });
  }
};

module.exports = {
  getContents,
  createContent,
  addToGalleryContent,
  getContentsByQRCode,
  setCurrentContent,
  getHistoricalContentsByQRCode,
  getCurrentContentByQRCode,
  getAllContentsByQRCode,
  deleteContent,
  getScanSummary,
  getScanNotifications,
  markScanNotificationsRead,
};
