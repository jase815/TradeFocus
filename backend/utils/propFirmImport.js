const crypto = require("crypto");

const DEFAULT_POINT_VALUES = {
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

const SOURCE_OPTIONS = ["apex", "topstep", "generic"];

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeSource(source) {
  const value = cleanText(source).toLowerCase();
  if (value === "apex") return "apex";
  if (value === "topstep") return "topstep";
  return "generic";
}

function getSourceLabel(source) {
  const normalized = normalizeSource(source);
  if (normalized === "apex") return "Apex";
  if (normalized === "topstep") return "Topstep";
  return "Generic CSV";
}

function normalizeHeader(header) {
  return cleanText(header)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9/@&]/g, "");
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

function normalizeSymbol(symbol) {
  if (!symbol) return "";

  const clean = String(symbol).trim().toUpperCase();

  if (clean.includes("MNQ") || clean.includes("MICRO NQ") || clean.includes("MICRO NASDAQ")) return "MNQ";
  if (clean.includes("NQ") || clean.includes("/NQ") || clean.includes("NASDAQ")) return "NQ";
  if (clean.includes("MES") || clean.includes("MICRO ES") || clean.includes("MICRO S&P")) return "MES";
  if (clean.includes("ES") || clean.includes("/ES") || clean.includes("S&P")) return "ES";
  if (clean.includes("MCL")) return "MCL";
  if (clean.includes("CL") || clean.includes("/CL") || clean.includes("CRUDE")) return "CL";
  if (clean.includes("MGC")) return "MGC";
  if (clean.includes("GC") || clean.includes("/GC") || clean.includes("GOLD")) return "GC";
  if (clean.includes("MYM")) return "MYM";
  if (clean.includes("YM") || clean.includes("/YM") || clean.includes("DOW")) return "YM";
  if (clean.includes("M2K")) return "M2K";
  if (clean.includes("RTY") || clean.includes("/RTY") || clean.includes("RUSSELL")) return "RTY";
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
  if (!direction) return "";
  const value = cleanText(direction).toLowerCase();

  if (value.includes("long") || value === "buy" || value === "b" || value === "1" || value.includes("bull")) {
    return "long";
  }

  if (value.includes("short") || value === "sell" || value === "s" || value === "-1" || value.includes("bear")) {
    return "short";
  }

  return "";
}

function getDefaultPointValue(symbol) {
  return DEFAULT_POINT_VALUES[normalizeSymbol(symbol)] || 1;
}

function parseDateTimeValue(value) {
  if (!value) return "";

  const raw = cleanText(value);
  if (!raw) return "";

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  const usMatch = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i
  );

  if (!usMatch) return "";

  let hours = Number(usMatch[4] || 0);
  const minutes = Number(usMatch[5] || 0);
  const seconds = Number(usMatch[6] || 0);
  const ampm = String(usMatch[7] || "").toUpperCase();

  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  const fallbackDate = new Date(
    Number(usMatch[3].length === 2 ? `20${usMatch[3]}` : usMatch[3]),
    Number(usMatch[1]) - 1,
    Number(usMatch[2]),
    hours,
    minutes,
    seconds
  );

  if (Number.isNaN(fallbackDate.getTime())) return "";
  return fallbackDate.toISOString();
}

function toTradeDate(...values) {
  for (const value of values) {
    const iso = parseDateTimeValue(value);
    if (iso) return iso.slice(0, 10);
  }

  return "";
}

function calculateProfit({ direction, entry, exit, contracts, pointValue, manualPnl }) {
  if (manualPnl !== null && manualPnl !== undefined) {
    return Number(manualPnl);
  }

  if (!direction || entry === null || exit === null) {
    return null;
  }

  const qty = contracts || 1;
  const pv = pointValue || 1;
  const points = direction === "short" ? entry - exit : exit - entry;

  return Number((points * qty * pv).toFixed(2));
}

function calculateResult(profit) {
  if (profit === null || profit === undefined) return "";
  if (profit > 0) return "win";
  if (profit < 0) return "loss";
  return "breakeven";
}

function inferDirection({ direction, entry, exit, pnl }) {
  const normalized = normalizeDirection(direction);
  if (normalized) return normalized;

  if (entry === null || exit === null || pnl === null || pnl === undefined) {
    return "";
  }

  if (exit > entry && pnl > 0) return "long";
  if (exit < entry && pnl > 0) return "short";
  if (exit < entry && pnl < 0) return "long";
  if (exit > entry && pnl < 0) return "short";
  return "";
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
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (!lines.length) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0], delimiter);
  const rows = lines.slice(1).map((line) => parseCsvLine(line, delimiter));
  return { headers, rows };
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
  return cleanText(row[index] || "");
}

function buildIndexes(source, headerMap) {
  const common = {
    symbol: pickIndex(headerMap, ["symbol", "instrument", "contract", "contract name", "contractname", "ticker", "market"]),
    direction: pickIndex(headerMap, ["side", "direction", "type", "buy/sell", "buysell", "action", "market position"]),
    qty: pickIndex(headerMap, ["qty", "quantity", "contracts", "size", "filled qty", "filled"]),
    entry: pickIndex(headerMap, ["entry price", "entryprice", "entry", "avg entry price", "buy price", "open price"]),
    exit: pickIndex(headerMap, ["exit price", "exitprice", "exit", "avg exit price", "sell price", "close price"]),
    pnl: pickIndex(headerMap, ["pnl", "p/l", "net pnl", "realized pnl", "profit", "profit currency"]),
    fees: pickIndex(headerMap, ["fees", "fee", "fees or commissions", "commission", "commissions"]),
    entryTime: pickIndex(headerMap, ["entry time", "entrytime", "entered at", "enteredat", "open time", "opentime", "opened at"]),
    exitTime: pickIndex(headerMap, ["exit time", "exittime", "exited at", "exitedat", "close time", "closetime", "closed at"]),
    date: pickIndex(headerMap, ["date", "trade day", "tradeday", "trade date", "created at", "timestamp", "time"]),
    tradeId: pickIndex(headerMap, ["trade id", "external trade id", "ticket", "ticket id", "order id", "id"]),
    notes: pickIndex(headerMap, ["notes", "note", "comment", "comments", "setup", "strategy"]),
  };

  if (source === "apex") {
    return {
      ...common,
      pnl: pickIndex(headerMap, ["rp&l", "rpl", "pnl", "profit", "net pnl", "realized pnl"]),
      date: pickIndex(headerMap, ["close date", "date", "trade date", "timestamp"]),
      exitTime: pickIndex(headerMap, ["close time", "exit time", "closed at", "date"]),
    };
  }

  if (source === "topstep") {
    return {
      ...common,
      direction: pickIndex(headerMap, ["buy/sell", "side", "action", "direction"]),
      qty: pickIndex(headerMap, ["qty", "quantity", "size", "filled qty", "contracts"]),
      pnl: pickIndex(headerMap, ["realized pnl", "net pnl", "pnl", "profit/loss", "profit"]),
      date: pickIndex(headerMap, ["created at", "close time", "close date", "date"]),
      entryTime: pickIndex(headerMap, ["open time", "entry time", "created at"]),
      exitTime: pickIndex(headerMap, ["close time", "exit time", "closed at", "created at"]),
    };
  }

  return common;
}

function normalizeRow(row, indexes, source, rowNumber) {
  const symbol = normalizeSymbol(getCell(row, indexes.symbol));
  const entry = toNumber(getCell(row, indexes.entry), null);
  const exit = toNumber(getCell(row, indexes.exit), null);
  const contracts = toNumber(getCell(row, indexes.qty), 1) || 1;
  const manualPnl = toNumber(getCell(row, indexes.pnl), null);
  const fees = toNumber(getCell(row, indexes.fees), 0);
  const entryTime = parseDateTimeValue(getCell(row, indexes.entryTime) || getCell(row, indexes.date));
  const exitTime = parseDateTimeValue(
    getCell(row, indexes.exitTime) || getCell(row, indexes.date) || getCell(row, indexes.entryTime)
  );
  const tradeDate = toTradeDate(getCell(row, indexes.exitTime), getCell(row, indexes.date), getCell(row, indexes.entryTime));
  const rawDirection = getCell(row, indexes.direction);
  const direction = inferDirection({ direction: rawDirection, entry, exit, pnl: manualPnl });
  const externalTradeId = getCell(row, indexes.tradeId);
  const pointValue = getDefaultPointValue(symbol);
  const profit = calculateProfit({ direction, entry, exit, contracts, pointValue, manualPnl });
  const result = calculateResult(profit);
  const notes = cleanText(getCell(row, indexes.notes)) || `Imported from ${getSourceLabel(source)} CSV`;

  return {
    rowNumber,
    symbol,
    direction,
    contracts,
    pointValue,
    manualPnl,
    fees,
    tradeDate,
    entry,
    exit,
    entryTime,
    exitTime,
    externalTradeId,
    notes,
    result,
    profit,
    importSource: source,
  };
}

function validateNormalizedTrade(trade) {
  if (!trade.symbol) return "Missing symbol";

  if (trade.entry === null && trade.exit === null && trade.manualPnl === null && trade.profit === null) {
    return "Missing entry, exit, or PnL";
  }

  if (!trade.direction && (trade.entry !== null || trade.exit !== null)) {
    return "Could not determine trade direction";
  }

  return "";
}

function parseRowsForSource(source, headers, rows) {
  const headerMap = buildHeaderMap(headers);
  const indexes = buildIndexes(source, headerMap);
  const trades = [];
  const skippedRows = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    if (!row.some((cell) => cleanText(cell))) {
      skippedRows.push({ rowNumber, reason: "Empty row" });
      return;
    }

    const trade = normalizeRow(row, indexes, source, rowNumber);
    const invalidReason = validateNormalizedTrade(trade);

    if (invalidReason) {
      skippedRows.push({ rowNumber, reason: invalidReason });
      return;
    }

    trades.push(trade);
  });

  return { trades, skippedRows };
}

function parseApexCsv(headers, rows) {
  return parseRowsForSource("apex", headers, rows);
}

function parseTopstepCsv(headers, rows) {
  return parseRowsForSource("topstep", headers, rows);
}

function parseGenericCsv(headers, rows) {
  return parseRowsForSource("generic", headers, rows);
}

function parseImportFile(buffer, source, fileName = "") {
  const text = buffer.toString("utf8");
  const { headers, rows } = parseCsvText(text);

  if (!headers.length) {
    const error = new Error("CSV appears to be empty");
    error.statusCode = 400;
    throw error;
  }

  const normalizedSource = normalizeSource(source);
  let result;

  if (normalizedSource === "apex") result = parseApexCsv(headers, rows);
  else if (normalizedSource === "topstep") result = parseTopstepCsv(headers, rows);
  else result = parseGenericCsv(headers, rows);

  return {
    source: normalizedSource,
    sourceLabel: getSourceLabel(normalizedSource),
    fileName,
    headers,
    totalRows: rows.length,
    parsedTrades: result.trades,
    skippedRows: result.skippedRows,
  };
}

function buildImportFingerprint(userId, trade) {
  const fingerprintBase = [
    userId,
    cleanText(trade.externalTradeId),
    cleanText(trade.symbol),
    cleanText(trade.direction),
    trade.contracts ?? "",
    trade.entry ?? "",
    trade.exit ?? "",
    cleanText(trade.entryTime),
    cleanText(trade.exitTime),
    cleanText(trade.tradeDate),
    trade.manualPnl ?? trade.profit ?? "",
  ].join("|");

  return crypto.createHash("sha1").update(fingerprintBase).digest("hex");
}

function classifyTradesForImport({ userId, parsedTrades, existingTrades }) {
  const existingExternalIds = new Set(
    existingTrades.map((trade) => cleanText(trade.externalTradeId)).filter(Boolean)
  );

  const existingFingerprints = new Set(
    existingTrades.map((trade) => cleanText(trade.importFingerprint) || buildImportFingerprint(userId, trade))
  );

  const fileFingerprints = new Set();
  const readyTrades = [];
  const duplicateRows = [];
  const previewTrades = [];

  parsedTrades.forEach((trade) => {
    const fingerprint = buildImportFingerprint(userId, trade);
    const hasExternalDuplicate =
      cleanText(trade.externalTradeId) && existingExternalIds.has(cleanText(trade.externalTradeId));
    const hasExistingDuplicate = existingFingerprints.has(fingerprint);
    const hasFileDuplicate = fileFingerprints.has(fingerprint);
    const isDuplicate = Boolean(hasExternalDuplicate || hasExistingDuplicate || hasFileDuplicate);

    if (!hasFileDuplicate) {
      fileFingerprints.add(fingerprint);
    }

    const duplicateReason = hasExternalDuplicate
      ? "Existing trade with matching external ID"
      : hasExistingDuplicate
      ? "Existing trade with matching trade details"
      : hasFileDuplicate
      ? "Duplicate row in this CSV"
      : "";

    previewTrades.push({
      ...trade,
      importFingerprint: fingerprint,
      isDuplicate,
      duplicateReason,
    });

    if (isDuplicate) {
      duplicateRows.push({
        rowNumber: trade.rowNumber,
        reason: duplicateReason,
      });
      return;
    }

    readyTrades.push({
      ...trade,
      importFingerprint: fingerprint,
    });
  });

  return {
    readyTrades,
    previewTrades,
    duplicateRows,
  };
}

function buildTradeDocument(userId, batchId, trade) {
  return {
    userId,
    symbol: trade.symbol,
    notes: trade.notes || "",
    direction: trade.direction,
    contracts: trade.contracts,
    pointValue: trade.pointValue,
    manualPnl: trade.manualPnl,
    tradeDate: trade.tradeDate,
    presetId: "",
    presetName: "",
    result: trade.result,
    aiReview: "",
    entry: trade.entry,
    exit: trade.exit,
    stopLoss: null,
    takeProfit: null,
    profit: trade.profit,
    screenshot: "",
    fees: trade.fees,
    imported: true,
    importSource: trade.importSource,
    importBatchId: batchId,
    externalTradeId: trade.externalTradeId,
    importFingerprint: trade.importFingerprint,
    entryTime: trade.entryTime,
    exitTime: trade.exitTime,
  };
}

function buildImportResponse({ source, fileName, isPremium, parsed, classified, importedCount = 0, importBatchId = "" }) {
  return {
    source,
    sourceLabel: getSourceLabel(source),
    fileName,
    isPremium,
    importBatchId,
    detectedHeaders: parsed.headers,
    summary: {
      totalRows: parsed.totalRows,
      validTrades: parsed.parsedTrades.length,
      duplicates: classified.duplicateRows.length,
      skippedRows: parsed.skippedRows.length,
      readyToImport: classified.readyTrades.length,
      importedCount,
    },
    skippedRows: parsed.skippedRows,
    duplicateRows: classified.duplicateRows,
    previewTrades: classified.previewTrades.slice(0, 8).map((trade) => ({
      rowNumber: trade.rowNumber,
      symbol: trade.symbol,
      direction: trade.direction,
      contracts: trade.contracts,
      entry: trade.entry,
      exit: trade.exit,
      tradeDate: trade.tradeDate,
      pnl: trade.manualPnl ?? trade.profit ?? null,
      fees: trade.fees ?? 0,
      externalTradeId: trade.externalTradeId,
      isDuplicate: trade.isDuplicate,
      duplicateReason: trade.duplicateReason,
    })),
  };
}

module.exports = {
  SOURCE_OPTIONS,
  buildImportFingerprint,
  buildImportResponse,
  buildTradeDocument,
  classifyTradesForImport,
  normalizeSource,
  parseImportFile,
};
