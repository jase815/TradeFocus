import React, { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import StatusBanner from "../components/StatusBanner";
import { API_URL } from "../config";
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

function formatTradeDateLabel(dateString) {
  if (!dateString) return "No date";
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return dateString;

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeDateKey(dateString, fallbackCreatedAt) {
  const source = dateString || fallbackCreatedAt;
  if (!source) return "";
  const parsed = new Date(source);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function DonutCard({ title, centerLabel, centerValue, segments, footer }) {
  const gradient = useMemo(() => {
    const total = segments.reduce((sum, item) => sum + item.value, 0);
    if (!total) return "conic-gradient(var(--app-input-border) 0deg 360deg)";

    let current = 0;
    const parts = segments.map((item) => {
      const start = current;
      const degrees = (item.value / total) * 360;
      current += degrees;
      return `${item.color} ${start}deg ${current}deg`;
    });

    return `conic-gradient(${parts.join(", ")})`;
  }, [segments]);

  const glow = useMemo(() => {
    const activeColors = segments.filter((item) => item.value > 0).map((item) => item.color);
    if (!activeColors.length) return "0 0 0 rgba(0,0,0,0)";

    const outer = activeColors
      .slice(0, 2)
      .map((color, index) => `${index === 0 ? 0 : 10}px ${index === 0 ? 18 : 0}px 34px ${color}33`)
      .join(", ");

    return `${outer}, inset 0 0 0 1px rgba(255,255,255,0.08)`;
  }, [segments]);

  return (
    <div
      className="charts-donut-card"
      style={{
        background: "linear-gradient(180deg, var(--app-card) 0%, var(--app-card-muted) 100%)",
        borderRadius: "24px",
        padding: "clamp(18px, 3vw, 22px)",
        boxShadow: "var(--app-shadow-card)",
        border: "1px solid var(--app-card-border)",
      }}
    >
      <div style={{ fontSize: "18px", fontWeight: "bold", color: "var(--app-text)", marginBottom: "18px" }}>
        {title}
      </div>

      <div className="charts-donut-layout" style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
        <div
          className="charts-donut-visual"
          style={{
            width: "min(180px, 46vw)",
            height: "min(180px, 46vw)",
            minWidth: "160px",
            minHeight: "160px",
            borderRadius: "50%",
            background: gradient,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            boxShadow: glow,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "-12px",
              borderRadius: "50%",
              background: gradient,
              filter: "blur(18px)",
              opacity: 0.24,
              zIndex: 0,
            }}
          />

          <div
            className="charts-donut-center"
            style={{
              width: "60%",
              height: "60%",
              borderRadius: "50%",
              background: "var(--app-card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              textAlign: "center",
              padding: "8px",
              boxSizing: "border-box",
              boxShadow: "var(--app-shadow-soft)",
              zIndex: 1,
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--app-text-soft)", marginBottom: "4px" }}>
              {centerLabel}
            </div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "var(--app-text)", lineHeight: 1.1 }}>
              {centerValue}
            </div>
          </div>
        </div>

        <div className="charts-donut-legend" style={{ flex: 1, minWidth: "220px" }}>
          {segments.map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                marginBottom: "12px",
                fontSize: "14px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--app-text)" }}>
                <span
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "999px",
                    background: item.color,
                    display: "inline-block",
                    boxShadow: `0 0 16px ${item.color}55`,
                  }}
                />
                {item.label}
              </div>
              <div style={{ fontWeight: "bold", color: "var(--app-text)" }}>{item.display}</div>
            </div>
          ))}

          {footer ? (
            <div
              style={{
                marginTop: "14px",
                paddingTop: "14px",
                borderTop: "1px solid var(--app-card-border)",
                color: "var(--app-text-soft)",
                fontSize: "13px",
              }}
            >
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, valueColor = "var(--app-text)", subtext = "", icon = "ST", accent = "var(--app-primary)", accentBg = "var(--app-primary-soft)" }) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(180deg, var(--app-card) 0%, var(--app-card-muted) 100%)",
        borderRadius: "22px",
        padding: "clamp(18px, 3vw, 22px)",
        boxShadow: "var(--app-shadow-card)",
        border: "1px solid var(--app-card-border)",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "6px", background: accent }} />

      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: "var(--app-text-soft)", fontSize: "14px", marginBottom: "8px" }}>{label}</div>
          <div style={{ fontSize: "clamp(24px, 5vw, 30px)", fontWeight: "bold", color: valueColor }}>{value}</div>
          {subtext ? (
            <div style={{ marginTop: "8px", color: "var(--app-text-soft)", fontSize: "13px" }}>{subtext}</div>
          ) : null}
        </div>

        <div
          style={{
            minWidth: "44px",
            height: "44px",
            borderRadius: "14px",
            background: accentBg,
            color: accent,
            display: "grid",
            placeItems: "center",
            fontSize: "20px",
            fontWeight: "bold",
            boxShadow: `0 0 24px ${accent}22`,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function ChartsPage() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ tone: "info", title: "", message: "" });

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      setStatus({
        tone: "info",
        title: "Loading Charts",
        message: "Pulling in your latest performance data.",
      });
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_URL}/api/trades`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readResponsePayload(res);

      if (res.ok) {
        setTrades(Array.isArray(data) ? data : []);
        setStatus({
          tone: "success",
          title: "Charts Ready",
          message: "Your latest stats and performance breakdowns are loaded.",
        });
      } else {
        setStatus({
          tone: "error",
          title: "Could Not Load Charts",
          message: getFriendlyErrorMessage({
            response: res,
            data,
            fallback: "We could not load your chart data right now.",
            context: "Charts",
          }),
        });
      }
    } catch (error) {
      console.error("fetch trades error:", error);
      setStatus({
        tone: "error",
        title: "Connection Problem",
        message: getFriendlyErrorMessage({
          error,
          fallback: "We could not load your chart data right now.",
          context: "Charts",
        }),
      });
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const pnls = trades.map(calculateTradePnl);
    const totalPnL = pnls.reduce((sum, value) => sum + value, 0);
    const grossProfit = pnls.filter((x) => x > 0).reduce((a, b) => a + b, 0);
    const grossLoss = Math.abs(pnls.filter((x) => x < 0).reduce((a, b) => a + b, 0));
    const wins = pnls.filter((x) => x > 0).length;
    const losses = pnls.filter((x) => x < 0).length;
    const breakeven = pnls.filter((x) => x === 0).length;
    const totalTrades = trades.length;
    const winRate = totalTrades ? ((wins / totalTrades) * 100).toFixed(1) : "0.0";
    const lossRate = totalTrades ? ((losses / totalTrades) * 100).toFixed(1) : "0.0";

    const dailyMap = {};
    trades.forEach((trade) => {
      const key = normalizeDateKey(trade.tradeDate, trade.createdAt);
      if (!key) return;

      if (!dailyMap[key]) {
        dailyMap[key] = { date: key, pnl: 0, tradeCount: 0 };
      }

      dailyMap[key].pnl += calculateTradePnl(trade);
      dailyMap[key].tradeCount += 1;
    });

    const dailyStats = Object.values(dailyMap).sort((a, b) => a.pnl - b.pnl);

    return {
      totalPnL,
      grossProfit,
      grossLoss,
      wins,
      losses,
      breakeven,
      totalTrades,
      winRate,
      lossRate,
      leastProfitableDay: dailyStats.length ? dailyStats[0] : null,
      mostProfitableDay: dailyStats.length ? dailyStats[dailyStats.length - 1] : null,
    };
  }, [trades]);

  const recentTrades = useMemo(() => [...trades].slice(0, 6), [trades]);

  return (
    <AppShell title="Charts" subtitle="Your performance hub with quick visual breakdowns.">
      <div style={{ marginBottom: "20px" }}>
        <StatusBanner
          tone={status.message ? status.tone : "info"}
          title={status.title || "Charts"}
          message={
            status.message ||
            "See your PnL, trade mix, and recent activity in one place."
          }
        />
      </div>

      {loading ? (
        <StatusBanner
          tone="info"
          title="Loading"
          message="Building your chart view."
          compact
        />
      ) : null}

      <div className="charts-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "16px", marginBottom: "20px" }}>
        <StatCard label="Total Trades" value={stats.totalTrades} icon="TR" accent="var(--app-primary)" accentBg="var(--app-primary-soft)" />
        <StatCard label="Win Rate" value={`${stats.winRate}%`} icon="WR" accent="var(--app-success)" accentBg="var(--app-success-bg)" />
        <StatCard
          label="Net PnL"
          value={formatMoney(stats.totalPnL)}
          valueColor={stats.totalPnL >= 0 ? "var(--app-success)" : "var(--app-danger)"}
          icon={stats.totalPnL >= 0 ? "UP" : "DN"}
          accent={stats.totalPnL >= 0 ? "var(--app-success)" : "var(--app-danger)"}
          accentBg={stats.totalPnL >= 0 ? "var(--app-success-bg)" : "var(--app-danger-bg)"}
        />
      </div>

      <div className="charts-donut-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: "20px", marginBottom: "20px" }}>
        <DonutCard
          title="PnL Breakdown"
          centerLabel="Net PnL"
          centerValue={formatMoney(stats.totalPnL)}
          segments={[
            { label: "Gross Profit", value: stats.grossProfit || 0, color: "#22c55e", display: formatMoney(stats.grossProfit) },
            { label: "Gross Loss", value: stats.grossLoss || 0, color: "#ef4444", display: formatMoney(stats.grossLoss) },
          ]}
          footer="This chart compares your winning dollars vs losing dollars."
        />

        <DonutCard
          title="Win / Loss Percentage"
          centerLabel="Win Rate"
          centerValue={`${stats.winRate}%`}
          segments={[
            { label: "Wins", value: stats.wins || 0, color: "#22c55e", display: `${stats.wins} (${stats.winRate}%)` },
            { label: "Losses", value: stats.losses || 0, color: "#ef4444", display: `${stats.losses} (${stats.lossRate}%)` },
            { label: "Breakeven", value: stats.breakeven || 0, color: "#94a3b8", display: `${stats.breakeven}` },
          ]}
          footer="This chart shows how your closed trades split between wins, losses, and breakeven."
        />
      </div>

      <div className="charts-day-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: "16px", marginBottom: "24px" }}>
        <StatCard
          label="Most Profitable Day"
          value={stats.mostProfitableDay ? formatMoney(stats.mostProfitableDay.pnl) : "--"}
          valueColor="var(--app-success)"
          subtext={
            stats.mostProfitableDay
              ? `${formatTradeDateLabel(stats.mostProfitableDay.date)} | ${stats.mostProfitableDay.tradeCount} trade(s)`
              : "No daily data yet"
          }
          icon="HI"
          accent="var(--app-success)"
          accentBg="var(--app-success-bg)"
        />

        <StatCard
          label="Least Profitable Day"
          value={stats.leastProfitableDay ? formatMoney(stats.leastProfitableDay.pnl) : "--"}
          valueColor="var(--app-danger)"
          subtext={
            stats.leastProfitableDay
              ? `${formatTradeDateLabel(stats.leastProfitableDay.date)} | ${stats.leastProfitableDay.tradeCount} trade(s)`
              : "No daily data yet"
          }
          icon="LO"
          accent="var(--app-danger)"
          accentBg="var(--app-danger-bg)"
        />
      </div>

      <div
        className="charts-panel"
        style={{
          background: "linear-gradient(180deg, var(--app-card) 0%, var(--app-card-muted) 100%)",
          borderRadius: "24px",
          padding: "clamp(18px, 3vw, 22px)",
          boxShadow: "var(--app-shadow-card)",
          border: "1px solid var(--app-card-border)",
        }}
      >
        <div style={{ fontSize: "20px", fontWeight: "bold", color: "var(--app-text)", marginBottom: "16px" }}>
          Recent Trades
        </div>

        {recentTrades.length === 0 ? (
          <div style={{ padding: "26px", borderRadius: "16px", background: "var(--app-card-muted)", color: "var(--app-text-soft)", textAlign: "center" }}>
            No trades yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {recentTrades.map((trade) => {
              const pnl = calculateTradePnl(trade);

              return (
                <div
                  className="charts-trade-row"
                  key={trade._id}
                  style={{
                    border: "1px solid var(--app-card-border)",
                    borderRadius: "18px",
                    padding: "16px",
                    background: "linear-gradient(180deg, var(--app-card) 0%, var(--app-card-muted) 100%)",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: "17px", color: "var(--app-text)", marginBottom: "4px" }}>
                      {trade.symbol || "Trade"} | {(trade.direction || "").toUpperCase()}
                    </div>
                    <div style={{ color: "var(--app-text-soft)", fontSize: "14px" }}>
                      {trade.tradeDate || "No date"} | Entry: {trade.entry ?? "--"} | Exit: {trade.exit ?? "--"}
                    </div>
                  </div>

                  <div
                    style={{
                      alignSelf: "center",
                      fontWeight: "bold",
                      fontSize: "16px",
                      color: pnl >= 0 ? "var(--app-success)" : "var(--app-danger)",
                      background: pnl >= 0 ? "var(--app-success-bg)" : "var(--app-danger-bg)",
                      borderRadius: "999px",
                      padding: "8px 12px",
                    }}
                  >
                    {formatMoney(pnl)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default ChartsPage;


