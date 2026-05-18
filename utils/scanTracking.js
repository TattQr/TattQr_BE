const crypto = require("crypto");
const { ContentModel, QRModel, ScanEventModel } = require("../models/Index");

const safeString = (value, maxLength = 200) => {
  if (!value || typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, maxLength);
};

const getClientIp = (req) => {
  const forwarded = safeString(req.headers["x-forwarded-for"]);
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return safeString(
    req.headers["x-real-ip"] || req.socket?.remoteAddress || req.ip || "",
    120
  );
};

const parseBrowser = (userAgent) => {
  if (!userAgent) {
    return "Unknown";
  }
  if (/edg/i.test(userAgent)) return "Edge";
  if (/opr|opera/i.test(userAgent)) return "Opera";
  if (/chrome|crios/i.test(userAgent)) return "Chrome";
  if (/firefox|fxios/i.test(userAgent)) return "Firefox";
  if (/safari/i.test(userAgent) && !/chrome|crios|android/i.test(userAgent)) return "Safari";
  return "Unknown";
};

const parseOS = (userAgent) => {
  if (!userAgent) {
    return "Unknown";
  }
  if (/windows nt/i.test(userAgent)) return "Windows";
  if (/android/i.test(userAgent)) return "Android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/mac os x|macintosh/i.test(userAgent)) return "macOS";
  if (/linux/i.test(userAgent)) return "Linux";
  return "Unknown";
};

const parseDeviceType = (userAgent) => {
  if (!userAgent) {
    return "desktop";
  }
  if (/ipad|tablet/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|ipod|android/i.test(userAgent)) return "mobile";
  return "desktop";
};

const parseNumberHeader = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildVisitorId = (req) => {
  const explicitVisitorId = safeString(req.headers["x-visitor-id"], 120);
  if (explicitVisitorId) {
    return explicitVisitorId;
  }

  const userAgent = safeString(req.headers["user-agent"], 500);
  const ip = getClientIp(req);
  const seed = `${ip}|${userAgent}`;
  return crypto.createHash("sha256").update(seed).digest("hex");
};

const trackScanEvent = async ({ qrCode, content, req }) => {
  if (!qrCode || !qrCode._id || !qrCode.user) {
    return null;
  }

  const now = new Date();
  const visitorId = buildVisitorId(req);
  const duplicateWindowStart = new Date(now.getTime() - 45000);
  const recentDuplicate = await ScanEventModel.findOne({
    qrCode: qrCode._id,
    visitorId,
    scannedAt: { $gte: duplicateWindowStart },
  })
    .select("_id")
    .lean();

  if (recentDuplicate) {
    return {
      deduplicated: true,
      isUniqueVisitor: false,
    };
  }

  const existingVisitor = await ScanEventModel.exists({
    qrCode: qrCode._id,
    visitorId,
  });
  const isUniqueVisitor = !Boolean(existingVisitor);

  const userAgent = safeString(req.headers["user-agent"], 500);
  const ipAddress = getClientIp(req);
  const timezone =
    safeString(req.headers["x-client-timezone"], 120) ||
    safeString(req.headers["x-vercel-ip-timezone"], 120);
  const locale = safeString(req.headers["x-client-locale"], 120);
  const platform = safeString(req.headers["x-client-platform"], 120);
  const city = safeString(
    req.headers["x-vercel-ip-city"] || req.headers["x-city"],
    120
  );
  const region = safeString(
    req.headers["x-vercel-ip-country-region"] || req.headers["x-region"],
    120
  );
  const country = safeString(
    req.headers["x-vercel-ip-country"] ||
      req.headers["cf-ipcountry"] ||
      req.headers["x-country"],
    120
  );
  const latitude = parseNumberHeader(req.headers["x-client-lat"]);
  const longitude = parseNumberHeader(req.headers["x-client-lng"]);
  const referrer = safeString(req.headers["referer"], 500);

  await ScanEventModel.create({
    qrCode: qrCode._id,
    ownerUser: qrCode.user,
    content: content?._id || null,
    visitorId,
    isUniqueVisitor,
    scannedAt: now,
    ipAddress,
    userAgent,
    deviceType: parseDeviceType(userAgent),
    browser: parseBrowser(userAgent),
    os: parseOS(userAgent),
    platform,
    locale,
    timezone,
    city,
    region,
    country,
    latitude,
    longitude,
    referrer,
    isRead: false,
  });

  await QRModel.findByIdAndUpdate(qrCode._id, {
    $inc: {
      totalScans: 1,
      uniqueVisitors: isUniqueVisitor ? 1 : 0,
    },
    $set: {
      lastScannedAt: now,
    },
  });

  if (content?._id) {
    await ContentModel.findByIdAndUpdate(content._id, {
      $inc: {
        scanCount: 1,
        uniqueVisitorCount: isUniqueVisitor ? 1 : 0,
      },
      $set: {
        lastScannedAt: now,
      },
    });
  }

  return {
    isUniqueVisitor,
  };
};

module.exports = {
  trackScanEvent,
};
