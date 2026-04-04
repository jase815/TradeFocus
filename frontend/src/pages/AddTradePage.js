import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import TradeForm from "../components/TradeForm";
import styles from "../styles";

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
};

function normalizeSymbol(symbol) {
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

function AddTradePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editTradeId = searchParams.get("edit") || "";

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
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchPresets();
  }, []);

  useEffect(() => {
    if (editTradeId) {
      loadTradeForEdit(editTradeId);
    } else {
      setIsEditing(false);
    }
  }, [editTradeId]);

  useEffect(() => {
    const normalized = normalizeSymbol(symbol);
    const config = instrumentConfig[normalized];

    if (config?.pointValue !== undefined && config?.pointValue !== null) {
      setPointValue(String(config.pointValue));
    }
  }, [symbol]);

  const fetchPresets = async () => {
    try {
      const token = localStorage.getItem("token") || "";
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

  const loadTradeForEdit = async (tradeId) => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_BASE}/api/trades`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Could not load trade");
        return;
      }

      const trade = (Array.isArray(data) ? data : []).find((item) => item._id === tradeId);
      if (!trade) {
        setMessage("Trade not found");
        return;
      }

      setIsEditing(true);
      setSymbol(trade.symbol || "");
      setDirection(trade.direction || "long");
      setContracts(String(trade.contracts ?? 1));
      setPointValue(trade.pointValue === null || trade.pointValue === undefined ? "" : String(trade.pointValue));
      setManualPnl(trade.manualPnl === null || trade.manualPnl === undefined ? "" : String(trade.manualPnl));
      setTradeDate(trade.tradeDate || "");
      setEntry(trade.entry === null || trade.entry === undefined ? "" : String(trade.entry));
      setExit(trade.exit === null || trade.exit === undefined ? "" : String(trade.exit));
      setNotes(trade.notes || "");
      setSelectedPresetId(trade.presetId || "");
      setScreenshotFile(null);
      setScreenshotPreview(trade.screenshot ? `${API_BASE}${trade.screenshot}` : "");
      setKeepScreenshot(Boolean(trade.screenshot));
      setCropZoom(1);
      setCropX(0);
      setCropY(0);
      setMessage("Editing trade");
    } catch (error) {
      console.error("load trade error:", error);
      setMessage("Could not load trade for editing");
    }
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
    setSelectedPresetId("");
    setNewPresetName("");
    setIsEditing(false);
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
    setPointValue(preset.pointValue === null || preset.pointValue === undefined ? "" : String(preset.pointValue));
    setMessage(`Loaded preset: ${preset.name}`);
  };

  const saveCurrentAsPreset = async () => {
    try {
      const token = localStorage.getItem("token") || "";
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
      const token = localStorage.getItem("token") || "";
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

  const buildTradeFormData = async () => {
    const selectedPreset = presets.find((p) => p._id === selectedPresetId) || null;
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
      const token = localStorage.getItem("token") || "";
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
        navigate("/journal");
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
      const token = localStorage.getItem("token") || "";
      const formData = await buildTradeFormData();
      const res = await fetch(`${API_BASE}/api/trades/${editTradeId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setMessage("Trade updated");
        navigate("/journal");
      } else {
        setMessage(data.message || "Update failed");
      }
    } catch (error) {
      console.error("update trade error:", error);
      setMessage("Update crashed");
    }
  };

  const cancelEdit = () => {
    navigate("/journal");
  };

  const messageTone =
    message.toLowerCase().includes("failed") || message.toLowerCase().includes("could not")
      ? "var(--app-danger)"
      : "var(--app-text)";

  return (
    <AppShell
      title={isEditing ? "Edit Trade" : "Add Trade"}
      subtitle="Log a trade manually, attach screenshots, and crop them before saving."
    >
      {message ? (
        <div style={{ ...styles.card, marginBottom: "20px", color: messageTone }}>{message}</div>
      ) : null}

      <div style={{ maxWidth: "820px", width: "100%" }}>
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
          isEditing={isEditing}
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
      </div>
    </AppShell>
  );
}

export default AddTradePage;
