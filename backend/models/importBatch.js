const mongoose = require("mongoose");

const importBatchSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  source: {
    type: String,
    required: true,
  },
  filename: {
    type: String,
    default: "",
  },
  totalRows: {
    type: Number,
    default: 0,
  },
  validTrades: {
    type: Number,
    default: 0,
  },
  importedCount: {
    type: Number,
    default: 0,
  },
  duplicateCount: {
    type: Number,
    default: 0,
  },
  skippedCount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("ImportBatch", importBatchSchema);
