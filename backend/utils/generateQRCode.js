const QRCode = require("qrcode");

const generateQRCode = async (
  payload
) => {
  try {
    return await QRCode.toDataURL(
      JSON.stringify(payload)
    );
  } catch (error) {
    throw error;
  }
};

module.exports = generateQRCode;