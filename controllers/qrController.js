const { default: mongoose } = require("mongoose");
const QRCodeModel = require("../models/QRCode");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");

// Ensure the uploads directory exists
const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};
ensureDirectoryExists(path.join(__dirname, "../uploads"));

const createQRCode = async (req, res) => {
  try {
    console.log("req.user is", req.user);
    const text = req.body.text;
    const userId = req.user.id;
    const username = req.user.userName;
    const id = uuidv4();

    const filePath = path.join(__dirname, "../uploads", `${id}.png`);
    // Generate the QR code and save it as a file1
    await QRCode.toFile(filePath, text);

    const userObjId = new mongoose.Types.ObjectId(userId);

    const findQr = await QRCodeModel.findOne({ user: userObjId });

    if (findQr) {
      return res
        .status(400)
        .send({ status: 400, message: "QR code already exists" });
    }

    // const qrCodeURLWithUserId = `${text}?uId=${userId}`;
    const qrCodeURLWithUserId = `${text}?un=${username}`;

    // Save QR code metadata to the database
    const qrCode = new QRCodeModel({
      text: qrCodeURLWithUserId,
      filePath: filePath,
      // url: `https://damonbe-production-ff33.up.railway.app/uploads/${id}.png`,
      url: `http://localhost:5000/uploads/${id}.png`,
      user: userId,
      currentContent: null,
    });
    await qrCode.save();
    // const qrCodeURLWithUserId = `${qrCode.text}?userId=${userId}`;
    console.log("QR code created", qrCode);
    res.status(201).send({ qrCodeURL: qrCode.url, text: qrCode.text });
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
