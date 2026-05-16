const Counter = require("../models/Counter");

const generateId = async (name, prefix) => {
  const counter = await Counter.findOneAndUpdate(
    { name },

    { $inc: { sequence: 1 } },

    {
      returnDocument: "after",
      upsert: true,
    }
  );

  return `${prefix}-${counter.sequence}`;
};

module.exports = generateId;