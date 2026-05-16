const axios = require("axios");

const triggerN8nWorkflow = async (
  webhook,
  payload
) => {
  try {
    const response = await axios.post(
      `${process.env.N8N_WEBHOOK_URL}/${webhook}`,
      payload
    );

    return response.data;
  } catch (error) {
    console.error(
      "n8n workflow failed:",
      error.message
    );

    throw error;
  }
};

module.exports = {
  triggerN8nWorkflow,
};