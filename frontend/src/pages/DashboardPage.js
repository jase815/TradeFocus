import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "../styles";
import TradeForm from "../components/TradeForm";
import StatsCards from "../components/StatsCards";
import TradeList from "../components/TradeList";
import ImportTradesCard from "../components/ImportTradesCard";

const API_BASE = "http://localhost:5000";

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
  AAPL: { pointValue: 1 },
  TSLA: { pointValue: 1 },
  SPY: { pointValue: 1 },
  QQQ: { pointValue: 1 },
};

function normalizeSymbol(symbol) {
  if (!symbol) return "";

  const clean = String(symbol).trim().toUpperCase();

  if (clean.includes("MNQ") || clean.includes("MICRO NQ") || clean.includes("MICRO NASDAQ")) return "MNQ";
  if (clean.includes("NQ") || clean.includes("NASDAQ")) return "NQ";
  if (clean.includes("MES") || clean.includes("MICRO ES") || clean.includes("MICRO S&P")) return "MES";
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

function toNumber(value, fallback = null) {
  if (value === "" || value === null || value === undefined) return fallback;
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
}

function formatTradeDateForInput(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDate(tradeDate, filterDate) {
  if (!tradeDate || !filterDate) return false;
  return formatTradeDateForInput(tradeDate) === filterDate;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function blobFromCanvas(canvas, type = "image/jpeg", quality = 0.92) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function buildCroppedScreenshotBlob(file, previewUrl, cropZoom, cropX, cropY) {
  if (!file || !previewUrl) return null;

  const img = await loadImage(previewUrl);
  const outputWidth = 1400;
  const outputHeight = 900;
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const baseScale = Math.max(outputWidth / img.width, outputHeight / img.height);
  const finalScale = baseScale * cropZoom;
  const drawWidth = img.width * finalScale;
  const drawHeight = img.height * finalScale;
  const centerX = (outputWidth - drawWidth) / 2;
  const centerY = (outputHeight - drawHeight) / 2;

  ctx.drawImage(img, centerX + cropX, centerY + cropY, drawWidth, drawHeight);

  const blob = await blobFromCanvas(canvas, "image/jpeg", 0.92);
  if (!blob) return null;

  return new File([blob], file.name || "trade-screenshot.jpg", {
    type: "image/jpeg",
  });
}

function DashboardPage() {
  const navigate = useNavigate();
  const [symbol, setSymbol] = useState("");
  const [direction, setDirection] = useState("long");
  const [contracts, setContracts] = useState("1");
  const [pointValue, setPointValue] = useState("");
  const [manualPnl, setManualPnl] = useState("");
  const [tradeDate, setTradeDate] = useState("");
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");
  const [notes, setNotes] = useState("");
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [cropZoom, setCropZoom] = useState(1);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [keepScreenshot, setKeepScreenshot] = useState(true);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [newPresetName, setNewPresetName] = useState("");
  const [presets, setPresets] = useState([]);
  const [trades, setTrades] = useState([]);
  const [message, setMessage] = useState("");
  const [editingTradeId, setEditingTradeId] = useState(null);
  const [dateFilter, setDateFilter] = useState("");
  const [reviewingTradeId, setReviewingTradeId] = useState("");
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const token = localStorage.getItem("token") || "";
  const selectedPreset = presets.find((p) => p._id === selectedPresetId) || null;

  useEffect(() => {
    if (token) {
      fetchTrades();
      fetchPresets();
    }
  }, [token]);

  useEffect(() => {
    const normalized = normalizeSymbol(symbol);
    const config = instrumentConfig[normalized];

    if (config && config.pointValue !== null && config.pointValue !== undefined) {
      setPointValue(String(config.pointValue));
    } else if (!editingTradeId) {
      setPointValue("");
    }
  }, [symbol, editingTradeId]);

  const calculateTradePnl = (trade) => {
    const manual = toNumber(trade.manualPnl, null);
    if (manual !== null) return manual;

    if (trade.profit !== null && trade.profit !== undefined && trade.profit !== "") {
      const backendProfit = Number(trade.profit);
      if (!Number.isNaN(backendProfit)) return backendProfit;
    }

    const normalized = normalizeSymbol(trade.symbol);
    const autoPointValue = instrumentConfig[normalized]?.pointValue;
    const resolvedPointValue = toNumber(trade.pointValue, null) ?? autoPointValue ?? 1;
    const entryValue = toNumber(trade.entry, 0);
    const exitValue = toNumber(trade.exit, 0);
    const contractsValue = toNumber(trade.contracts, 1);
    const tradeDirection = String(trade.direction || "long").toLowerCase();
    const pointMove = tradeDirection === "short" ? entryValue - exitValue : exitValue - entryValue;
    return Number((pointMove * resolvedPointValue * contractsValue).toFixed(2));
  };

  const detectResult = (trade) => {
    if (trade.result) return trade.result;
    const pnl = calculateTradePnl(trade);
    if (pnl > 0) return "win";
    if (pnl < 0) return "loss";
    return "breakeven";
  };

  const clearForm = () => {
    setSymbol("");
    setDirection("long");
    setContracts("1");
    setPointValue("");
    setManualPnl("");
    setTradeDate("");
    setEntry("");
    setExit("");
    setNotes("");
    setScreenshotFile(null);
    setScreenshotPreview("");
    setCropZoom(1);
    setCropX(0);
    setCropY(0);
    setKeepScreenshot(true);
    setEditingTradeId(null);
    setSelectedPresetId("");
    setNewPresetName("");
  };

  const fetchPresets = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/presets`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setPresets(Array.isArray(data) ? data : []);
      } else {
        setMessage(data.message || "Could not load presets");
      }
    } catch (error) {
      console.error("fetch presets error:", error);
      setMessage("Preset request crashed");
    }
  };

  const fetchTrades = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/trades`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setTrades(Array.isArray(data) ? data : []);
        setMessage("Trades loaded");
      } else {
        setMessage(data.message || "Could not load trades");
      }
    } catch (error) {
      console.error("fetch trades error:", error);
      setMessage("Trades request crashed");
    }
  };

  const loadPreset = () => {
    const preset = presets.find((p) => p._id === selectedPresetId);
    if (!preset) {
      setMessage("Choose a preset first");
      return;
    }

    setSymbol(preset.symbol || "");
    setDirection(preset.direction || "long");
    setContracts(String(preset.contracts ?? 1));
    setManualPnl(preset.manualPnl === null || preset.manualPnl === undefined ? "" : String(preset.manualPnl));
    setNotes(preset.notes || "");

    if (preset.pointValue !== null && preset.pointValue !== undefined) {
      setPointValue(String(preset.pointValue));
    } else {
      const autoPointValue = instrumentConfig[normalizeSymbol(preset.symbol)]?.pointValue;
      setPointValue(autoPointValue !== null && autoPointValue !== undefined ? String(autoPointValue) : "");
    }

    setMessage(`Loaded preset: ${preset.name}`);
  };

  const saveCurrentAsPreset = async () => {
    try {
      if (!newPresetName.trim()) {
        setMessage("Enter a preset name");
        return;
      }

      const res = await fetch(`${API_BASE}/api/presets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newPresetName.trim(),
          symbol: normalizeSymbol(symbol),
          direction,
          contracts: Number(contracts) || 1,
          pointValue: pointValue === "" ? null : Number(pointValue),
          manualPnl: manualPnl === "" ? null : Number(manualPnl),
          notes,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(`Preset saved: ${data.name}`);
        setNewPresetName("");
        fetchPresets();
      } else {
        setMessage(data.message || "Could not save preset");
      }
    } catch (error) {
      console.error("save preset error:", error);
      setMessage("Save preset crashed");
    }
  };

  const deletePreset = async () => {
    try {
      if (!selectedPresetId) {
        setMessage("Choose a preset to delete");
        return;
      }

      const res = await fetch(`${API_BASE}/api/presets/${selectedPresetId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(data.message || "Preset deleted");
        setSelectedPresetId("");
        fetchPresets();
      } else {
        setMessage(data.message || "Could not delete preset");
      }
    } catch (error) {
      console.error("delete preset error:", error);
      setMessage("Delete preset crashed");
    }
  };

  const deletePresetByName = async (presetName) => {
    try {
      const preset = presets.find((p) => p.name === presetName);
      if (!preset) {
        setMessage("Preset not found");
        return;
      }

      const res = await fetch(`${API_BASE}/api/presets/${preset._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(data.message || "Strategy deleted");
        if (selectedPresetId === preset._id) setSelectedPresetId("");
        fetchPresets();
      } else {
        setMessage(data.message || "Could not delete strategy");
      }
    } catch (error) {
      console.error("delete strategy error:", error);
      setMessage("Delete strategy crashed");
    }
  };

  const importCsvTrades = async (file) => {
    try {
      setIsImportingCsv(true);
      setImportResult(null);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/api/import/csv`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setImportResult(data);
        setMessage(data.message || "CSV imported");
        fetchTrades();
      } else {
        setMessage(data.message || "Could not import CSV");
        setImportResult(data);
      }
    } catch (error) {
      console.error("csv import error:", error);
      setMessage("CSV import crashed");
    } finally {
      setIsImportingCsv(false);
    }
  };

  const reviewTrade = async (tradeId) => {
    try {
      setReviewingTradeId(tradeId);

      const res = await fetch(`${API_BASE}/api/ai/review-trade/${tradeId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setMessage("AI trade review generated");
        fetchTrades();
      } else {
        setMessage(data.message || "Could not review trade");
      }
    } catch (error) {
      console.error("review trade error:", error);
      setMessage("AI trade review crashed");
    } finally {
      setReviewingTradeId("");
    }
  };

  const startEditTrade = (trade) => {
    setEditingTradeId(trade._id);
    setSymbol(trade.symbol || trade.ticker || trade.pair || "");
    setDirection(trade.direction || "long");
    setContracts(String(trade.contracts ?? 1));
    setPointValue(trade.pointValue === null || trade.pointValue === undefined ? "" : String(trade.pointValue));
    setManualPnl(trade.manualPnl === null || trade.manualPnl === undefined ? "" : String(trade.manualPnl));
    setTradeDate(formatTradeDateForInput(trade.tradeDate));
    setEntry(trade.entry === null || trade.entry === undefined ? "" : String(trade.entry));
    setExit(trade.exit === null || trade.exit === undefined ? "" : String(trade.exit));
    setNotes(trade.notes || "");
    setSelectedPresetId(trade.presetId || "");
    setScreenshotFile(null);
    setScreenshotPreview(trade.screenshot ? `${API_BASE}${trade.screenshot}` : "");
    setCropZoom(1);
    setCropX(0);
    setCropY(0);
    setKeepScreenshot(Boolean(trade.screenshot));
    setMessage("Editing trade");
  };

  const cancelEdit = () => {
    clearForm();
    setMessage("Edit canceled");
  };

  const deleteTrade = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/trades/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(data.message || "Trade deleted");
        fetchTrades();
      } else {
        setMessage(data.message || "Delete failed");
      }
    } catch (error) {
      console.error("delete trade error:", error);
      setMessage("Delete crashed");
    }
  };

  const buildTradeFormData = async () => {
    const formData = new FormData();
    formData.append("symbol", normalizeSymbol(symbol));
    formData.append("direction", direction);
    formData.append("contracts", Number(contracts) || 1);
    formData.append("pointValue", pointValue === "" ? "" : Number(pointValue));
    formData.append("manualPnl", manualPnl === "" ? "" : Number(manualPnl));
    formData.append("tradeDate", tradeDate || "");
    formData.append("entry", entry === "" ? "" : Number(entry));
    formData.append("exit", exit === "" ? "" : Number(exit));
    formData.append("notes", notes || "");
    formData.append("presetId", selectedPreset ? selectedPreset._id : "");
    formData.append("presetName", selectedPreset ? selectedPreset.name : "");

    if (!keepScreenshot) {
      formData.append("keepScreenshot", "false");
    }

    if (screenshotFile && screenshotPreview) {
      const croppedFile = await buildCroppedScreenshotBlob(
        screenshotFile,
        screenshotPreview,
        cropZoom,
        cropX,
        cropY
      );

      if (croppedFile) {
        formData.append("screenshot", croppedFile);
      }
    }

    return formData;
  };

  const addTrade = async () => {
    try {
      const formData = await buildTradeFormData();
      const res = await fetch(`${API_BASE}/api/trades`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setMessage("Trade added");
        clearForm();
        fetchTrades();
      } else {
        setMessage(data.message || "Add trade failed");
      }
    } catch (error) {
      console.error("add trade error:", error);
      setMessage("Add trade crashed");
    }
  };

  const updateTrade = async () => {
    try {
      const formData = await buildTradeFormData();
      const res = await fetch(`${API_BASE}/api/trades/${editingTradeId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setMessage("Trade updated");
        clearForm();
        fetchTrades();
      } else {
        setMessage(data.message || "Update failed");
      }
    } catch (error) {
      console.error("update trade error:", error);
      setMessage("Update crashed");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const filteredTrades = useMemo(() => {
    if (!dateFilter) return trades;
    return trades.filter((trade) => isSameDate(trade.tradeDate, dateFilter));
  }, [trades, dateFilter]);

  const stats = useMemo(() => {
    const totalTrades = filteredTrades.length;
    const totalPnL = filteredTrades.reduce((sum, trade) => sum + calculateTradePnl(trade), 0);
    const wins = filteredTrades.filter((trade) => detectResult(trade) === "win").length;
    const winRate = totalTrades ? ((wins / totalTrades) * 100).toFixed(1) : "0.0";

    return {
      totalTrades,
      totalPnL: totalPnL.toFixed(2),
      winRate,
    };
  }, [filteredTrades]);

  const strategyStats = useMemo(() => {
    const grouped = {};

    filteredTrades.forEach((trade) => {
      const key = trade.presetName || "No Preset";

      if (!grouped[key]) {
        grouped[key] = { name: key, totalTrades: 0, wins: 0, totalPnL: 0 };
      }

      const pnl = calculateTradePnl(trade);
      grouped[key].totalTrades += 1;
      grouped[key].totalPnL += pnl;
      if (pnl > 0) grouped[key].wins += 1;
    });

    return Object.values(grouped).map((group) => ({
      ...group,
      totalPnL: group.totalPnL.toFixed(2),
      winRate: group.totalTrades ? ((group.wins / group.totalTrades) * 100).toFixed(1) : "0.0",
    }));
  }, [filteredTrades]);

  const messageTone =
    message.toLowerCase().includes("error") ||
    message.toLowerCase().includes("failed") ||
    message.toLowerCase().includes("could not")
      ? "var(--app-danger)"
      : "var(--app-text)";

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Dashboard</h1>
            <p style={styles.subtitle}>
              Manage trades, presets, CSV imports, screenshots, AI reviews, and strategy performance.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link to="/charts" style={{ textDecoration: "none" }}>
              <button style={styles.secondaryButton}>Charts</button>
            </Link>
            <button onClick={handleLogout} style={styles.ghostButton}>
              Logout
            </button>
          </div>
        </div>

        <div style={{ ...styles.card, marginBottom: "20px" }}>
          <div style={{ ...styles.statusText, color: messageTone }}>{message || "Ready"}</div>
        </div>

        <StatsCards stats={stats} />

        <div style={styles.mainGrid}>
          <TradeForm
            symbol={symbol}
            setSymbol={setSymbol}
            direction={direction}
            setDirection={setDirection}
            contracts={contracts}
            setContracts={setContracts}
            pointValue={pointValue}
            setPointValue={setPointValue}
            manualPnl={manualPnl}
            setManualPnl={setManualPnl}
            tradeDate={tradeDate}
            setTradeDate={setTradeDate}
            entry={entry}
            setEntry={setEntry}
            exit={exit}
            setExit={setExit}
            notes={notes}
            setNotes={setNotes}
            screenshotFile={screenshotFile}
            setScreenshotFile={setScreenshotFile}
            screenshotPreview={screenshotPreview}
            setScreenshotPreview={setScreenshotPreview}
            cropZoom={cropZoom}
            setCropZoom={setCropZoom}
            cropX={cropX}
            setCropX={setCropX}
            cropY={cropY}
            setCropY={setCropY}
            keepScreenshot={keepScreenshot}
            setKeepScreenshot={setKeepScreenshot}
            addTrade={addTrade}
            isEditing={!!editingTradeId}
            updateTrade={updateTrade}
            cancelEdit={cancelEdit}
            clearForm={clearForm}
            presets={presets}
            selectedPresetId={selectedPresetId}
            setSelectedPresetId={setSelectedPresetId}
            newPresetName={newPresetName}
            setNewPresetName={setNewPresetName}
            loadPreset={loadPreset}
            saveCurrentAsPreset={saveCurrentAsPreset}
            deletePreset={deletePreset}
          />

          <div style={{ display: "grid", gap: "20px" }}>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Filters</h2>

              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={styles.input}
              />

              <div style={styles.buttonRow}>
                <button onClick={() => setDateFilter("")} style={styles.ghostButton}>
                  Clear Date Filter
                </button>
                <button onClick={fetchTrades} style={styles.secondaryButton}>
                  Refresh Trades
                </button>
                <button onClick={fetchPresets} style={styles.secondaryButton}>
                  Refresh Presets
                </button>
              </div>
            </div>

            <ImportTradesCard
              importCsvTrades={importCsvTrades}
              isImportingCsv={isImportingCsv}
              importResult={importResult}
            />
          </div>
        </div>

        <div style={{ ...styles.card, marginBottom: "24px" }}>
          <h2 style={styles.cardTitle}>Strategy Stats</h2>

          {strategyStats.length === 0 ? (
            <div style={styles.emptyState}>No strategy stats yet</div>
          ) : (
            <div style={styles.tradeList}>
              {strategyStats.map((stat) => (
                <div key={stat.name} style={styles.tradeCard}>
                  <div style={styles.tradeTopRow}>
                    <div>
                      <div style={styles.tradeSymbol}>{stat.name}</div>
                      <div style={styles.tradeNote}>
                        {stat.totalTrades} trades • {stat.winRate}% win rate
                      </div>
                    </div>

                    <div
                      style={{
                        ...styles.pnlBadge,
                        backgroundColor:
                          Number(stat.totalPnL) >= 0 ? "var(--app-success-bg)" : "var(--app-danger-bg)",
                        color: Number(stat.totalPnL) >= 0 ? "var(--app-success)" : "var(--app-danger)",
                      }}
                    >
                      {Number(stat.totalPnL) >= 0 ? "+" : ""}
                      {stat.totalPnL}
                    </div>
                  </div>

                  <div style={styles.tradeActions}>
                    {stat.name !== "No Preset" && (
                      <button onClick={() => deletePresetByName(stat.name)} style={styles.deleteButton}>
                        Delete Strategy
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <TradeList
          trades={filteredTrades}
          deleteTrade={deleteTrade}
          startEditTrade={startEditTrade}
          calculateTradePnl={calculateTradePnl}
          detectResult={detectResult}
          reviewTrade={reviewTrade}
          reviewingTradeId={reviewingTradeId}
        />
      </div>
    </div>
  );
}

export default DashboardPage;
