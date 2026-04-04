import React, { useMemo, useRef, useState } from "react";
import styles from "../styles";

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

function toNumber(value, fallback = null) {
  if (value === "" || value === null || value === undefined) return fallback;
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
}

function normalizeSymbol(value) {
  if (!value) return "";

  const clean = String(value).trim().toUpperCase();

  if (clean.includes("MNQ") || clean.includes("MICRO NQ") || clean.includes("MICRO NASDAQ")) {
    return "MNQ";
  }
  if (clean.includes("NQ") || clean.includes("NASDAQ")) return "NQ";
  if (clean.includes("MES") || clean.includes("MICRO ES") || clean.includes("MICRO S&P")) {
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

function getSuggestedPointValue(symbol) {
  return DEFAULT_POINT_VALUES[symbol] ?? "";
}

function resolvePointValue(symbol, rawPointValue) {
  const normalizedSymbol = normalizeSymbol(symbol);
  const mapped = getSuggestedPointValue(normalizedSymbol);
  const numericPointValue = toNumber(rawPointValue, null);

  if (mapped !== "") return mapped;
  return numericPointValue ?? 1;
}

function formatMoney(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function getPreviewProfit({ symbol, direction, entry, exit, contracts, pointValue, manualPnl }) {
  const manual = toNumber(manualPnl, null);
  if (manual !== null) return manual;

  const entryNum = toNumber(entry, null);
  const exitNum = toNumber(exit, null);
  const contractsNum = toNumber(contracts, 1);
  const pointValueNum = resolvePointValue(symbol, pointValue);

  if (entryNum === null || exitNum === null) return null;

  const move = direction === "short" ? entryNum - exitNum : exitNum - entryNum;
  return Number((move * contractsNum * pointValueNum).toFixed(2));
}

function getResultFromProfit(profit) {
  if (profit === null || profit === undefined) return "";
  if (profit > 0) return "win";
  if (profit < 0) return "loss";
  return "breakeven";
}

function resultBadgeStyle(result) {
  if (result === "win") {
    return {
      background: "var(--app-success-bg)",
      color: "var(--app-success)",
      border: "1px solid var(--app-success-border)",
    };
  }

  if (result === "loss") {
    return {
      background: "var(--app-danger-bg)",
      color: "var(--app-danger)",
      border: "1px solid var(--app-danger-border)",
    };
  }

  if (result === "breakeven") {
    return {
      background: "var(--app-card-muted)",
      color: "var(--app-text-soft)",
      border: "1px solid var(--app-input-border)",
    };
  }

  return {
    background: "var(--app-card-muted)",
    color: "var(--app-text-soft)",
    border: "1px solid var(--app-card-border)",
  };
}

function sectionLabel(text) {
  return {
    marginBottom: "8px",
    fontSize: "14px",
    color: "var(--app-text)",
    fontWeight: "bold",
  };
}

function TradeForm({
  symbol,
  setSymbol,
  direction,
  setDirection,
  contracts,
  setContracts,
  pointValue,
  setPointValue,
  manualPnl,
  setManualPnl,
  tradeDate,
  setTradeDate,
  entry,
  setEntry,
  exit,
  setExit,
  notes,
  setNotes,
  screenshotFile,
  setScreenshotFile,
  screenshotPreview,
  setScreenshotPreview,
  cropZoom,
  setCropZoom,
  cropX,
  setCropX,
  cropY,
  setCropY,
  keepScreenshot,
  setKeepScreenshot,
  addTrade,
  isEditing,
  updateTrade,
  cancelEdit,
  clearForm,
  presets,
  selectedPresetId,
  setSelectedPresetId,
  newPresetName,
  setNewPresetName,
  loadPreset,
  saveCurrentAsPreset,
  deletePreset,
}) {
  const [showPresetPanel, setShowPresetPanel] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const normalizedSymbol = useMemo(() => normalizeSymbol(symbol), [symbol]);
  const suggestedPointValue = useMemo(
    () => getSuggestedPointValue(normalizedSymbol),
    [normalizedSymbol]
  );

  const resolvedDisplayPointValue = useMemo(
    () => resolvePointValue(symbol, pointValue),
    [symbol, pointValue]
  );

  const previewProfit = useMemo(
    () =>
      getPreviewProfit({
        symbol,
        direction,
        entry,
        exit,
        contracts,
        pointValue,
        manualPnl,
      }),
    [symbol, direction, entry, exit, contracts, pointValue, manualPnl]
  );

  const previewResult = useMemo(() => getResultFromProfit(previewProfit), [previewProfit]);
  const selectedPreset = presets.find((preset) => preset._id === selectedPresetId);

  const applyScreenshotFile = (file) => {
    setScreenshotFile(file);
    setKeepScreenshot(true);
    setCropZoom(1);
    setCropX(0);
    setCropY(0);

    if (file) {
      setScreenshotPreview(URL.createObjectURL(file));
    } else {
      setScreenshotPreview("");
    }
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files?.[0] || null;
    applyScreenshotFile(file);
  };

  const handleRemoveScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview("");
    setKeepScreenshot(false);
    setCropZoom(1);
    setCropX(0);
    setCropY(0);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);

    const file = e.dataTransfer?.files?.[0] || null;
    if (file && file.type.startsWith("image/")) {
      applyScreenshotFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isDragActive) setIsDragActive(true);
  };

  const uploadCta = screenshotPreview && keepScreenshot ? "Replace Screenshot" : "Choose Screenshot";

  return (
    <div
      style={{
        ...styles.card,
        padding: "clamp(16px, 3vw, 20px)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginBottom: "14px",
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ ...styles.cardTitle, margin: 0 }}>
          {isEditing ? "Edit Trade" : "Add Trade"}
        </h2>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <div
            style={{
              padding: "8px 12px",
              borderRadius: "999px",
              fontSize: "13px",
              fontWeight: "bold",
              ...resultBadgeStyle(previewResult),
            }}
          >
            {previewResult ? previewResult.toUpperCase() : "NO RESULT YET"}
          </div>

          <button
            type="button"
            onClick={clearForm}
            style={{
              background: "var(--app-nav)",
              color: "#ffffff",
              border: "none",
              borderRadius: "999px",
              width: "34px",
              height: "34px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "14px",
              lineHeight: 1,
              display: "grid",
              placeItems: "center",
            }}
            title="Clear form"
          >
            X
          </button>
        </div>
      </div>

      <div
        style={{
          marginBottom: "16px",
          padding: "14px",
          background: "var(--app-card-muted)",
          border: "1px solid var(--app-card-border)",
          borderRadius: "14px",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            color: "var(--app-text-soft)",
            marginBottom: "6px",
            fontWeight: 600,
          }}
        >
          Live Trade Preview
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: "12px", color: "var(--app-text-soft)" }}>Symbol</div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: "var(--app-text)" }}>
              {normalizedSymbol || "--"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "12px", color: "var(--app-text-soft)" }}>Est. PnL</div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                color:
                  previewProfit > 0
                    ? "var(--app-success)"
                    : previewProfit < 0
                    ? "var(--app-danger)"
                    : "var(--app-text)",
              }}
            >
              {formatMoney(previewProfit)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "12px", color: "var(--app-text-soft)" }}>Point Value</div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: "var(--app-text)" }}>
              {resolvedDisplayPointValue || "--"}
            </div>
          </div>
        </div>
      </div>

      <input
        type="text"
        placeholder="Symbol / Instrument (ex: NQ, ES, BTC)"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
        style={styles.input}
      />

      <div style={{ marginBottom: "14px" }}>
        <div style={sectionLabel("Trade Screenshot (for journaling)")}>
          Trade Screenshot (for journaling)
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragActive(false)}
          style={{
            border: isDragActive
              ? "1.5px solid var(--app-primary)"
              : "1.5px dashed var(--app-primary-border)",
            borderRadius: "18px",
            padding: "18px",
            background: isDragActive
              ? "linear-gradient(135deg, var(--app-primary-soft) 0%, var(--app-card-muted) 100%)"
              : "linear-gradient(135deg, var(--app-card) 0%, var(--app-card-muted) 100%)",
            transition: "border-color 140ms ease, background 140ms ease",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleScreenshotChange}
            style={{ display: "none" }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div style={{ flex: "1 1 240px", minWidth: 0 }}>
              <div
                style={{
                  fontSize: "15px",
                  color: "var(--app-text)",
                  fontWeight: 700,
                  marginBottom: "6px",
                }}
              >
                Drag and drop a screenshot here
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--app-text-soft)",
                  lineHeight: 1.6,
                }}
              >
                Upload a trade screenshot to attach it to the journal entry. You can preview it,
                replace it, or fine-tune the crop before saving.
              </div>
              {screenshotFile ? (
                <div
                  style={{
                    marginTop: "10px",
                    fontSize: "13px",
                    color: "var(--app-text)",
                  }}
                >
                  Selected file: <strong>{screenshotFile.name}</strong>
                </div>
              ) : null}
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={styles.primaryButton}
              >
                {uploadCta}
              </button>

              {screenshotPreview && keepScreenshot ? (
                <button type="button" onClick={handleRemoveScreenshot} style={styles.deleteButton}>
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {screenshotPreview && keepScreenshot ? (
          <div
            style={{
              marginTop: "12px",
              border: "1px solid var(--app-card-border)",
              borderRadius: "18px",
              overflow: "hidden",
              background: "var(--app-card)",
              padding: "14px",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "min(54vw, 280px)",
                minHeight: "220px",
                borderRadius: "14px",
                overflow: "hidden",
                position: "relative",
                background: "var(--app-card-muted)",
                marginBottom: "14px",
              }}
            >
              <img
                src={screenshotPreview}
                alt="Trade screenshot preview"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: `translate(calc(-50% + ${cropX}px), calc(-50% + ${cropY}px)) scale(${cropZoom})`,
                  transformOrigin: "center center",
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              <div style={styles.twoCol}>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--app-text-soft)", marginBottom: "6px" }}>
                    Zoom
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="2.5"
                    step="0.05"
                    value={cropZoom}
                    onChange={(e) => setCropZoom(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--app-input-range)" }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: "var(--app-text-soft)", marginBottom: "6px" }}>
                    Move Left / Right
                  </div>
                  <input
                    type="range"
                    min="-160"
                    max="160"
                    step="1"
                    value={cropX}
                    onChange={(e) => setCropX(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--app-input-range)" }}
                  />
                </div>
              </div>

              <div>
                <div style={{ fontSize: "12px", color: "var(--app-text-soft)", marginBottom: "6px" }}>
                  Move Up / Down
                </div>
                <input
                  type="range"
                  min="-160"
                  max="160"
                  step="1"
                  value={cropY}
                  onChange={(e) => setCropY(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--app-input-range)" }}
                />
              </div>

              <div style={styles.buttonRow}>
                <button
                  type="button"
                  onClick={() => {
                    setCropZoom(1);
                    setCropX(0);
                    setCropY(0);
                  }}
                  style={styles.ghostButton}
                >
                  Reset Crop
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={styles.secondaryButton}
                >
                  Replace Screenshot
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ marginBottom: "14px" }}>
        <div style={sectionLabel("Direction")}>Direction</div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setDirection("long")}
            style={{
              ...styles.ghostButton,
              flex: "1 1 160px",
              background: direction === "long" ? "var(--app-success-bg)" : "var(--app-card-muted)",
              color: direction === "long" ? "var(--app-success)" : "var(--app-text)",
              border:
                direction === "long"
                  ? "1px solid var(--app-success-border)"
                  : "1px solid var(--app-card-border)",
            }}
          >
            Long
          </button>

          <button
            type="button"
            onClick={() => setDirection("short")}
            style={{
              ...styles.ghostButton,
              flex: "1 1 160px",
              background: direction === "short" ? "var(--app-danger-bg)" : "var(--app-card-muted)",
              color: direction === "short" ? "var(--app-danger)" : "var(--app-text)",
              border:
                direction === "short"
                  ? "1px solid var(--app-danger-border)"
                  : "1px solid var(--app-card-border)",
            }}
          >
            Short
          </button>
        </div>
      </div>

      <div style={styles.twoCol}>
        <input
          type="number"
          placeholder="Contracts / Size"
          value={contracts}
          onChange={(e) => setContracts(e.target.value)}
          style={styles.input}
        />
        <input
          type="number"
          placeholder={
            suggestedPointValue
              ? `Point Value (suggested: ${suggestedPointValue})`
              : "Point Value (optional)"
          }
          value={pointValue}
          onChange={(e) => setPointValue(e.target.value)}
          style={styles.input}
        />
      </div>

      <div style={styles.twoCol}>
        <input
          type="date"
          value={tradeDate}
          onChange={(e) => setTradeDate(e.target.value)}
          style={styles.input}
        />
        <input
          type="number"
          placeholder="Manual PnL (optional override)"
          value={manualPnl}
          onChange={(e) => setManualPnl(e.target.value)}
          style={styles.input}
        />
      </div>

      <div style={styles.twoCol}>
        <input
          type="number"
          placeholder="Entry"
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          style={styles.input}
        />
        <input
          type="number"
          placeholder="Exit"
          value={exit}
          onChange={(e) => setExit(e.target.value)}
          style={styles.input}
        />
      </div>

      <textarea
        placeholder="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        style={{
          ...styles.textarea,
          minHeight: "110px",
        }}
      />

      <div style={styles.buttonRow}>
        {isEditing ? (
          <>
            <button onClick={updateTrade} style={styles.primaryButton}>
              Save Changes
            </button>
            <button onClick={cancelEdit} style={styles.ghostButton}>
              Cancel
            </button>
          </>
        ) : (
          <button onClick={addTrade} style={styles.primaryButton}>
            Add Trade
          </button>
        )}
      </div>

      <div style={{ marginTop: "16px" }}>
        <button
          type="button"
          onClick={() => setShowPresetPanel(!showPresetPanel)}
          style={styles.ghostButton}
        >
          {showPresetPanel ? "Close Presets" : "Add / Manage Presets"}
        </button>
      </div>

      {showPresetPanel && (
        <div
          style={{
            marginTop: "16px",
            padding: "18px",
            background: "var(--app-card-muted)",
            borderRadius: "16px",
            border: "1px solid var(--app-card-border)",
          }}
        >
          <div
            style={{
              marginBottom: "10px",
              fontSize: "16px",
              fontWeight: "bold",
              color: "var(--app-text)",
            }}
          >
            Presets
          </div>

          <select
            value={selectedPresetId}
            onChange={(e) => setSelectedPresetId(e.target.value)}
            style={styles.input}
          >
            <option value="">Choose preset</option>
            {presets.map((preset) => (
              <option key={preset._id} value={preset._id}>
                {preset.name}
              </option>
            ))}
          </select>

          {selectedPreset && (
            <div
              style={{
                marginTop: "10px",
                marginBottom: "10px",
                padding: "12px",
                borderRadius: "12px",
                background: "var(--app-card)",
                border: "1px solid var(--app-card-border)",
                fontSize: "13px",
                color: "var(--app-text)",
              }}
            >
              Selected preset: <strong>{selectedPreset.name}</strong>
            </div>
          )}

          <div style={styles.buttonRow}>
            <button type="button" onClick={loadPreset} style={styles.secondaryButton}>
              Load Preset
            </button>
            <button type="button" onClick={deletePreset} style={styles.deleteButton}>
              Delete Preset
            </button>
          </div>

          <input
            type="text"
            placeholder="New preset name"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            style={{ ...styles.input, marginTop: "14px", marginBottom: "10px" }}
          />

          <div
            style={{
              fontSize: "13px",
              color: "var(--app-text-soft)",
              marginBottom: "10px",
            }}
          >
            Saves symbol, direction, size, notes, and manual PnL to your account.
          </div>

          <button type="button" onClick={saveCurrentAsPreset} style={styles.primaryButton}>
            Save Current as Preset
          </button>
        </div>
      )}
    </div>
  );
}

export default TradeForm;
