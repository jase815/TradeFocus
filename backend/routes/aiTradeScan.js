const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const auth = require("../middleware/auth");
const Preset = require("../models/preset");

const uploadsDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  dest: uploadsDir,
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

const client = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

function toNumber(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;

  const cleaned = String(value)
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .trim();

  const num = Number(cleaned);
  return Number.isNaN(num) ? fallback : num;
}

function cleanText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normalizeDirection(direction) {
  if (!direction) return "";

  const value = String(direction).trim().toLowerCase();

  if (["long", "buy", "bull", "call"].includes(value)) return "long";
  if (["short", "sell", "bear", "put"].includes(value)) return "short";

  return "";
}

function normalizeArrowColor(color) {
  if (!color) return "";

  const value = String(color).trim().toLowerCase();

  if (value.includes("blue")) return "blue";
  if (value.includes("red")) return "red";

  return "";
}

function resolveDirectionFromArrowColors(firstArrowColor, secondArrowColor) {
  const first = normalizeArrowColor(firstArrowColor);
  const second = normalizeArrowColor(secondArrowColor);

  if (first === "blue" && second === "red") return "long";
  if (first === "red" && second === "blue") return "short";

  return "";
}

function resolveDirectionFromTradeSigns(entryLabel, exitLabel, primaryDirection = "") {
  const entryStr = String(entryLabel || "").trim().toLowerCase();
  const exitStr = String(exitLabel || "").trim().toLowerCase();

  const entryIsSell = entryStr.includes("-") || entryStr.includes("sell");
  const entryIsBuy = entryStr.includes("+") || entryStr.includes("buy");

  const exitIsSell = exitStr.includes("-") || exitStr.includes("sell");
  const exitIsBuy = exitStr.includes("+") || exitStr.includes("buy");

  if (entryIsSell && exitIsBuy) return "short";
  if (entryIsBuy && exitIsSell) return "long";

  return normalizeDirection(primaryDirection);
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

  if (clean.includes("NQ") || clean.includes("NASDAQ")) return "NQ";

  if (
    clean.includes("MES") ||
    clean.includes("MICRO ES") ||
    clean.includes("MICRO S&P")
  ) {
    return "MES";
  }

  if (clean.includes("ES") || clean.includes("S&P")) return "ES";

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

function getInstrumentType(symbol) {
  const futuresSymbols = [
    "NQ",
    "MNQ",
    "ES",
    "MES",
    "CL",
    "MCL",
    "GC",
    "MGC",
    "YM",
    "MYM",
    "RTY",
    "M2K",
  ];

  const cryptoSymbols = ["BTC", "ETH", "SOL"];
  const stockSymbols = ["AAPL", "TSLA", "SPY", "QQQ"];

  if (futuresSymbols.includes(symbol)) return "futures";
  if (cryptoSymbols.includes(symbol)) return "crypto";
  if (stockSymbols.includes(symbol)) return "stock";

  return "unknown";
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

  return pointValues[symbol] || null;
}

function calculateProfit({
  direction,
  entry,
  exit,
  contracts,
  pointValue,
  manualPnl,
  symbol,
}) {
  if (manualPnl !== null && manualPnl !== undefined && manualPnl !== "") {
    return Number(manualPnl);
  }

  if (
    !direction ||
    entry === null ||
    entry === undefined ||
    exit === null ||
    exit === undefined
  ) {
    return null;
  }

  const qty = contracts || 1;
  const resolvedPointValue =
    getDefaultPointValue(normalizeSymbol(symbol)) ||
    toNumber(pointValue, null) ||
    1;

  let points = 0;

  if (direction === "long") {
    points = exit - entry;
  } else if (direction === "short") {
    points = entry - exit;
  } else {
    return null;
  }

  return Number((points * qty * resolvedPointValue).toFixed(2));
}

function calculateResult(profit) {
  if (profit === null || profit === undefined) return "";
  if (profit > 0) return "win";
  if (profit < 0) return "loss";
  return "breakeven";
}

function clampConfidence(value) {
  const num = toNumber(value, null);
  if (num === null) return null;
  if (num < 0) return 0;
  if (num > 1) return 1;
  return Number(num.toFixed(2));
}

function sanitizeTradeLevels(parsed, manualPnl) {
  const entry = toNumber(parsed.entry, null);
  const exit = toNumber(parsed.exit, null);

  const hasReadableEntry = entry !== null;
  const hasReadableExit = exit !== null;

  if (hasReadableEntry && hasReadableExit) {
    return { entry, exit };
  }

  if (hasReadableEntry || hasReadableExit) {
    return { entry: null, exit: null };
  }

  if (manualPnl !== null) {
    return { entry: null, exit: null };
  }

  return { entry: null, exit: null };
}

function normalizeManualPnl(value, sourceLabel = "") {
  const num = toNumber(value, null);
  if (num === null) return null;

  const source = String(sourceLabel || "").trim().toLowerCase();

  // ONLY accept true trade-level PnL labels
  const validTradePnlSources = [
    "p/l",
    "pnl",
    "profit and loss",
    "profit/loss",
    "trade pnl",
    "trade p/l",
  ];

  const blockedSessionSources = [
    "rp&l",
    "rpnl",
    "realized pnl",
    "realized p/l",
    "realized profit and loss",
    "session pnl",
    "session p/l",
    "account pnl",
    "account p/l",
  ];

  const isBlocked = blockedSessionSources.some((label) => source.includes(label));
  if (isBlocked) {
    return null;
  }

  const hasValidSource = validTradePnlSources.some((label) => source.includes(label));
  if (!hasValidSource) {
    return null;
  }

  return num;
}

function discardWeakManualPnl({
  manualPnl,
  symbol,
  entry,
  exit,
  contracts,
}) {
  const pnlNum = toNumber(manualPnl, null);
  if (pnlNum === null) return null;

  const normalizedSymbol = normalizeSymbol(symbol);
  const pointValue = getDefaultPointValue(normalizedSymbol);
  const entryNum = toNumber(entry, null);
  const exitNum = toNumber(exit, null);
  const qty = toNumber(contracts, 1) || 1;

  if (pointValue !== null && entryNum !== null && exitNum !== null) {
    const rawMove = Math.abs(exitNum - entryNum);
    const expectedDollarMagnitude = rawMove * pointValue * qty;

    if (
      expectedDollarMagnitude >= 20 &&
      Math.abs(pnlNum) < expectedDollarMagnitude * 0.5
    ) {
      return null;
    }
  }

  return pnlNum;
}

function mergeLevelPasses(primary, markerPass) {
  const primaryEntry = toNumber(primary.entry, null);
  const primaryExit = toNumber(primary.exit, null);
  const primaryConfidence = clampConfidence(primary.confidence) || 0;

  const markerEntry = toNumber(markerPass.entry, null);
  const markerExit = toNumber(markerPass.exit, null);
  const markerConfidence = clampConfidence(markerPass.confidence) || 0;

  const markerHasCompleteLevels = markerEntry !== null && markerExit !== null;
  const primaryHasCompleteLevels = primaryEntry !== null && primaryExit !== null;

  if (markerHasCompleteLevels && !primaryHasCompleteLevels) {
    return {
      entry: markerEntry,
      exit: markerExit,
      confidence: Math.max(primaryConfidence, markerConfidence),
    };
  }

  if (
    markerHasCompleteLevels &&
    primaryHasCompleteLevels &&
    markerConfidence >= primaryConfidence
  ) {
    return {
      entry: markerEntry,
      exit: markerExit,
      confidence: Math.max(primaryConfidence, markerConfidence),
    };
  }

  return {
    entry: primaryEntry,
    exit: primaryExit,
    confidence: Math.max(primaryConfidence, markerConfidence),
  };
}

function resolveFinalDirection({
  markerFirstArrowColor,
  markerSecondArrowColor,
  primaryDirection,
  rawEntryLabel,
  rawExitLabel,
}) {
  const fromSigns = resolveDirectionFromTradeSigns(
    rawEntryLabel,
    rawExitLabel,
    primaryDirection
  );
  if (fromSigns) return fromSigns;

  const fromColors = resolveDirectionFromArrowColors(
    markerFirstArrowColor,
    markerSecondArrowColor
  );
  if (fromColors) return fromColors;

  const primary = normalizeDirection(primaryDirection);
  return primary || "";
}

async function findMatchingPreset(userId, presetName, symbol, direction) {
  const presets = await Preset.find({ userId });

  if (!presets.length) {
    return { presetId: null, presetName: presetName || "" };
  }

  if (presetName && String(presetName).trim()) {
    const cleanedPresetName = String(presetName).trim().toLowerCase();

    const exactMatch = presets.find((preset) => {
      const name = String(preset.name || "").trim().toLowerCase();
      return name === cleanedPresetName;
    });

    if (exactMatch) {
      return {
        presetId: String(exactMatch._id),
        presetName: exactMatch.name || "",
      };
    }

    const partialMatch = presets.find((preset) => {
      const name = String(preset.name || "").trim().toLowerCase();
      return (
        name.includes(cleanedPresetName) || cleanedPresetName.includes(name)
      );
    });

    if (partialMatch) {
      return {
        presetId: String(partialMatch._id),
        presetName: partialMatch.name || "",
      };
    }
  }

  const ruleMatch = presets.find((preset) => {
    const presetSymbol = String(preset.symbol || "").trim().toUpperCase();
    const presetDirection = String(preset.direction || "").trim().toLowerCase();

    const symbolMatches = !presetSymbol || presetSymbol === symbol;
    const directionMatches = !presetDirection || presetDirection === direction;

    return symbolMatches && directionMatches;
  });

  if (ruleMatch) {
    return {
      presetId: String(ruleMatch._id),
      presetName: ruleMatch.name || "",
    };
  }

  return {
    presetId: null,
    presetName: presetName || "",
  };
}

async function runPrimaryExtraction(mimeType, base64Image) {
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: `
You analyze trading screenshots and return only valid JSON.

Return exactly these keys:
symbol
direction
entry
exit
rawEntryLabel
rawExitLabel
manualPnl
manualPnlSource
contracts
pointValue
notes
presetName
stopLoss
takeProfit
confidence

Rules:
- PRIORITIZE clearly visible numbers.
- If entry and exit labels are clearly printed next to trade arrows/markers, use them.
- Also return rawEntryLabel and rawExitLabel as the full visible trade labels when possible, for example "- 2 @ 24,450.25" or "+ 2 @ 24,429.00".
- If entry or exit is not clearly readable, set both entry and exit to null.
- If you provide manualPnl, also provide manualPnlSource using the exact visible label it came from.
- Only use manualPnl when it comes from a true TRADE P/L field such as P/L, PNL, Profit and Loss, Profit/Loss, Trade PnL, or Trade P/L.
- Do NOT use RP&L, RPNL, Realized PnL, session PnL, account PnL, chart header changes, candle changes, percentages, or current price movement as manualPnl.
- If there is no true trade-level P/L label next to the number, set manualPnl to null and manualPnlSource to "".
- A visible PnL does NOT mean you should discard readable entry/exit labels. Keep both when both are clear.
- Do NOT guess entry/exit from arrows alone unless the actual numeric labels are readable.
- symbol should be the most likely instrument if clearly visible.
- direction must be "long", "short", or "".
- contracts should only be filled if clearly visible.
- For futures use common point values when the symbol is clear:
  NQ=20, MNQ=2, ES=50, MES=5, CL=1000, MCL=100, GC=100, MGC=10, YM=5, MYM=0.5, RTY=50, M2K=5.
- For crypto/stocks, pointValue can be null if not clearly shown.
- notes should be short and factual based only on what is clearly visible.
- Use null for unknown numeric fields.
- Use "" for unknown text fields.
- confidence must be a number from 0 to 1.
- Do not include markdown, explanations, or extra keys.
        `.trim(),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Analyze this screenshot. Use entry and exit only if the numeric labels are clearly readable. Also return the full visible raw trade labels if present, such as '- 2 @ 24,450.25' and '+ 2 @ 24,429.00'. Only return manualPnl if it is clearly a trade-level P/L field, not account/session realized P&L.",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
  });

  const rawText = completion?.choices?.[0]?.message?.content || "{}";

  try {
    return JSON.parse(rawText);
  } catch {
    return {
      symbol: "",
      direction: "",
      entry: null,
      exit: null,
      rawEntryLabel: "",
      rawExitLabel: "",
      manualPnl: null,
      manualPnlSource: "",
      contracts: null,
      pointValue: null,
      notes: "",
      presetName: "",
      stopLoss: null,
      takeProfit: null,
      confidence: null,
    };
  }
}

async function runMarkerOnlyExtraction(mimeType, base64Image) {
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `
You are doing a marker-only extraction for a trading screenshot.

Return exactly this JSON:
entry
exit
firstArrowColor
secondArrowColor
confidence

Rules:
- Use ONLY the two prices attached directly to the two trade arrow markers.
- ENTRY is the first arrow marker in time from left to right.
- EXIT is the second arrow marker in time from left to right.
- Also identify the color of the first arrow marker and the color of the second arrow marker.
- Allowed arrow colors are "blue", "red", or "".
- Ignore all prices on the right-side price scale.
- Ignore the current price label.
- Ignore bid/ask boxes at the top or sides.
- Ignore OHLC values in the chart header.
- Ignore stop-loss / take-profit rectangle edges and price labels not attached to arrows.
- Ignore any horizontal line labels unless they are directly attached to an arrow marker.
- The valid prices are the small numeric labels directly next to the arrow markers, often shown near text like "1 @" or "2 @".
- If you cannot confidently read two arrow-marker prices, return entry=null and exit=null.
- If you cannot confidently identify arrow colors, return "" for that arrow color.
- confidence must be from 0 to 1.
- Return JSON only.
        `.trim(),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Find the two arrow-marker prices only. The first arrow in time is entry and the second arrow in time is exit. Also tell me the first arrow color and second arrow color. Do not return long or short yourself.",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
  });

  const rawText = completion?.choices?.[0]?.message?.content || "{}";

  try {
    return JSON.parse(rawText);
  } catch {
    return {
      entry: null,
      exit: null,
      firstArrowColor: "",
      secondArrowColor: "",
      confidence: null,
    };
  }
}

router.post(
  "/scan-trade-image",
  auth,
  upload.single("image"),
  async (req, res) => {
    let filePath = null;

    try {
      if (!process.env.OPENAI_KEY) {
        return res
          .status(500)
          .json({ message: "Missing OPENAI_KEY in backend .env" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Image is required" });
      }

      filePath = req.file.path;

      const imageBuffer = fs.readFileSync(filePath);
      const base64Image = imageBuffer.toString("base64");
      const mimeType = req.file.mimetype || "image/png";

      const primaryParsed = await runPrimaryExtraction(mimeType, base64Image);
      const markerPass = await runMarkerOnlyExtraction(mimeType, base64Image);

      const mergedLevels = mergeLevelPasses(primaryParsed, markerPass);

      const symbol = normalizeSymbol(primaryParsed.symbol);

      let manualPnl = normalizeManualPnl(
        primaryParsed.manualPnl,
        primaryParsed.manualPnlSource
      );

      const cleanedLevels = sanitizeTradeLevels(
        {
          entry: mergedLevels.entry,
          exit: mergedLevels.exit,
        },
        manualPnl
      );

      const entry = cleanedLevels.entry;
      const exit = cleanedLevels.exit;

      const direction = resolveFinalDirection({
        markerFirstArrowColor: markerPass.firstArrowColor,
        markerSecondArrowColor: markerPass.secondArrowColor,
        primaryDirection: primaryParsed.direction,
        rawEntryLabel: primaryParsed.rawEntryLabel,
        rawExitLabel: primaryParsed.rawExitLabel,
      });

      const contracts = toNumber(primaryParsed.contracts, 1);
      const stopLoss = toNumber(primaryParsed.stopLoss, null);
      const takeProfit = toNumber(primaryParsed.takeProfit, null);

      const forcedPointValue = getDefaultPointValue(symbol);
      const aiPointValue = toNumber(primaryParsed.pointValue, null);
      const pointValue =
        forcedPointValue !== null
          ? forcedPointValue
          : aiPointValue !== null && aiPointValue > 0
          ? aiPointValue
          : 1;

      manualPnl = discardWeakManualPnl({
        manualPnl,
        symbol,
        entry,
        exit,
        contracts,
      });

      const instrumentType = symbol ? getInstrumentType(symbol) : "unknown";

      const profit = calculateProfit({
        direction,
        entry,
        exit,
        contracts,
        pointValue,
        manualPnl,
        symbol,
      });

      const result = calculateResult(profit);

      const matchedPreset = await findMatchingPreset(
        req.user.id,
        primaryParsed.presetName,
        symbol,
        direction
      );

      const responsePayload = {
        symbol,
        instrumentType,
        direction,
        entry,
        exit,
        contracts,
        pointValue: forcedPointValue !== null ? forcedPointValue : pointValue,
        manualPnl,
        stopLoss,
        takeProfit,
        notes: cleanText(primaryParsed.notes),
        presetId: matchedPreset.presetId,
        presetName: matchedPreset.presetName,
        result,
        profit,
        confidence: clampConfidence(
          markerPass.confidence ?? mergedLevels.confidence ?? primaryParsed.confidence
        ),
        source: "ai-scan",
      };

      console.log("PRIMARY PARSED:", primaryParsed);
      console.log("MARKER PASS:", markerPass);
      console.log("AI TRADE SCAN RESPONSE:", responsePayload);

      res.json(responsePayload);
    } catch (error) {
      console.error("scan trade image error:");
      console.error(error?.response?.data || error?.message || error);

      res.status(500).json({
        message: "Could not analyze screenshot",
        error: error?.message || "Unknown server error",
      });
    } finally {
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupError) {
          console.error("file cleanup error:", cleanupError.message);
        }
      }
    }
  }
);

module.exports = router;
