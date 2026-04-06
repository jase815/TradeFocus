const instrumentConfig = {
  NQ: { pointValue: 20 },
  MNQ: { pointValue: 2 },
  ES: { pointValue: 50 },
  MES: { pointValue: 5 },
  CL: { pointValue: 1000 },
  MCL: { pointValue: 100 },
  GC: { pointValue: 100 },
  MGC: { pointValue: 10 },
  YM: { pointValue: 5 },
  MYM: { pointValue: 0.5 },
  RTY: { pointValue: 50 },
  M2K: { pointValue: 5 },
  BTC: { pointValue: 1 },
  ETH: { pointValue: 1 },
  SOL: { pointValue: 1 },
};

export function normalizeSymbol(symbol) {
  if (!symbol) return "";
  const clean = String(symbol).trim().toUpperCase();
  if (clean.includes("MNQ")) return "MNQ";
  if (clean.includes("NQ")) return "NQ";
  if (clean.includes("MES")) return "MES";
  if (clean.includes("ES")) return "ES";
  if (clean.includes("MCL")) return "MCL";
  if (clean.includes("CL")) return "CL";
  if (clean.includes("MGC")) return "MGC";
  if (clean.includes("GC")) return "GC";
  if (clean.includes("MYM")) return "MYM";
  if (clean.includes("YM")) return "YM";
  if (clean.includes("M2K")) return "M2K";
  if (clean.includes("RTY")) return "RTY";
  if (clean.includes("BTC")) return "BTC";
  if (clean.includes("ETH")) return "ETH";
  if (clean.includes("SOL")) return "SOL";
  return clean;
}

export function toNumber(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
}

export function calculateTradePnl(trade) {
  const manual = toNumber(trade.manualPnl, null);
  if (manual !== null) return manual;

  const existingProfit = toNumber(trade.profit, null);
  if (existingProfit !== null) return existingProfit;

  const symbol = normalizeSymbol(trade.symbol);
  const pointValue = toNumber(trade.pointValue, null) ?? instrumentConfig[symbol]?.pointValue ?? 1;
  const entry = toNumber(trade.entry, null);
  const exit = toNumber(trade.exit, null);
  const contracts = toNumber(trade.contracts, 1) || 1;
  const direction = String(trade.direction || "").toLowerCase();

  if (entry === null || exit === null || !direction) return 0;
  const move = direction === "short" ? entry - exit : exit - entry;
  return Number((move * pointValue * contracts).toFixed(2));
}

export function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export function formatDateLabel(value) {
  if (!value) return "No date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getTradeTimestamp(trade) {
  const candidates = [trade.exitTime, trade.entryTime, trade.tradeDate, trade.createdAt];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

export function getTradeDateKey(trade) {
  const parsed = getTradeTimestamp(trade);
  return parsed ? parsed.toISOString().slice(0, 10) : "";
}

function getTradeSourceLabel(trade) {
  if (!trade.imported) return "Manual";
  if (!trade.importSource) return "Imported";

  const raw = String(trade.importSource).trim();
  return raw
    .split("-")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ""))
    .join(" ");
}

function getSessionLabel(trade) {
  const parsed = trade.entryTime ? new Date(trade.entryTime) : trade.exitTime ? new Date(trade.exitTime) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return "";

  const hour = parsed.getHours();
  if (hour < 11) return "Morning";
  if (hour < 14) return "Mid-Day";
  return "Afternoon";
}

function groupAndSort(map, sortKey = "pnl") {
  return Object.values(map).sort((a, b) => {
    if (sortKey === "date") return String(a.date || "").localeCompare(String(b.date || ""));
    return (b[sortKey] || 0) - (a[sortKey] || 0);
  });
}

export function computeAnalytics(trades, folders = []) {
  const orderedTrades = [...trades].sort((a, b) => {
    const aTime = getTradeTimestamp(a)?.getTime() || 0;
    const bTime = getTradeTimestamp(b)?.getTime() || 0;
    return aTime - bTime;
  });

  const pnls = orderedTrades.map(calculateTradePnl);
  const wins = pnls.filter((pnl) => pnl > 0);
  const losses = pnls.filter((pnl) => pnl < 0);
  const breakevenCount = pnls.filter((pnl) => pnl === 0).length;
  const totalPnL = pnls.reduce((sum, pnl) => sum + pnl, 0);
  const totalTrades = orderedTrades.length;
  const grossProfit = wins.reduce((sum, pnl) => sum + pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, pnl) => sum + pnl, 0));
  const avgWin = wins.length ? grossProfit / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((sum, pnl) => sum + pnl, 0) / losses.length : 0;
  const winRate = totalTrades ? (wins.length / totalTrades) * 100 : 0;
  const profitFactor = grossLoss ? grossProfit / grossLoss : null;
  const expectancy = totalTrades ? totalPnL / totalTrades : 0;

  let runningEquity = 0;
  let peakEquity = 0;
  let maxDrawdown = 0;

  const equityCurve = orderedTrades.map((trade, index) => {
    const pnl = pnls[index];
    runningEquity += pnl;
    peakEquity = Math.max(peakEquity, runningEquity);
    const drawdown = runningEquity - peakEquity;
    if (drawdown < maxDrawdown) maxDrawdown = drawdown;

    return {
      date: getTradeDateKey(trade) || `Trade ${index + 1}`,
      equity: Number(runningEquity.toFixed(2)),
      drawdown: Number(drawdown.toFixed(2)),
      tradeNumber: index + 1,
    };
  });

  const currentDrawdown = equityCurve.length ? equityCurve[equityCurve.length - 1].drawdown : 0;

  const dailyMap = {};
  const symbolMap = {};
  const folderMap = {};
  const sourceMap = {};
  const weekdayMap = {
    Sunday: { label: "Sunday", pnl: 0, trades: 0, wins: 0 },
    Monday: { label: "Monday", pnl: 0, trades: 0, wins: 0 },
    Tuesday: { label: "Tuesday", pnl: 0, trades: 0, wins: 0 },
    Wednesday: { label: "Wednesday", pnl: 0, trades: 0, wins: 0 },
    Thursday: { label: "Thursday", pnl: 0, trades: 0, wins: 0 },
    Friday: { label: "Friday", pnl: 0, trades: 0, wins: 0 },
    Saturday: { label: "Saturday", pnl: 0, trades: 0, wins: 0 },
  };
  const monthMap = {};
  const sessionMap = {};
  const directionMap = {
    long: { label: "Long", pnl: 0, trades: 0, wins: 0 },
    short: { label: "Short", pnl: 0, trades: 0, wins: 0 },
  };

  orderedTrades.forEach((trade, index) => {
    const pnl = pnls[index];
    const date = getTradeTimestamp(trade);
    const symbol = normalizeSymbol(trade.symbol) || "Unknown";
    const source = getTradeSourceLabel(trade);
    const folderId = String(trade.folderId || "");
    const folder = folders.find((item) => item._id === folderId);
    const folderLabel = folder ? folder.name : folderId ? "Unknown Folder" : "No Folder";
    const direction = String(trade.direction || "").toLowerCase();

    const dateKey = getTradeDateKey(trade);
    if (dateKey) {
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { date: dateKey, pnl: 0, trades: 0 };
      }
      dailyMap[dateKey].pnl += pnl;
      dailyMap[dateKey].trades += 1;
    }

    if (!symbolMap[symbol]) {
      symbolMap[symbol] = { label: symbol, trades: 0, pnl: 0, wins: 0 };
    }
    symbolMap[symbol].trades += 1;
    symbolMap[symbol].pnl += pnl;
    if (pnl > 0) symbolMap[symbol].wins += 1;

    if (!folderMap[folderLabel]) {
      folderMap[folderLabel] = { label: folderLabel, trades: 0, pnl: 0, wins: 0 };
    }
    folderMap[folderLabel].trades += 1;
    folderMap[folderLabel].pnl += pnl;
    if (pnl > 0) folderMap[folderLabel].wins += 1;

    if (!sourceMap[source]) {
      sourceMap[source] = { label: source, trades: 0, pnl: 0, wins: 0 };
    }
    sourceMap[source].trades += 1;
    sourceMap[source].pnl += pnl;
    if (pnl > 0) sourceMap[source].wins += 1;

    if (directionMap[direction]) {
      directionMap[direction].trades += 1;
      directionMap[direction].pnl += pnl;
      if (pnl > 0) directionMap[direction].wins += 1;
    }

    if (date) {
      const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
      const month = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      weekdayMap[weekday].trades += 1;
      weekdayMap[weekday].pnl += pnl;
      if (pnl > 0) weekdayMap[weekday].wins += 1;

      if (!monthMap[month]) {
        monthMap[month] = { label: month, pnl: 0, trades: 0 };
      }
      monthMap[month].pnl += pnl;
      monthMap[month].trades += 1;
    }

    const session = getSessionLabel(trade);
    if (session) {
      if (!sessionMap[session]) {
        sessionMap[session] = { label: session, pnl: 0, trades: 0, wins: 0 };
      }
      sessionMap[session].pnl += pnl;
      sessionMap[session].trades += 1;
      if (pnl > 0) sessionMap[session].wins += 1;
    }
  });

  const dailySeries = groupAndSort(dailyMap, "date").map((item) => ({
    ...item,
    pnl: Number(item.pnl.toFixed(2)),
  }));

  const bestDay = dailySeries.reduce((best, day) => (!best || day.pnl > best.pnl ? day : best), null);
  const worstDay = dailySeries.reduce((worst, day) => (!worst || day.pnl < worst.pnl ? day : worst), null);

  const symbolBreakdown = groupAndSort(symbolMap).map((item) => ({
    ...item,
    avgPnl: item.trades ? item.pnl / item.trades : 0,
    winRate: item.trades ? (item.wins / item.trades) * 100 : 0,
  }));

  const folderBreakdown = groupAndSort(folderMap).map((item) => ({
    ...item,
    winRate: item.trades ? (item.wins / item.trades) * 100 : 0,
  }));

  const sourceBreakdown = groupAndSort(sourceMap).map((item) => ({
    ...item,
    winRate: item.trades ? (item.wins / item.trades) * 100 : 0,
  }));

  const weekdayBreakdown = Object.values(weekdayMap).map((item) => ({
    ...item,
    winRate: item.trades ? (item.wins / item.trades) * 100 : 0,
  }));

  const monthBreakdown = Object.values(monthMap)
    .sort((a, b) => new Date(`1 ${a.label}`).getTime() - new Date(`1 ${b.label}`).getTime())
    .map((item) => ({
      ...item,
      pnl: Number(item.pnl.toFixed(2)),
    }));

  const sessionBreakdown = Object.values(sessionMap).map((item) => ({
    ...item,
    winRate: item.trades ? (item.wins / item.trades) * 100 : 0,
  }));

  const longShort = {
    long: {
      ...directionMap.long,
      winRate: directionMap.long.trades ? (directionMap.long.wins / directionMap.long.trades) * 100 : 0,
    },
    short: {
      ...directionMap.short,
      winRate: directionMap.short.trades ? (directionMap.short.wins / directionMap.short.trades) * 100 : 0,
    },
  };

  const bestWeekday = weekdayBreakdown.reduce((best, item) => (!best || item.pnl > best.pnl ? item : best), null);
  const worstWeekday = weekdayBreakdown.reduce((worst, item) => (!worst || item.pnl < worst.pnl ? item : worst), null);

  return {
    overview: {
      totalPnL,
      totalTrades,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      expectancy,
      bestDay,
      worstDay,
      grossProfit,
      grossLoss,
      winners: wins.length,
      losers: losses.length,
      breakeven: breakevenCount,
      maxDrawdown,
      currentDrawdown,
    },
    equityCurve,
    dailySeries,
    symbolBreakdown,
    folderBreakdown,
    sourceBreakdown,
    weekdayBreakdown,
    monthBreakdown,
    sessionBreakdown,
    longShort,
    bestWeekday,
    worstWeekday,
  };
}
