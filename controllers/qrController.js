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
const { PutObjectCommand } = require("@aws-sdk/client-s3");
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

const createQRCode = async (req, res) => {
  try {
    console.log("req.user is", req.user);
    const text = req.body.text;
    const userId = req.user.id;
    const tag = req.user.tag;
    // const id = uuidv4();
    const id = randomUUID();

    const userObjId = new mongoose.Types.ObjectId(userId);
    const findQr = await QRCodeModel.findOne({ user: userObjId });

    if (findQr) {
      return res
        .status(400)
        .send({ status: 400, message: "QR code already exists" });
    }

    // Build QR URL with required scheme and `un` query param.
    const qrCodeURLWithUserId = buildQrDestinationUrl(text, tag);

    // 1. Generate the QR Code image as a Buffer
    const qrBuffer = await QRCode.toBuffer(qrCodeURLWithUserId);

    // 2. Upload Buffer to S3
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

    // 3. Construct public S3 URL
    const s3Url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

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
  getQRCode,
  getUserQR,
};
