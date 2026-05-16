const { Resend } = require("resend");

const resend = new Resend(
  process.env.RESEND_API_KEY
);

const sendEmail = async ({
  to,
  subject,
  html,
  attachments,
}) => {
  try {
    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM,

      to,

      subject,

      html,

      attachments,
    });

    return response;
  } catch (error) {
    console.error(
      "Email sending failed:",
      error
    );

    throw error;
  }
};

module.exports = {
  sendEmail,
};