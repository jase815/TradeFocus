const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const Trade = require("../models/trade");
const auth = require("../middleware/auth");

const client = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

function toNumber(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
}

function normalizeSymbol(symbol) {
  if (!symbol) return "";

  const clean = String(symbol).trim().toUpperCase();

  if (
    clean.includes("MNQ") ||
    clean.includes("MICRO NQ") ||
    clean.includes("MICRO NASDAQ")
  ) {
    return "MNQ";
  }

  if (clean.includes("NQ") || clean.includes("NASDAQ")) {
    return "NQ";
  }

  if (
    clean.includes("MES") ||
    clean.includes("MICRO ES") ||
    clean.includes("MICRO S&P")
  ) {
    return "MES";
  }

  if (clean.includes("ES") || clean.includes("S&P")) {
    return "ES";
  }

  if (clean.includes("MCL")) return "MCL";
  if (clean.includes("CL") || clean.includes("CRUDE")) return "CL";

  if (clean.includes("MGC")) return "MGC";
  if (clean.includes("GC") || clean.includes("GOLD")) return "GC";

  if (clean.includes("MYM")) return "MYM";
  if (clean.includes("YM") || clean.includes("DOW")) return "YM";

  if (clean.includes("M2K")) return "M2K";
  if (clean.includes("RTY") || clean.includes("RUSSELL")) return "RTY";

  if (clean.includes("BTC") || clean.includes("XBT")) return "BTC";
  if (clean.includes("ETH")) return "ETH";
  if (clean.includes("SOL")) return "SOL";

  if (clean.includes("AAPL")) return "AAPL";
  if (clean.includes("TSLA")) return "TSLA";
  if (clean.includes("SPY")) return "SPY";
  if (clean.includes("QQQ")) return "QQQ";

  return clean;
}

function normalizeDirection(direction) {
  if (!direction) return "long";

  const value = String(direction).trim().toLowerCase();

  if (["long", "buy", "bull", "call"].includes(value)) return "long";
  if (["short", "sell", "bear", "put"].includes(value)) return "short";

  return "long";
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

  return pointValues[symbol] || 1;
}

function calculateProfit(trade) {
  const manualPnl = toNumber(trade.manualPnl, null);
  if (manualPnl !== null) return manualPnl;

  const symbol = normalizeSymbol(trade.symbol);
  const direction = normalizeDirection(trade.direction);
  const entry = toNumber(trade.entry, null);
  const exit = toNumber(trade.exit, null);
  const contracts = toNumber(trade.contracts, 1);
  const pointValue =
    toNumber(trade.pointValue, null) ?? getDefaultPointValue(symbol);

  if (entry === null || exit === null) {
    return 0;
  }

  let points = 0;

  if (direction === "short") {
    points = entry - exit;
  } else {
    points = exit - entry;
  }

  return Number((points * contracts * pointValue).toFixed(2));
}

function calculateResult(profit) {
  if (profit > 0) return "win";
  if (profit < 0) return "loss";
  return "breakeven";
}

function calculateRR(trade) {
  const entry = toNumber(trade.entry, null);
  const stopLoss = toNumber(trade.stopLoss, null);
  const takeProfit = toNumber(trade.takeProfit, null);
  const direction = normalizeDirection(trade.direction);

  if (entry === null || stopLoss === null || takeProfit === null) {
    return null;
  }

  let risk = 0;
  let reward = 0;

  if (direction === "long") {
    risk = entry - stopLoss;
    reward = takeProfit - entry;
  } else {
    risk = stopLoss - entry;
    reward = entry - takeProfit;
  }

  if (risk <= 0) return null;

  return Number((reward / risk).toFixed(2));
}

function cleanNotes(notes) {
  if (!notes) return "";
  return String(notes).trim();
}

router.post("/review-trade/:id", auth, async (req, res) => {
  try {
    if (!process.env.OPENAI_KEY) {
      return res.status(500).json({
        message: "Missing OPENAI_KEY in backend .env",
      });
    }

    const trade = await Trade.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!trade) {
      return res.status(404).json({ message: "Trade not found" });
    }

    const normalizedSymbol = normalizeSymbol(trade.symbol);
    const normalizedDirection = normalizeDirection(trade.direction);
    const pointValue =
      toNumber(trade.pointValue, null) ?? getDefaultPointValue(normalizedSymbol);

    const profit = calculateProfit(trade);
    const result = calculateResult(profit);
    const rr =
      trade.rr !== null && trade.rr !== undefined
        ? trade.rr
        : calculateRR(trade);

    const payloadForAi = {
      symbol: normalizedSymbol,
      direction: normalizedDirection,
      entry: toNumber(trade.entry, null),
      exit: toNumber(trade.exit, null),
      contracts: toNumber(trade.contracts, 1),
      pointValue,
      manualPnl: toNumber(trade.manualPnl, null),
      profit,
      result,
      presetName: trade.presetName || "",
      notes: cleanNotes(trade.notes),
      stopLoss: toNumber(trade.stopLoss, null),
      takeProfit: toNumber(trade.takeProfit, null),
      rr,
      tradeDate: trade.tradeDate || null,
      tags: Array.isArray(trade.tags) ? trade.tags : [],
    };

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `
You are an experienced trading performance coach.

Write a short, practical coaching review for one trade.
Focus on:
1. what was done well
2. what should be improved
3. one concrete next-step action

Rules:
- Keep it concise and useful
- Use plain language
- Do not pretend to know chart details that are not provided
- If notes are sparse, say that gently and still give useful process advice
- Keep it under 140 words
          `.trim(),
        },
        {
          role: "user",
          content: JSON.stringify(payloadForAi),
        },
      ],
    });

    const review = completion?.choices?.[0]?.message?.content?.trim() || "";

    trade.symbol = normalizedSymbol;
    trade.direction = normalizedDirection;
    trade.pointValue = pointValue;
    trade.profit = profit;
    trade.result = result;
    trade.aiReview = review;

    if ((trade.rr === null || trade.rr === undefined) && rr !== null) {
      trade.rr = rr;
    }

    await trade.save();

    res.json({
      message: "AI review generated",
      aiReview: review,
      result,
      profit,
      rr: trade.rr ?? null,
    });
  } catch (error) {
    console.error("review trade error:", error?.message || error);

    res.status(500).json({
      message: "Could not review trade",
      error: error?.message || "Unknown server error",
    });
  }
});

module.exports = router;