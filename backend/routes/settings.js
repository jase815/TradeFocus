const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const UserSettings = require("../models/userSettings");

function toNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
}

function toBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

router.get("/", auth, async (req, res) => {
  try {
    console.log("GET /api/settings hit for user:", req.user.id);

    let settings = await UserSettings.findOne({ userId: req.user.id });

    if (!settings) {
      settings = await UserSettings.create({
        userId: req.user.id,
      });
    }

    return res.json(settings);
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return res.status(500).json({ message: error.message });
  }
});

router.put("/", auth, async (req, res) => {
  try {
    console.log("PUT /api/settings hit for user:", req.user.id);

    const payload = {
      displayName: req.body.displayName || "",
      broker: req.body.broker || "",
      platform: req.body.platform || "",
      accountType: req.body.accountType || "Personal",
      startingBalance: toNumber(req.body.startingBalance, 0),
      currentBalance: toNumber(req.body.currentBalance, 0),
      defaultSymbol: req.body.defaultSymbol || "",
      defaultContracts: toNumber(req.body.defaultContracts, 1),
      defaultRiskPerTrade: toNumber(req.body.defaultRiskPerTrade, 0),
      dailyLossLimit: toNumber(req.body.dailyLossLimit, 0),
      weeklyLossLimit: toNumber(req.body.weeklyLossLimit, 0),
      timezone: req.body.timezone || "America/Chicago",
      currency: req.body.currency || "USD",
      notesTemplate: req.body.notesTemplate || "",
      darkMode: toBoolean(req.body.darkMode, false),
      autoOpenJournalAfterSave: toBoolean(req.body.autoOpenJournalAfterSave, true),
      showWeekendsInCalendar: toBoolean(req.body.showWeekendsInCalendar, true),
      enableTradeReviewReminders: toBoolean(req.body.enableTradeReviewReminders, false),
    };

    const settings = await UserSettings.findOneAndUpdate(
      { userId: req.user.id },
      { $set: payload },
      { new: true, upsert: true }
    );

    return res.json({
      message: "Settings saved",
      settings,
    });
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
