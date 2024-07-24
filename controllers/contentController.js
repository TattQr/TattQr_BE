const QRCodeModel = require("../models/QRCode");
const ContentModel = require("../models/Content");
const UserModel = require("../models/Users");
const HistoricalContentModel = require("../models/HistoricalContent");
const mongoose = require("mongoose");
const path = require("path");

const createContent = async (req, res) => {
  try {
    const { qrCodeId, contentType: reqContentType, text, label } = req.query; // Receive JSON data from URL params or query params

    const userId = req.user.id;
    console.log("ser id is", userId);
    let contentType = reqContentType;
    let contentUrl = null;

    const qrId = new mongoose.Types.ObjectId(qrCodeId);

    const qrCode = await QRCodeModel.findById(qrId);

    if (!qrCode) {
      return res
        .status(404)
        .send({ message: "QR Code not found", status: 404 });
    }

    console.log("qr code is", qrCode);

    // if (qrCode.user !== userId) {
    //   return res
    //     .status(403)
    //     .send({ message: "You are not the owner of this QR Code" });
    // }

    // Handle file upload using multer
    if (req.file) {
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      if (
        fileExtension === ".mp3" ||
        fileExtension === ".wav" ||
        fileExtension === ".m4a" ||
        fileExtension === ".flac" ||
        fileExtension === ".3gp" ||
        fileExtension === ".aac" ||
        fileExtension === ".wma"
      ) {
        contentType = "audio";
      } else if (
        fileExtension === ".mp4" ||
        fileExtension === ".avi" ||
        fileExtension === ".mov" ||
        fileExtension === ".wmv" ||
        fileExtension === ".webm" ||
        fileExtension === ".mkv" ||
        fileExtension === ".flv"
      ) {
        contentType = "video";
      } else if (
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
        contentType = "image";
      } else {
        contentType = "file";
      }

      contentUrl = `/uploads/${req.file.filename}`;
    } else if (contentType === "text") {
      contentUrl = req.body.contentUrl ? req.body.contentUrl : null;
    }

    // Create new content
    const newContent = new ContentModel({
      qrCode: qrId,
      contentType: contentType ? contentType : "text",
      contentUrl: contentUrl
        ? // ? `https://damonbe-production-ff33.up.railway.app${contentUrl}`
          `https://tattqrbe-production.up.railway.app${contentUrl}`
        : null,
      text: text ? text : "",
      label: label ? label : "",
    });

    await newContent.save();

    // Move current content to historical if exists
    if (qrCode.currentContent) {
      const currentContent = await ContentModel.findById(qrCode.currentContent);

      const historicalContent = new HistoricalContentModel({
        qrCode: qrCodeId,
        contentType: currentContent.contentType,
        contentUrl: currentContent.contentUrl,
        label: currentContent.label,
      });

      await historicalContent.save();
    }

    // Set new content as current content
    qrCode.currentContent = newContent._id;

    await qrCode.save();

    res
      .status(201)
      .send({ message: "Content created and set as current", newContent });
  } catch (error) {
    console.error("Error creating content", error);
    res.status(500).send({ message: error.message });
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

    if (qrCode.currentContent && qrCode.currentContent.toString() !== conId) {
      const currentContent = await ContentModel.findById(qrCode.currentContent);

      const historicalContent = new HistoricalContentModel({
        qrCode: qrCodeId,
        contentType: currentContent.contentType,
        contentUrl: currentContent.contentUrl,
      });

      await historicalContent.save();
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
//     const { qrCodeId } = req.params;
//     const qrId = new mongoose.Types.ObjectId(qrCodeId);

//     // Find the QR code by ID and populate the current content
//     const qrCode = await QRCodeModel.findById(qrId).populate("currentContent");
//     if (!qrCode) {
//       return res.status(404).send({ message: "QR Code not found" });
//     }

//     if (!qrCode.currentContent) {
//       return res.status(404).send({ message: "No current content found" });
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
    let qrCodeId = req.params.qrCodeId;
    let qrCode;

    if (!qrCodeId) {
      const { userId } = req.params;
      console.log("req.params is", req.params);

      if (!userId) {
        return res.status(400).send({
          message: "QR Code ID or User ID must be provided",
          status: 400,
        });
      }

      // const userObjId = new mongoose.Types.ObjectId(userId);

      // Find the QR code by user ID
      const user = await UserModel.findOne({ tag: userId }).populate("qrCode");
      console.log("user is", user);
      if (!user) {
        return res
          .status(404)
          .send({ message: "QR Code not found for this user" });
      }

      qrCodeId = user._id;
      // Find the QR code by ID and populate the current content
      qrCode = await QRCodeModel.findOne({ user: qrCodeId }).populate(
        "currentContent"
      );
    } else {
      const qrId = new mongoose.Types.ObjectId(qrCodeId);
      // Find the QR code by ID and populate the current content
      qrCode = await QRCodeModel.findById(qrId).populate("currentContent");
    }
    if (!qrCode) {
      return res
        .status(404)
        .send({ message: "QR Code not found", status: 400 });
    }

    if (!qrCode.currentContent) {
      return res
        .status(404)
        .send({ message: "No current content found", status: 400 });
    }

    res.status(200).send({
      message: "Current content fetched successfully",
      currentContent: qrCode.currentContent,
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
    const contents = await ContentModel.find({ qrCode: qrId });

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

    if (qrCode.currentContent.toString() === id) {
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

module.exports = {
  getContents,
  createContent,
  getContentsByQRCode,
  setCurrentContent,
  getHistoricalContentsByQRCode,
  getCurrentContentByQRCode,
  getAllContentsByQRCode,
  deleteContent,
};
