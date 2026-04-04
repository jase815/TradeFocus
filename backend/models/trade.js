const mongoose = require("mongoose");

const tradeSchema = new mongoose.Schema({
  userId: String,
  symbol: String,
  notes: String,
  direction: String,
  contracts: Number,
  pointValue: Number,
  manualPnl: Number,
  tradeDate: String,
  presetId: String,
  presetName: String,
  result: String,
  aiReview: String,
  entry: Number,
  exit: Number,
  stopLoss: Number,
  takeProfit: Number,
  profit: Number,
  screenshot: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Trade", tradeSchema);