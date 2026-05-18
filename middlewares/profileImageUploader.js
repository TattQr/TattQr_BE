const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const { randomUUID } = require("crypto");
const s3 = require("../config/s3");

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, WEBP, and GIF images are allowed"));
    }
    cb(null, true);
  },
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET_NAME,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
      const key = `profile-images/${req.user.id}-${Date.now()}-${randomUUID()}${ext}`;
      cb(null, key);
    },
  }),
});

const uploadProfileImage = (req, res, next) => {
  upload.single("profileImage")(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ message: "Profile image must be 5MB or smaller" });
    }

    return res.status(400).json({
      message: error.message || "Failed to upload profile image",
    });
  });
};

module.exports = uploadProfileImage;
