const mongoose = require("mongoose");

const userSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    displayName: { type: String, default: "" },
    broker: { type: String, default: "" },
    platform: { type: String, default: "" },
    accountType: { type: String, default: "Personal" },
    startingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    defaultSymbol: { type: String, default: "" },
    defaultContracts: { type: Number, default: 1 },
    defaultRiskPerTrade: { type: Number, default: 0 },
    dailyLossLimit: { type: Number, default: 0 },
    weeklyLossLimit: { type: Number, default: 0 },
    timezone: { type: String, default: "America/Chicago" },
    currency: { type: String, default: "USD" },
    notesTemplate: { type: String, default: "" },
    darkMode: { type: Boolean, default: false },
    autoOpenJournalAfterSave: { type: Boolean, default: true },
    showWeekendsInCalendar: { type: Boolean, default: true },
    enableTradeReviewReminders: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserSettings", userSettingsSchema);
