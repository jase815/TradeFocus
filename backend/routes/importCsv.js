const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const auth = require("../middleware/auth");
const Trade = require("../models/trade");
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
});

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

  if (clean.includes("NQ") || clean.includes("/NQ") || clean.includes("NASDAQ")) {
    return "NQ";
  }

  if (
    clean.includes("MES") ||
    clean.includes("MICRO ES") ||
    clean.includes("MICRO S&P")
  ) {
    return "MES";
  }

  if (clean.includes("ES") || clean.includes("/ES") || clean.includes("S&P")) {
    return "ES";
  }

  if (clean.includes("MCL")) return "MCL";
  if (clean.includes("CL") || clean.includes("/CL") || clean.includes("CRUDE")) {
    return "CL";
  }

  if (clean.includes("MGC")) return "MGC";
  if (clean.includes("GC") || clean.includes("/GC") || clean.includes("GOLD")) {
    return "GC";
  }

  if (clean.includes("MYM")) return "MYM";
  if (clean.includes("YM") || clean.includes("/YM") || clean.includes("DOW")) {
    return "YM";
  }

  if (clean.includes("M2K")) return "M2K";
  if (clean.includes("RTY") || clean.includes("/RTY") || clean.includes("RUSSELL")) {
    return "RTY";
  }

  if (clean.includes("BTC") || clean.includes("XBT")) return "BTC";
  if (clean.includes("ETH")) return "ETH";
  if (clean.includes("SOL")) return "SOL";

  return clean;
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

function normalizeDirection(direction) {
  if (!direction) return "";

  const value = String(direction).trim().toLowerCase();

  if (
    value.includes("long") ||
    value === "buy" ||
    value === "b" ||
    value.includes("bull")
  ) {
    return "long";
  }

  if (
    value.includes("short") ||
    value === "sell" ||
    value === "s" ||
    value.includes("bear")
  ) {
    return "short";
  }

  return "";
}

function toNumber(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;

  const cleaned = String(value)
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .replace(/\(/g, "-")
    .replace(/\)/g, "")
    .trim();

  const num = Number(cleaned);
  return Number.isNaN(num) ? fallback : num;
}

function calculateResult(profit) {
  if (profit === null || profit === undefined) return "";
  if (profit > 0) return "win";
  if (profit < 0) return "loss";
  return "breakeven";
}

function calculateProfit({
  direction,
  entry,
  exit,
  contracts,
  pointValue,
  manualPnl,
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
  const pv = pointValue || 1;

  let points = 0;

  if (direction === "long") {
    points = exit - entry;
  } else if (direction === "short") {
    points = entry - exit;
  } else {
    return null;
  }

  return Number((points * qty * pv).toFixed(2));
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) || "";
  const candidates = [",", ";", "\t", "|"];

  let best = ",";
  let bestCount = -1;

  for (const delimiter of candidates) {
    const count = firstLine.split(delimiter).length;
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }

  return best;
}

function parseCsvLine(line, delimiter) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseCsvText(text) {
  const delimiter = detectDelimiter(text);
  const lines = text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");

  if (!lines.length) {
    return { headers: [], rows: [], delimiter };
  }

  const headers = parseCsvLine(lines[0], delimiter);
  const rows = lines.slice(1).map((line) => parseCsvLine(line, delimiter));

  return { headers, rows, delimiter };
}

function normalizeHeader(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9/@&]/g, "");
}

function buildHeaderMap(headers) {
  const map = {};

  headers.forEach((header, index) => {
    map[normalizeHeader(header)] = index;
  });

  return map;
}

function pickIndex(headerMap, candidates) {
  for (const candidate of candidates) {
    const normalized = normalizeHeader(candidate);
    if (headerMap[normalized] !== undefined) {
      return headerMap[normalized];
    }
  }

  return -1;
}

function getCell(row, index) {
  if (index < 0) return "";
  return row[index] ?? "";
}

function detectPlatform(headers) {
  const normalized = headers.map(normalizeHeader);

  const has = (...candidates) =>
    candidates.some((candidate) => normalized.includes(normalizeHeader(candidate)));

  if (
    has("market position", "profit currency", "entry price", "exit price")
  ) {
    return "NinjaTrader";
  }

  if (
    has("buy/sell", "created at", "avg price", "net pnl", "realized pnl")
  ) {
    return "Tradovate";
  }

  if (
    has("rp&l", "apex", "symbol", "qty", "buy/sell")
  ) {
    return "Apex";
  }

  return "Generic CSV";
}

function inferDirectionFromEntryExitAndPnl(entry, exit, pnl) {
  if (
    entry === null ||
    entry === undefined ||
    exit === null ||
    exit === undefined ||
    pnl === null ||
    pnl === undefined
  ) {
    return "";
  }

  if (exit > entry && pnl > 0) return "long";
  if (exit < entry && pnl > 0) return "short";
  if (exit < entry && pnl < 0) return "long";
  if (exit > entry && pnl < 0) return "short";

  return "";
}

function parseDateValue(value) {
  if (!value) return "";

  const text = String(value).trim();
  const parsed = new Date(text);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  const usMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (usMatch) {
    const month = usMatch[1].padStart(2, "0");
    const day = usMatch[2].padStart(2, "0");
    const year = usMatch[3].length === 2 ? `20${usMatch[3]}` : usMatch[3];
    return `${year}-${month}-${day}`;
  }

  return "";
}

async function matchPreset(userId, symbol, direction) {
  const presets = await Preset.find({ userId });

  const match = presets.find((preset) => {
    const presetSymbol = normalizeSymbol(preset.symbol || "");
    const presetDirection = normalizeDirection(preset.direction || "");

    const symbolMatches = !presetSymbol || presetSymbol === symbol;
    const directionMatches = !presetDirection || presetDirection === direction;

    return symbolMatches && directionMatches;
  });

  if (!match) {
    return { presetId: "", presetName: "" };
  }

  return {
    presetId: String(match._id),
    presetName: match.name || "",
  };
}

function buildColumnIndexes(headerMap) {
  return {
    symbol: pickIndex(headerMap, [
      "symbol",
      "instrument",
      "contract",
      "ticker",
      "market",
      "product",
    ]),
    direction: pickIndex(headerMap, [
      "direction",
      "market position",
      "marketposition",
      "position",
      "buy/sell",
      "buysell",
      "side",
      "action",
    ]),
    qty: pickIndex(headerMap, [
      "qty",
      "quantity",
      "contracts",
      "size",
      "filled",
      "filled qty",
    ]),
    entry: pickIndex(headerMap, [
      "entry price",
      "entryprice",
      "entry",
      "avg entry price",
      "average entry price",
      "buy price",
    ]),
    exit: pickIndex(headerMap, [
      "exit price",
      "exitprice",
      "exit",
      "avg exit price",
      "average exit price",
      "sell price",
    ]),
    pnl: pickIndex(headerMap, [
      "p/l",
      "pnl",
      "profit/loss",
      "profit and loss",
      "profit currency",
      "net pnl",
      "realized pnl",
      "profit",
    ]),
    date: pickIndex(headerMap, [
      "trade date",
      "date",
      "time",
      "timestamp",
      "created at",
      "createdat",
      "close time",
      "close date",
      "entry time",
      "exit time",
    ]),
    entryTime: pickIndex(headerMap, [
      "entry time",
      "entrytime",
      "open time",
      "opentime",
    ]),
    exitTime: pickIndex(headerMap, [
      "exit time",
      "exittime",
      "close time",
      "closetime",
      "closed at",
    ]),
    notes: pickIndex(headerMap, [
      "notes",
      "comment",
      "comments",
      "strategy",
      "setup",
    ]),
  };
}

function transformRow(row, indexes) {
  const rawSymbol = getCell(row, indexes.symbol);
  const rawDirection = getCell(row, indexes.direction);
  const rawQty = getCell(row, indexes.qty);
  const rawEntry = getCell(row, indexes.entry);
  const rawExit = getCell(row, indexes.exit);
  const rawPnl = getCell(row, indexes.pnl);
  const rawDate =
    getCell(row, indexes.exitTime) ||
    getCell(row, indexes.date) ||
    getCell(row, indexes.entryTime);

  const symbol = normalizeSymbol(rawSymbol);
  const contracts = toNumber(rawQty, 1) || 1;
  const entry = toNumber(rawEntry, null);
  const exit = toNumber(rawExit, null);
  const manualPnl = toNumber(rawPnl, null);
  const pointValue = getDefaultPointValue(symbol);
  const tradeDate = parseDateValue(rawDate);
  const notes = cleanText(getCell(row, indexes.notes));

  let direction = normalizeDirection(rawDirection);

  if (!direction) {
    direction = inferDirectionFromEntryExitAndPnl(entry, exit, manualPnl);
  }

  const profit = calculateProfit({
    direction,
    entry,
    exit,
    contracts,
    pointValue,
    manualPnl,
  });

  const result = calculateResult(profit);

  return {
    symbol,
    direction,
    contracts,
    pointValue,
    manualPnl,
    entry,
    exit,
    tradeDate,
    notes,
    result,
    profit,
  };
}

router.post("/csv", auth, upload.single("file"), async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file is required" });
    }

    filePath = req.file.path;

    const fileContents = fs.readFileSync(filePath, "utf8");
    const { headers, rows } = parseCsvText(fileContents);

    if (!headers.length) {
      return res.status(400).json({ message: "CSV appears to be empty" });
    }

    const platform = detectPlatform(headers);
    const headerMap = buildHeaderMap(headers);
    const indexes = buildColumnIndexes(headerMap);

    const importedTrades = [];
    const skippedRows = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];

      const trade = transformRow(row, indexes);

      if (!trade.symbol) {
        skippedRows.push({
          rowNumber: i + 2,
          reason: "Missing symbol",
        });
        continue;
      }

      if (
        trade.entry === null &&
        trade.exit === null &&
        trade.manualPnl === null
      ) {
        skippedRows.push({
          rowNumber: i + 2,
          reason: "Missing trade values",
        });
        continue;
      }

      const presetMatch = await matchPreset(
        req.user.id,
        trade.symbol,
        trade.direction
      );

      importedTrades.push({
        userId: req.user.id,
        symbol: trade.symbol,
        direction: trade.direction,
        contracts: trade.contracts,
        pointValue: trade.pointValue,
        manualPnl: trade.manualPnl,
        notes:
          trade.notes ||
          `Imported from ${platform} CSV`,
        presetId: presetMatch.presetId,
        presetName: presetMatch.presetName,
        tradeDate: trade.tradeDate,
        result: trade.result,
        aiReview: "",
        entry: trade.entry,
        exit: trade.exit,
        stopLoss: null,
        takeProfit: null,
        profit: trade.profit,
      });
    }

    if (!importedTrades.length) {
      return res.status(400).json({
        message: "No trades could be imported from this file",
        platform,
        detectedHeaders: headers,
        skippedRows,
      });
    }

    const inserted = await Trade.insertMany(importedTrades);

    return res.json({
      message: `Imported ${inserted.length} trades`,
      platform,
      detectedHeaders: headers,
      importedCount: inserted.length,
      skippedCount: skippedRows.length,
      skippedRows,
      preview: inserted.slice(0, 5),
    });
  } catch (error) {
    console.error("csv import error:", error);
    return res.status(500).json({
      message: "Could not import CSV",
      error: error.message || "Unknown import error",
    });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.error("csv cleanup error:", cleanupError.message);
      }
    }
  }
});

module.exports = router;