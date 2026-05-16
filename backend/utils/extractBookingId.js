const extractBookingId = (text) => {
  if (!text) return null;

  const parts = text.split(" ");

  if (parts.length < 2) {
    return null;
  }

  return parts[1];
};

module.exports = extractBookingId;