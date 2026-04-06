import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import StatusBanner from "../components/StatusBanner";
import { API_URL } from "../config";
import usePremiumAccess from "../hooks/usePremiumAccess";
import styles from "../styles";
import handleUpgradeToPro from "../utils/handleUpgradeToPro";
import { getFriendlyErrorMessage, readResponsePayload } from "../utils/apiFeedback";

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

const INITIAL_VISIBLE_TRADES = 8;
const LOAD_MORE_STEP = 8;

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

function toNumber(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
}

function calculateTradePnl(trade) {
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

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDateLabel(value) {
  if (!value) return "No date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function inputStyle() {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "14px",
    border: "1px solid var(--app-input-border)",
    background: "var(--app-input-bg)",
    color: "var(--app-text)",
    boxSizing: "border-box",
    fontSize: "14px",
  };
}

function cardStyle() {
  return {
    background: "linear-gradient(180deg, var(--app-card) 0%, var(--app-card-muted) 100%)",
    borderRadius: "22px",
    padding: "20px",
    boxShadow: "var(--app-shadow-card)",
    border: "1px solid var(--app-card-border)",
  };
}

function JournalPage() {
  const navigate = useNavigate();
  const { isPremium, loading: premiumLoading } = usePremiumAccess();
  const [trades, setTrades] = useState([]);
  const [folders, setFolders] = useState([]);
  const [status, setStatus] = useState({ tone: "info", title: "", message: "" });
  const [loading, setLoading] = useState(true);
  const [deletingTradeId, setDeletingTradeId] = useState("");
  const [filter, setFilter] = useState("all");
  const [visibleTrades, setVisibleTrades] = useState(INITIAL_VISIBLE_TRADES);
  const [activeFolderId, setActiveFolderId] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderNotes, setNewFolderNotes] = useState("");
  const [folderEditorName, setFolderEditorName] = useState("");
  const [folderEditorNotes, setFolderEditorNotes] = useState("");
  const [savingFolder, setSavingFolder] = useState(false);
  const [deletingFolderId, setDeletingFolderId] = useState("");
  const [assigningTradeId, setAssigningTradeId] = useState("");
  const [foldersExpanded, setFoldersExpanded] = useState(false);

  useEffect(() => {
    fetchTrades();
  }, []);

  useEffect(() => {
    if (!premiumLoading && isPremium) {
      fetchFolders();
    }

    if (!premiumLoading && !isPremium) {
      setFolders([]);
      setActiveFolderId("");
      setFoldersExpanded(false);
    }
  }, [isPremium, premiumLoading]);

  useEffect(() => {
    const folder = folders.find((item) => item._id === activeFolderId);
    setFolderEditorName(folder?.name || "");
    setFolderEditorNotes(folder?.notes || "");
  }, [activeFolderId, folders]);

  async function fetchTrades() {
    try {
      setLoading(true);
      setStatus({ tone: "info", title: "Loading Journal", message: "Pulling in your latest trades." });
      const token = localStorage.getItem("token") || "";
      const tradeRes = await fetch(`${API_URL}/api/trades`, { headers: { Authorization: `Bearer ${token}` } });
      const tradeData = await readResponsePayload(tradeRes);

      if (!tradeRes.ok) {
        setStatus({
          tone: "error",
          title: "Could Not Load Journal",
          message: getFriendlyErrorMessage({ response: tradeRes, data: tradeData, fallback: "We could not load your journal right now.", context: "Journal" }),
        });
        return;
      }

      const sortedTrades = [...(Array.isArray(tradeData) ? tradeData : [])].sort((a, b) => {
        const aDate = new Date(a.tradeDate || a.createdAt || 0).getTime();
        const bDate = new Date(b.tradeDate || b.createdAt || 0).getTime();
        return bDate - aDate;
      });

      setTrades(sortedTrades);
      setStatus({ tone: "success", title: "Journal Ready", message: "Your trade history is loaded." });
    } catch (error) {
      setStatus({
        tone: "error",
        title: "Connection Problem",
        message: getFriendlyErrorMessage({ error, fallback: "We could not load your journal right now.", context: "Journal" }),
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchFolders() {
    try {
      const token = localStorage.getItem("token") || "";
      const folderRes = await fetch(`${API_URL}/api/folders`, { headers: { Authorization: `Bearer ${token}` } });
      const folderData = await readResponsePayload(folderRes);

      if (folderRes.ok) {
        setFolders(Array.isArray(folderData) ? folderData : []);
        return;
      }

      if (folderRes.status !== 403) {
        setStatus({
          tone: "error",
          title: "Could Not Load Folders",
          message: getFriendlyErrorMessage({ response: folderRes, data: folderData, fallback: "We could not load your journal folders right now.", context: "Folder" }),
        });
      }
    } catch (error) {
      setStatus({
        tone: "error",
        title: "Could Not Load Folders",
        message: getFriendlyErrorMessage({ error, fallback: "We could not load your journal folders right now.", context: "Folder" }),
      });
    }
  }

  async function createFolder() {
    try {
      if (!newFolderName.trim()) {
        setStatus({ tone: "warning", title: "Folder Name Required", message: "Enter a folder name before creating it." });
        return;
      }
      setSavingFolder(true);
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_URL}/api/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newFolderName, notes: newFolderNotes }),
      });
      const data = await readResponsePayload(res);
      if (res.ok) {
        setFolders((prev) => [data, ...prev]);
        setNewFolderName("");
        setNewFolderNotes("");
        setActiveFolderId(data._id);
        setStatus({ tone: "success", title: "Folder Created", message: `${data.name} is ready for your journal notes and trade grouping.` });
      } else {
        setStatus({
          tone: "error",
          title: "Could Not Create Folder",
          message: getFriendlyErrorMessage({ response: res, data, fallback: "We could not create that folder right now.", context: "Folder" }),
        });
      }
    } catch (error) {
      setStatus({
        tone: "error",
        title: "Could Not Create Folder",
        message: getFriendlyErrorMessage({ error, fallback: "We could not create that folder right now.", context: "Folder" }),
      });
    } finally {
      setSavingFolder(false);
    }
  }

  async function saveActiveFolder() {
    try {
      if (!activeFolderId) return;
      if (!folderEditorName.trim()) {
        setStatus({ tone: "warning", title: "Folder Name Required", message: "Folder name cannot be empty." });
        return;
      }
      setSavingFolder(true);
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_URL}/api/folders/${activeFolderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: folderEditorName, notes: folderEditorNotes }),
      });
      const data = await readResponsePayload(res);
      if (res.ok) {
        setFolders((prev) => prev.map((folder) => (folder._id === data._id ? data : folder)));
        setStatus({ tone: "success", title: "Folder Saved", message: "Your journal folder notes have been updated." });
      } else {
        setStatus({
          tone: "error",
          title: "Could Not Save Folder",
          message: getFriendlyErrorMessage({ response: res, data, fallback: "We could not save that folder right now.", context: "Folder" }),
        });
      }
    } catch (error) {
      setStatus({
        tone: "error",
        title: "Could Not Save Folder",
        message: getFriendlyErrorMessage({ error, fallback: "We could not save that folder right now.", context: "Folder" }),
      });
    } finally {
      setSavingFolder(false);
    }
  }

  async function deleteFolder(folderId) {
    try {
      setDeletingFolderId(folderId);
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_URL}/api/folders/${folderId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readResponsePayload(res);
      if (res.ok) {
        setFolders((prev) => prev.filter((folder) => folder._id !== folderId));
        setTrades((prev) => prev.map((trade) => (trade.folderId === folderId ? { ...trade, folderId: "" } : trade)));
        if (activeFolderId === folderId) setActiveFolderId("");
        setStatus({ tone: "success", title: "Folder Deleted", message: data.message || "The folder was removed from your journal." });
      } else {
        setStatus({
          tone: "error",
          title: "Could Not Delete Folder",
          message: getFriendlyErrorMessage({ response: res, data, fallback: "We could not delete that folder right now.", context: "Folder" }),
        });
      }
    } catch (error) {
      setStatus({
        tone: "error",
        title: "Could Not Delete Folder",
        message: getFriendlyErrorMessage({ error, fallback: "We could not delete that folder right now.", context: "Folder" }),
      });
    } finally {
      setDeletingFolderId("");
    }
  }

  async function updateTradeFolder(tradeId, folderId) {
    try {
      setAssigningTradeId(tradeId);
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_URL}/api/trades/${tradeId}/folder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ folderId }),
      });
      const data = await readResponsePayload(res);
      if (res.ok) {
        setTrades((prev) => prev.map((trade) => (trade._id === tradeId ? data : trade)));
      } else {
        setStatus({
          tone: "error",
          title: "Could Not Assign Folder",
          message: getFriendlyErrorMessage({ response: res, data, fallback: "We could not update that trade folder right now.", context: "Folder" }),
        });
      }
    } catch (error) {
      setStatus({
        tone: "error",
        title: "Could Not Assign Folder",
        message: getFriendlyErrorMessage({ error, fallback: "We could not update that trade folder right now.", context: "Folder" }),
      });
    } finally {
      setAssigningTradeId("");
    }
  }

  async function deleteTrade(tradeId) {
    try {
      const token = localStorage.getItem("token") || "";
      setDeletingTradeId(tradeId);
      const res = await fetch(`${API_URL}/api/trades/${tradeId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await readResponsePayload(res);
      if (res.ok) {
        setTrades((prev) => prev.filter((trade) => trade._id !== tradeId));
        setStatus({ tone: "success", title: "Trade Deleted", message: data.message || "The trade has been removed from your journal." });
      } else {
        setStatus({
          tone: "error",
          title: "Delete Failed",
          message: getFriendlyErrorMessage({ response: res, data, fallback: "We could not delete that trade.", context: "Trade" }),
        });
      }
    } catch (error) {
      setStatus({
        tone: "error",
        title: "Delete Failed",
        message: getFriendlyErrorMessage({ error, fallback: "We could not delete that trade.", context: "Trade" }),
      });
    } finally {
      setDeletingTradeId("");
    }
  }

  const folderTradeCounts = useMemo(() => {
    const counts = {};
    trades.forEach((trade) => {
      if (trade.folderId) counts[trade.folderId] = (counts[trade.folderId] || 0) + 1;
    });
    return counts;
  }, [trades]);

  const journalTrades = useMemo(() => {
    let filtered = [...trades];
    if (isPremium && activeFolderId) filtered = filtered.filter((trade) => trade.folderId === activeFolderId);
    if (filter === "wins") return filtered.filter((trade) => calculateTradePnl(trade) > 0);
    if (filter === "losses") return filtered.filter((trade) => calculateTradePnl(trade) < 0);
    if (filter === "long") return filtered.filter((trade) => String(trade.direction || "").toLowerCase() === "long");
    if (filter === "short") return filtered.filter((trade) => String(trade.direction || "").toLowerCase() === "short");
    return filtered;
  }, [trades, filter, activeFolderId, isPremium]);

  useEffect(() => {
    setVisibleTrades(INITIAL_VISIBLE_TRADES);
  }, [filter, trades.length, activeFolderId]);

  const displayedTrades = useMemo(() => journalTrades.slice(0, visibleTrades), [journalTrades, visibleTrades]);
  const activeFolder = folders.find((folder) => folder._id === activeFolderId) || null;

  const filterButtonStyle = (value) => ({
    border: "none",
    borderRadius: "999px",
    padding: "10px 14px",
    background: filter === value ? "var(--app-nav)" : "var(--app-card-muted)",
    color: filter === value ? "#ffffff" : "var(--app-text)",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "13px",
  });

  return (
    <AppShell title="Journal" subtitle="Group trades into folders, write notes, and review your history in one place.">
      <div style={{ marginBottom: "16px" }}>
        <StatusBanner tone={status.message ? status.tone : "info"} title={status.title || "Journal"} message={status.message || "Review, group, and reflect on your trade history from one clean feed."} />
      </div>

      {premiumLoading ? (
        <div style={{ ...cardStyle(), marginBottom: "20px", color: "var(--app-text-soft)" }}>
          Checking Pro folder access...
        </div>
      ) : isPremium ? (
      <div style={{ ...cardStyle(), marginBottom: "20px", padding: 0, overflow: "hidden" }}>
        <button
          type="button"
          onClick={() => setFoldersExpanded((prev) => !prev)}
          style={{
            width: "100%",
            border: "none",
            background: "transparent",
            color: "var(--app-text)",
            cursor: "pointer",
            padding: "18px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            textAlign: "left",
          }}
        >
          <div>
            <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "4px" }}>
              Journal Folders ({folders.length})
            </div>
            <div style={{ color: "var(--app-text-soft)", fontSize: "13px" }}>
              Group trades by week, setup, or theme and keep reflection notes in one place.
            </div>
          </div>
          <div
            style={{
              minWidth: "34px",
              height: "34px",
              borderRadius: "10px",
              display: "grid",
              placeItems: "center",
              background: "var(--app-primary-soft)",
              border: "1px solid var(--app-primary-border)",
              color: "var(--app-chip-text)",
              fontSize: "18px",
              fontWeight: 800,
              transition: "transform 160ms ease",
              transform: foldersExpanded ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            v
          </div>
        </button>

        {foldersExpanded ? (
          <div
            style={{
              padding: "0 20px 20px",
              borderTop: "1px solid var(--app-card-border)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
              gap: "18px",
            }}
          >
            <div style={{ paddingTop: "18px" }}>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--app-text)", marginBottom: "14px" }}>Create Folder</div>
              <input type="text" placeholder='Folder name (ex: "Week 1 Review")' value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} style={{ ...inputStyle(), marginBottom: "12px" }} />
              <textarea placeholder="Optional weekly notes or reflection prompt" value={newFolderNotes} onChange={(e) => setNewFolderNotes(e.target.value)} style={{ ...inputStyle(), minHeight: "110px", resize: "vertical", marginBottom: "12px" }} />
              <button type="button" onClick={createFolder} disabled={savingFolder} style={{ border: "none", borderRadius: "14px", padding: "12px 16px", background: "linear-gradient(135deg, var(--app-primary) 0%, var(--app-primary-hover) 100%)", color: "#ffffff", fontWeight: "bold", cursor: "pointer" }}>
                {savingFolder ? "Creating..." : "Create Folder"}
              </button>
            </div>

            <div style={{ paddingTop: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--app-text)" }}>Folder List</div>
                <button type="button" onClick={() => setActiveFolderId("")} style={{ border: "1px solid var(--app-primary-border)", borderRadius: "999px", padding: "8px 12px", background: activeFolderId ? "var(--app-primary-soft)" : "var(--app-nav)", color: activeFolderId ? "var(--app-chip-text)" : "#ffffff", fontWeight: "bold", cursor: "pointer" }}>
                  All Trades
                </button>
              </div>

              {folders.length === 0 ? (
                <div style={{ padding: "18px", borderRadius: "16px", background: "var(--app-card-muted)", border: "1px dashed var(--app-input-border)", color: "var(--app-text-soft)", textAlign: "center" }}>
                  Create your first folder to group trades by week, setup, or theme.
                </div>
              ) : (
                <div style={{ display: "grid", gap: "10px" }}>
                  {folders.map((folder) => {
                    const isActive = activeFolderId === folder._id;
                    return (
                      <button key={folder._id} type="button" onClick={() => setActiveFolderId((prev) => (prev === folder._id ? "" : folder._id))} style={{ textAlign: "left", border: isActive ? "1px solid var(--app-primary)" : "1px solid var(--app-card-border)", borderRadius: "16px", padding: "14px", background: isActive ? "linear-gradient(135deg, var(--app-primary-soft) 0%, var(--app-card-muted) 100%)" : "linear-gradient(180deg, var(--app-card) 0%, var(--app-card-muted) 100%)", color: "var(--app-text)", cursor: "pointer" }}>
                        <div style={{ fontWeight: 800, marginBottom: "4px" }}>{folder.name}</div>
                        <div style={{ color: "var(--app-text-soft)", fontSize: "13px" }}>
                          {folderTradeCounts[folder._id] || 0} trade{folderTradeCounts[folder._id] === 1 ? "" : "s"} | {formatDateLabel(folder.createdAt)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
      ) : (
        <div style={{ ...styles.lockedCard, marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--app-text)", marginBottom: "6px" }}>Pro Journaling Folders</div>
              <div style={{ color: "var(--app-text-soft)", fontSize: "14px", lineHeight: 1.6 }}>
                Group trades into folders, organize weekly reviews, and save notes for each trading period.
              </div>
            </div>
            <button type="button" onClick={handleUpgradeToPro} style={styles.primaryButton}>
              Upgrade to Pro
            </button>
          </div>
        </div>
      )}

      {isPremium && activeFolder ? (
        <div style={{ ...cardStyle(), marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
            <div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--app-text)", marginBottom: "4px" }}>{activeFolder.name}</div>
              <div style={{ color: "var(--app-text-soft)", fontSize: "14px" }}>Folder notes and reflection for this group of trades.</div>
            </div>
            <button type="button" onClick={() => deleteFolder(activeFolder._id)} disabled={deletingFolderId === activeFolder._id} style={{ border: "none", borderRadius: "12px", padding: "10px 14px", background: "var(--app-danger)", color: "#ffffff", fontWeight: "bold", cursor: "pointer", opacity: deletingFolderId === activeFolder._id ? 0.7 : 1 }}>
              {deletingFolderId === activeFolder._id ? "Deleting..." : "Delete Folder"}
            </button>
          </div>

          <input type="text" value={folderEditorName} onChange={(e) => setFolderEditorName(e.target.value)} placeholder="Folder name" style={{ ...inputStyle(), marginBottom: "12px" }} />
          <textarea value={folderEditorNotes} onChange={(e) => setFolderEditorNotes(e.target.value)} placeholder="Write weekly notes, lessons, or observations for this folder." style={{ ...inputStyle(), minHeight: "120px", resize: "vertical", marginBottom: "12px" }} />
          <button type="button" onClick={saveActiveFolder} disabled={savingFolder} style={{ border: "none", borderRadius: "14px", padding: "12px 16px", background: "var(--app-nav)", color: "#ffffff", fontWeight: "bold", cursor: "pointer" }}>
            {savingFolder ? "Saving..." : "Save Folder Notes"}
          </button>
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
        <div style={{ color: "var(--app-text-soft)", fontSize: "14px" }}>
          {isPremium
            ? "Filter trades, assign them to folders, and review grouped weeks or setups."
            : "Filter trades and review your journal history in one feed."}
        </div>

        <button type="button" onClick={() => navigate("/add-trade")} style={{ border: "none", borderRadius: "14px", padding: "12px 16px", background: "linear-gradient(135deg, var(--app-primary) 0%, var(--app-primary-hover) 100%)", color: "#ffffff", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "18px", lineHeight: 1 }}>+</span>
          Add Trade
        </button>
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
        <button type="button" onClick={() => setFilter("all")} style={filterButtonStyle("all")}>All</button>
        <button type="button" onClick={() => setFilter("wins")} style={filterButtonStyle("wins")}>Wins</button>
        <button type="button" onClick={() => setFilter("losses")} style={filterButtonStyle("losses")}>Losses</button>
        <button type="button" onClick={() => setFilter("long")} style={filterButtonStyle("long")}>Long</button>
        <button type="button" onClick={() => setFilter("short")} style={filterButtonStyle("short")}>Short</button>
      </div>

      {loading ? (
        <StatusBanner tone="info" title="Loading" message="Building your journal feed." compact />
      ) : null}

      {journalTrades.length === 0 ? (
        <div style={{ ...cardStyle(), color: "var(--app-text-soft)", textAlign: "center" }}>
          {activeFolder
            ? "No trades are assigned to this folder yet."
            : "No trades found for this filter yet."}
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gap: "16px" }}>
            {displayedTrades.map((trade) => {
              const pnl = calculateTradePnl(trade);

              return (
                <div key={trade._id} style={cardStyle()}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
                    <div>
                      <div style={{ fontSize: "20px", fontWeight: "bold", color: "var(--app-text)", marginBottom: "4px" }}>
                        {trade.symbol || "Trade"} | {(trade.direction || "").toUpperCase()}
                      </div>
                      <div style={{ color: "var(--app-text-soft)", fontSize: "14px" }}>
                        {formatDateLabel(trade.tradeDate || trade.createdAt)}
                        {trade.imported && trade.importSource ? ` | Imported from ${trade.importSource}` : ""}
                      </div>
                    </div>

                    <div
                      style={{
                        alignSelf: "flex-start",
                        borderRadius: "999px",
                        padding: "8px 12px",
                        fontWeight: "bold",
                        fontSize: "14px",
                        background: pnl >= 0 ? "var(--app-success-bg)" : "var(--app-danger-bg)",
                        color: pnl >= 0 ? "var(--app-success)" : "var(--app-danger)",
                      }}
                    >
                      {formatMoney(pnl)}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "18px", flexWrap: "wrap", color: "var(--app-text)", fontSize: "14px", marginBottom: "14px" }}>
                    <span>Entry: {trade.entry ?? "--"}</span>
                    <span>Exit: {trade.exit ?? "--"}</span>
                    <span>Contracts: {trade.contracts ?? "--"}</span>
                    <span>Point Value: {trade.pointValue ?? "--"}</span>
                  </div>

                  {isPremium ? (
                    <div style={{ marginBottom: "14px" }}>
                      <div style={{ color: "var(--app-text-soft)", fontSize: "13px", marginBottom: "8px", fontWeight: 700 }}>
                        Add to Folder
                      </div>
                      <select
                        value={trade.folderId || ""}
                        onChange={(e) => updateTradeFolder(trade._id, e.target.value)}
                        disabled={assigningTradeId === trade._id}
                        style={inputStyle()}
                      >
                        <option value="">No Folder</option>
                        {folders.map((folder) => (
                          <option key={folder._id} value={folder._id}>
                            {folder.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  {trade.screenshot ? (
                    <div style={{ marginBottom: "14px", borderRadius: "14px", overflow: "hidden", border: "1px solid var(--app-card-border)" }}>
                      <img
                        src={`${API_URL}${trade.screenshot}`}
                        alt="Trade screenshot"
                        style={{ width: "100%", maxHeight: "320px", objectFit: "cover", display: "block" }}
                      />
                    </div>
                  ) : null}

                  {trade.notes ? (
                    <div style={{ color: "var(--app-text)", fontSize: "14px", whiteSpace: "pre-wrap", marginBottom: "14px" }}>
                      {trade.notes}
                    </div>
                  ) : null}

                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => navigate(`/add-trade?edit=${trade._id}`)}
                      style={{ border: "none", borderRadius: "12px", padding: "10px 14px", background: "var(--app-nav)", color: "#ffffff", fontWeight: "bold", cursor: "pointer" }}
                    >
                      Edit Trade
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteTrade(trade._id)}
                      disabled={deletingTradeId === trade._id}
                      style={{
                        border: "none",
                        borderRadius: "12px",
                        padding: "10px 14px",
                        background: "var(--app-danger)",
                        color: "#ffffff",
                        fontWeight: "bold",
                        cursor: "pointer",
                        opacity: deletingTradeId === trade._id ? 0.7 : 1,
                      }}
                    >
                      {deletingTradeId === trade._id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {journalTrades.length > displayedTrades.length ? (
            <div style={{ marginTop: "18px", display: "flex", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => setVisibleTrades((prev) => prev + LOAD_MORE_STEP)}
                style={{
                  border: "1px solid var(--app-primary-border)",
                  borderRadius: "12px",
                  padding: "10px 16px",
                  background: "var(--app-primary-soft)",
                  color: "var(--app-chip-text)",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Load More
              </button>
            </div>
          ) : null}
        </>
      )}
    </AppShell>
  );
}

export default JournalPage;
