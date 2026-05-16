const axios = require("axios");

const sendTelegramMessage = async ({
  botToken,
  chatId,
  text,
  reply_markup,
  parse_mode,
  disable_web_page_preview,
  ...extra
}) => {
  try {
    const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error("Telegram bot token is required");
    }

    const body = {
      chat_id: chatId,
      text,
      ...extra,
    };

    if (typeof reply_markup !== "undefined") {
      body.reply_markup = reply_markup;
    }

    if (typeof parse_mode !== "undefined") {
      body.parse_mode = parse_mode;
    }

    if (typeof disable_web_page_preview !== "undefined") {
      body.disable_web_page_preview = disable_web_page_preview;
    }

    const response = await axios.post(
      `https://api.telegram.org/bot${token}/sendMessage`,
      body
    );

    return response.data;
  } catch (error) {
    console.error("Telegram send error:", error.response?.data || error.message);
    throw error;
  }
};

const answerTelegramCallback = async ({ botToken, callbackQueryId, text = "", show_alert = false }) => {
  try {
    const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error("Telegram bot token is required");
    }

    const response = await axios.post(
      `https://api.telegram.org/bot${token}/answerCallbackQuery`,
      {
        callback_query_id: callbackQueryId,
        text,
        show_alert,
      }
    );

    return response.data;
  } catch (error) {
    console.error("Telegram callback error:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  sendTelegramMessage,
  answerTelegramCallback,
};