const bookingConfirmationTemplate = ({
  guestName,
  bookingId,
  roomNumber,
  checkInDate,
  checkOutDate,
  checkInTime,
  telegramBotLink,
  qrCode,
  qrCid,
}) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Booking Confirmation</title>
  </head>

  <body style="margin:0; padding:0; background:#f3f4f6; font-family:Arial, sans-serif; color:#111827;">

    <div style="max-width:600px; margin:24px auto; background:#ffffff; padding:30px; border-radius:10px;">
      <h1 style="margin:0 0 12px; color:#222; font-size:28px;">
        Booking Confirmed ✅
      </h1>

      <p style="margin:0 0 16px; line-height:1.6;">
        Hello <strong>${guestName}</strong>, your booking has been successfully confirmed.
      </p>

      <hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;" />

      <h2 style="margin:0 0 12px; font-size:20px; color:#111827;">Booking Details</h2>
      <p style="margin:0 0 8px;"><strong>Booking ID:</strong> ${bookingId}</p>
      <p style="margin:0 0 8px;"><strong>Room Number:</strong> ${roomNumber}</p>
      <p style="margin:0 0 8px;"><strong>Check-In Date:</strong> ${checkInDate}</p>
      <p style="margin:0 0 8px;"><strong>Check-Out Date:</strong> ${checkOutDate}</p>
      <p style="margin:0 0 8px;"><strong>Check-In Time:</strong> ${checkInTime}</p>

      <hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;" />

      ${qrCid ? `
      <h2 style="margin:0 0 12px; font-size:20px; color:#111827;">Check-in QR Code</h2>
      <div style="text-align:center; margin:16px 0 20px;">
        <img src="cid:${qrCid}" alt="Check-in QR Code" width="240" height="240" style="display:block; margin:0 auto; width:240px; height:240px; border:0; background:#ffffff;" />
      </div>
      ` : ""}

      <h2 style="margin:0 0 12px; font-size:20px; color:#111827;">Telegram Assistant</h2>
      <p style="margin:0 0 12px; line-height:1.6;">Connect with our assistant bot for room assistance, housekeeping requests, food information, and parking support.</p>
      <a href="${telegramBotLink}" style="display:inline-block; padding:12px 20px; background:#0088cc; color:#ffffff; text-decoration:none; border-radius:6px;">
        Connect Telegram Bot
      </a>

      <p style="margin:24px 0 0; line-height:1.6;">
        We look forward to welcoming you.
      </p>

      <p style="margin:16px 0 0; color:#111827; font-weight:bold;">
        StayOps Hospitality Team
      </p>
      </div>
    </div>

  </body>
  </html>
  `;
};

module.exports = bookingConfirmationTemplate;