import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";

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

function JournalPage() {
  const navigate = useNavigate();
  const [trades, setTrades] = useState([]);
  const [message, setMessage] = useState("");
  const [deletingTradeId, setDeletingTradeId] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_BASE}/api/trades`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        const sorted = [...(Array.isArray(data) ? data : [])].sort((a, b) => {
          const aDate = new Date(a.tradeDate || a.createdAt || 0).getTime();
          const bDate = new Date(b.tradeDate || b.createdAt || 0).getTime();
          return bDate - aDate;
        });
        setTrades(sorted);
      } else {
        setMessage(data.message || "Could not load journal");
      }
    } catch (error) {
      console.error("fetch journal error:", error);
      setMessage("Journal request crashed");
    }
  };

  const deleteTrade = async (tradeId) => {
    try {
      const token = localStorage.getItem("token") || "";
      setDeletingTradeId(tradeId);

      const res = await fetch(`${API_BASE}/api/trades/${tradeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(data.message || "Trade deleted");
        setTrades((prev) => prev.filter((trade) => trade._id !== tradeId));
      } else {
        setMessage(data.message || "Could not delete trade");
      }
    } catch (error) {
      console.error("delete trade error:", error);
      setMessage("Delete trade crashed");
    } finally {
      setDeletingTradeId("");
    }
  };

  const journalTrades = useMemo(() => {
    const filtered = [...trades];
    if (filter === "wins") return filtered.filter((trade) => calculateTradePnl(trade) > 0);
    if (filter === "losses") return filtered.filter((trade) => calculateTradePnl(trade) < 0);
    if (filter === "long") return filtered.filter((trade) => String(trade.direction || "").toLowerCase() === "long");
    if (filter === "short") return filtered.filter((trade) => String(trade.direction || "").toLowerCase() === "short");
    return filtered;
  }, [trades, filter]);

  const filterButtonStyle = (value) => ({
    border: "none",
    borderRadius: "999px",
    padding: "10px 14px",
    background: filter === value ? "var(--app-nav)" : "var(--app-card-muted)",
    color: filter === value ? "#ffffff" : "var(--app-text)",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "13px",
    borderColor: "var(--app-card-border)",
  });

  return (
    <AppShell title="Journal" subtitle="All of your trades in one place, newest first.">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
        <div style={{ color: "var(--app-text-soft)", fontSize: "14px" }}>
          Review, edit, filter, and manage your trade history.
        </div>

        <button
          type="button"
          onClick={() => navigate("/add-trade")}
          style={{
            border: "none",
            borderRadius: "14px",
            padding: "12px 16px",
            background: "linear-gradient(135deg, var(--app-primary) 0%, var(--app-primary-hover) 100%)",
            color: "#ffffff",
            fontWeight: "bold",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
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

      {message ? (
        <div style={{ background: "var(--app-card)", borderRadius: "18px", padding: "14px 18px", boxShadow: "var(--app-shadow-soft)", marginBottom: "20px", color: message.toLowerCase().includes("could not") || message.toLowerCase().includes("crashed") ? "var(--app-danger)" : "var(--app-text)" }}>
          {message}
        </div>
      ) : null}

      {journalTrades.length === 0 ? (
        <div style={{ background: "var(--app-card)", borderRadius: "22px", padding: "28px", boxShadow: "var(--app-shadow-soft)", color: "var(--app-text-soft)", textAlign: "center" }}>
          No trades found for this filter.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {journalTrades.map((trade) => {
            const pnl = calculateTradePnl(trade);

            return (
              <div key={trade._id} style={{ background: "linear-gradient(180deg, var(--app-card) 0%, var(--app-card-muted) 100%)", borderRadius: "22px", padding: "20px", boxShadow: "var(--app-shadow-card)", border: "1px solid var(--app-card-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontSize: "20px", fontWeight: "bold", color: "var(--app-text)", marginBottom: "4px" }}>
                      {trade.symbol || "Trade"} • {(trade.direction || "").toUpperCase()}
                    </div>
                    <div style={{ color: "var(--app-text-soft)", fontSize: "14px" }}>
                      {trade.tradeDate || "No date"} {trade.presetName ? `• ${trade.presetName}` : ""}
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

                {trade.screenshot ? (
                  <div style={{ marginBottom: "14px", borderRadius: "14px", overflow: "hidden", border: "1px solid var(--app-card-border)" }}>
                    <img
                      src={`${API_BASE}${trade.screenshot}`}
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
                  <button type="button" onClick={() => navigate(`/add-trade?edit=${trade._id}`)} style={{ border: "none", borderRadius: "12px", padding: "10px 14px", background: "var(--app-nav)", color: "#ffffff", fontWeight: "bold", cursor: "pointer" }}>
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
      )}
    </AppShell>
  );
}

export default JournalPage;
