// const { default: mongoose } = require("mongoose");
// const QRCodeModel = require("../models/QRCode");
// const fs = require("fs");
// const path = require("path");
// const QRCode = require("qrcode");
// const { v4: uuidv4 } = require("uuid");

// // Ensure the uploads directory exists
// const ensureDirectoryExists = (directory) => {
//   if (!fs.existsSync(directory)) {
//     fs.mkdirSync(directory, { recursive: true });
//   }
// };
// ensureDirectoryExists(path.join(__dirname, "../uploads"));

// const createQRCode = async (req, res) => {
//   try {
//     console.log("req.user is", req.user);
//     const text = req.body.text;
//     const userId = req.user.id;
//     const username = req.user.userName;
//     const tag = req.user.tag;
//     const id = uuidv4();

//     const filePath = path.join(__dirname, "../uploads", `${id}.png`);
//     // Generate the QR code and save it as a file1
//     await QRCode.toFile(filePath, text);

//     const userObjId = new mongoose.Types.ObjectId(userId);

//     const findQr = await QRCodeModel.findOne({ user: userObjId });

//     if (findQr) {
//       return res
//         .status(400)
//         .send({ status: 400, message: "QR code already exists" });
//     }

//     // const qrCodeURLWithUserId = `${text}?uId=${userId}`;
//     const qrCodeURLWithUserId = `${text}?un=${tag}`;

//     // Save QR code metadata to the database
//     const qrCode = new QRCodeModel({
//       text: qrCodeURLWithUserId,
//       filePath: filePath,
//       // url: `http://localhost:5000/uploads/${id}.png`,
//       url: `https://tattqrbe-production.up.railway.app/uploads/${id}.png`,
//       user: userId,
//       currentContent: null,
//     });
//     await qrCode.save();
//     // const qrCodeURLWithUserId = `${qrCode.text}?userId=${userId}`;
//     console.log("QR code created", qrCode);
//     res.status(201).send({ qrCodeURL: qrCode.url, text: qrCode.text });
//   } catch (error) {
//     console.error("Error generating QR code", error);
//     res.status(500).send({ message: error.message });
//   }
// };

const { default: mongoose } = require("mongoose");
const QRCodeModel = require("../models/QRCode");
const QRCode = require("qrcode");
// const { v4: uuidv4 } = require("uuid");
const { randomUUID } = require("crypto");
const { DeleteObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../config/s3");

const buildQrDestinationUrl = (rawText, tag) => {
  if (!rawText || !String(rawText).trim()) {
    throw new Error("QR destination URL is required");
  }
  if (!tag || !String(tag).trim()) {
    throw new Error("User tag is required");
  }

  let candidate = String(rawText).trim();
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(candidate);
  } catch (error) {
    throw new Error("Invalid QR destination URL");
  }

  parsedUrl.pathname = parsedUrl.pathname.replace(/\/m\/?$/, "/");
  if (!parsedUrl.pathname) {
    parsedUrl.pathname = "/";
  }
  parsedUrl.hash = "";
  parsedUrl.searchParams.set("un", String(tag).trim());

  return parsedUrl.toString();
};

const extractTagFromQrText = (qrText = "") => {
  try {
    const parsed = new URL(String(qrText));
    const tag = parsed.searchParams.get("un");
    return tag ? String(tag).trim() : "";
  } catch (error) {
    return "";
  }
};

const uploadQrPngToS3 = async (destinationText) => {
  const id = randomUUID();
  const qrBuffer = await QRCode.toBuffer(destinationText);
  const s3Key = `qr-codes/${id}.png`;
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
      Body: qrBuffer,
      ContentType: "image/png",
      ACL: "public-read",
    })
  );
  const s3Url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
  return { s3Key, s3Url };
};

const createQRCode = async (req, res) => {
  try {
    console.log("req.user is", req.user);
    const text = req.body.text;
    const userId = req.user.id;
    const tag = req.user.tag;
    // const id = uuidv4();
    const userObjId = new mongoose.Types.ObjectId(userId);
    const findQr = await QRCodeModel.findOne({ user: userObjId });

    if (findQr) {
      return res
        .status(400)
        .send({ status: 400, message: "QR code already exists" });
    }

    // Build QR URL with required scheme and `un` query param.
    const qrCodeURLWithUserId = buildQrDestinationUrl(text, tag);

    const { s3Key, s3Url } = await uploadQrPngToS3(qrCodeURLWithUserId);

    // 4. Save QR metadata to MongoDB
    const qrCode = new QRCodeModel({
      text: qrCodeURLWithUserId,
      filePath: s3Key, // optional for reference
      url: s3Url,
      user: userId,
      currentContent: null,
    });

    await qrCode.save();

    res.status(201).send({ qrCodeURL: s3Url, text: qrCodeURLWithUserId });
  } catch (error) {
    console.error("Error generating QR code", error);
    res.status(500).send({ message: error.message });
  }
};

const updateUserQR = async (req, res) => {
  try {
    const userObjId = new mongoose.Types.ObjectId(req.user.id);
    const existingQr = await QRCodeModel.findOne({ user: userObjId });

    if (!existingQr) {
      return res.status(404).send({
        status: 404,
        message: "QR code not found for this user",
      });
    }

    const fallbackTag = extractTagFromQrText(existingQr.text || "");
    const resolvedTag = String(req.user.tag || fallbackTag || "").trim();
    if (!resolvedTag) {
      return res.status(400).send({
        status: 400,
        message: "Unable to resolve user tag for QR update",
      });
    }

    const canonicalBaseUrl = "https://tq2.ai";
    const updatedText = buildQrDestinationUrl(canonicalBaseUrl, resolvedTag);
    const { s3Key: newS3Key, s3Url: newS3Url } = await uploadQrPngToS3(updatedText);

    const oldFilePath = existingQr.filePath ? String(existingQr.filePath) : "";
    existingQr.text = updatedText;
    existingQr.url = newS3Url;
    existingQr.filePath = newS3Key;
    await existingQr.save();

    if (oldFilePath && oldFilePath !== newS3Key) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: oldFilePath,
          })
        );
      } catch (deleteError) {
        const isNotFound =
          deleteError?.name === "NoSuchKey" ||
          deleteError?.$metadata?.httpStatusCode === 404;
        if (!isNotFound) {
          console.error("Failed to delete old QR image from S3:", deleteError);
        }
      }
    }

    return res.status(200).send({
      message: "QR code updated successfully",
      qrCode: existingQr,
      qrCodeURL: newS3Url,
      text: updatedText,
    });
  } catch (error) {
    console.error("Error updating QR code", error);
    return res.status(500).send({ message: error.message });
  }
};


const getQRCode = async (req, res) => {
  try {
    const qrCode = await QRCodeModel.findById(req.params.id);
    if (!qrCode) {
      return res.status(404).send({ message: "QR Code not found" });
    }
    res.status(200).send(qrCode);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

const getUserQR = async (req, res) => {
  try {
    console.log("finding user qr where user is", req.user.userName);
    const findQr = await QRCodeModel.findOne({ user: req.user.id });

    if (!findQr) {
      console.log("No QR code found");
      return res
        .status(400)
        .send({ status: 400, message: "No QR code found", data: null });
    }
    console.log("QR code found is", findQr);
    return res.status(200).send(findQr);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

module.exports = {
  createQRCode,
  updateUserQR,
  getQRCode,
  getUserQR,
};
