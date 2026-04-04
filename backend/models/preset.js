const mongoose = require("mongoose");

const presetSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    symbol: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },

    direction: {
      type: String,
      enum: ["long", "short", ""],
      default: "",
    },

    contracts: {
      type: Number,
      default: 1,
    },

    pointValue: {
      type: Number,
      default: null,
    },

    manualPnl: {
      type: Number,
      default: null,
    },

    notes: {
      type: String,
      default: "",
    },

    tags: {
      type: [String],
      default: [],
    },

    // Helps future auto-assignment logic
    instrumentType: {
      type: String,
      enum: ["futures", "crypto", "forex", "stock", "unknown", ""],
      default: "",
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Preset", presetSchema);