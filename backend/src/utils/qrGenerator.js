const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

const QR_DIR = path.join(__dirname, "..", "..", "uploads", "qrcodes");

/**
 * Generates a QR code PNG encoding the public verify-page URL for a product
 * and writes it to disk under backend/uploads/qrcodes/<contractProductId>.png.
 * Returns the relative URL the frontend/backend should expose (served
 * statically from /uploads via app.js).
 */
async function generateProductQrCode(contractProductId) {
  if (!fs.existsSync(QR_DIR)) {
    fs.mkdirSync(QR_DIR, { recursive: true });
  }

  const verifyUrl = `${process.env.FRONTEND_ORIGIN || "http://localhost:5173"}/verify/${encodeURIComponent(
    contractProductId
  )}`;

  const safeFileName = contractProductId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filePath = path.join(QR_DIR, `${safeFileName}.png`);

  await QRCode.toFile(filePath, verifyUrl, {
    width: 400,
    margin: 2,
  });

  return `/uploads/qrcodes/${safeFileName}.png`;
}

module.exports = { generateProductQrCode };
