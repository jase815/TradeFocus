const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Trade = require("../models/trade");
const auth = require("../middleware/auth");

const uploadsDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "");
    const safeExt = ext || ".png";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed"));
    }
    cb(null, true);
  },
});

function toNumber(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
}

function normalizeDirection(direction) {
  if (!direction) return "";
  const value = String(direction).trim().toLowerCase();

  if (["long", "buy", "bull"].includes(value)) return "long";
  if (["short", "sell", "bear"].includes(value)) return "short";

  return value;
}

function getDefaultPointValue(symbol) {
  const pointValues = {
    NQ: 20,
    MNQ: 2,
    ES: 50,
    MES: 5,
    CL: 1000,
    MCL: 100,
    GC: 100,
    MGC: 10,
    YM: 5,
    MYM: 0.5,
    RTY: 50,
    M2K: 5,
    BTC: 1,
    ETH: 1,
    SOL: 1,
    AAPL: 1,
    TSLA: 1,
    SPY: 1,
    QQQ: 1,
  };

  return pointValues[String(symbol || "").toUpperCase()] || 1;
}

function calculateProfit(trade) {
  const manual = toNumber(trade.manualPnl, null);
  if (manual !== null) return manual;

  const entry = toNumber(trade.entry, null);
  const exit = toNumber(trade.exit, null);
  const contracts = toNumber(trade.contracts, 1) || 1;
  const pointValue =
    toNumber(trade.pointValue, null) ||
    getDefaultPointValue(trade.symbol);
  const direction = normalizeDirection(trade.direction);

  if (entry === null || exit === null || !direction) return null;

  const points = direction === "short" ? entry - exit : exit - entry;
  return Number((points * contracts * pointValue).toFixed(2));
}

function calculateResult(profit) {
  if (profit === null || profit === undefined) return "";
  if (profit > 0) return "win";
  if (profit < 0) return "loss";
  return "breakeven";
}

// GET all trades latest to oldest
router.get("/", auth, async (req, res) => {
  try {
    const trades = await Trade.find({ userId: req.user.id }).sort({
      tradeDate: -1,
      createdAt: -1,
    });
    res.json(trades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ADD trade with optional screenshot
router.post("/", auth, upload.single("screenshot"), async (req, res) => {
  try {
    const profit = calculateProfit(req.body);
    const result = calculateResult(profit);

    const trade = new Trade({
      userId: req.user.id,
      symbol: req.body.symbol || "",
      notes: req.body.notes || "",
      direction: normalizeDirection(req.body.direction || ""),
      contracts: toNumber(req.body.contracts, 1),
      pointValue: toNumber(req.body.pointValue, null),
      manualPnl: toNumber(req.body.manualPnl, null),
      tradeDate: req.body.tradeDate || "",
      presetId: req.body.presetId || "",
      presetName: req.body.presetName || "",
      result,
      aiReview: req.body.aiReview || "",
      entry: toNumber(req.body.entry, null),
      exit: toNumber(req.body.exit, null),
      stopLoss: toNumber(req.body.stopLoss, null),
      takeProfit: toNumber(req.body.takeProfit, null),
      profit,
      screenshot: req.file ? `/uploads/${req.file.filename}` : "",
    });

    const savedTrade = await trade.save();
    res.status(201).json(savedTrade);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE trade and screenshot file
router.delete("/:id", auth, async (req, res) => {
  try {
    const deletedTrade = await Trade.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!deletedTrade) {
      return res.status(404).json({ message: "Trade not found" });
    }

    if (deletedTrade.screenshot) {
      const screenshotPath = path.join(__dirname, "..", deletedTrade.screenshot);
      if (fs.existsSync(screenshotPath)) {
        try {
          fs.unlinkSync(screenshotPath);
        } catch (err) {
          console.error("screenshot delete error:", err.message);
        }
      }
    }

    res.json({ message: "Trade deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE trade with optional screenshot replacement
router.put("/:id", auth, upload.single("screenshot"), async (req, res) => {
  try {
    const existingTrade = await Trade.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!existingTrade) {
      return res.status(404).json({ message: "Trade not found" });
    }

    const nextData = {
      symbol: req.body.symbol || "",
      notes: req.body.notes || "",
      direction: normalizeDirection(req.body.direction || ""),
      contracts: toNumber(req.body.contracts, 1),
      pointValue: toNumber(req.body.pointValue, null),
      manualPnl: toNumber(req.body.manualPnl, null),
      tradeDate: req.body.tradeDate || "",
      presetId: req.body.presetId || "",
      presetName: req.body.presetName || "",
      aiReview: req.body.aiReview || existingTrade.aiReview || "",
      entry: toNumber(req.body.entry, null),
      exit: toNumber(req.body.exit, null),
      stopLoss: toNumber(req.body.stopLoss, null),
      takeProfit: toNumber(req.body.takeProfit, null),
    };

    const profit = calculateProfit(nextData);
    const result = calculateResult(profit);

    nextData.profit = profit;
    nextData.result = result;

    if (req.file) {
      if (existingTrade.screenshot) {
        const oldScreenshotPath = path.join(__dirname, "..", existingTrade.screenshot);
        if (fs.existsSync(oldScreenshotPath)) {
          try {
            fs.unlinkSync(oldScreenshotPath);
          } catch (err) {
            console.error("old screenshot delete error:", err.message);
          }
        }
      }
      nextData.screenshot = `/uploads/${req.file.filename}`;
    } else if (req.body.keepScreenshot === "false") {
      if (existingTrade.screenshot) {
        const oldScreenshotPath = path.join(__dirname, "..", existingTrade.screenshot);
        if (fs.existsSync(oldScreenshotPath)) {
          try {
            fs.unlinkSync(oldScreenshotPath);
          } catch (err) {
            console.error("remove screenshot error:", err.message);
          }
        }
      }
      nextData.screenshot = "";
    }

    const updatedTrade = await Trade.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      nextData,
      { new: true }
    );

    res.json(updatedTrade);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;