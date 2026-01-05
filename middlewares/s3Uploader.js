// middlewares/s3Uploader.js
const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = require("../config/s3");
const path = require("path");

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const filename = `${Date.now()}-${file.originalname}`;
      cb(null, filename);
    },
  }),
});

module.exports = upload;
