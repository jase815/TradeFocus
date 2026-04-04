import React from "react";
import styles from "../styles";

function formatMoney(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "$0.00";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(num);
}

function StatsCards({ stats }) {
  const totalPnL = Number(stats?.totalPnL || 0);
  const totalTrades = Number(stats?.totalTrades || 0);
  const winRate = stats?.winRate ?? "0.0";

  return (
    <div style={styles.statsGrid}>
      <div style={styles.statCard}>
        <div style={styles.statLabel}>Total Trades</div>
        <div style={styles.statValue}>{totalTrades}</div>
        <div style={{ marginTop: "8px", color: "var(--app-text-soft)", fontSize: "13px", lineHeight: 1.5 }}>
          Logged trades in your current view
        </div>
      </div>

      <div style={styles.statCard}>
        <div style={styles.statLabel}>Win Rate</div>
        <div style={styles.statValue}>{winRate}%</div>
        <div style={{ marginTop: "8px", color: "var(--app-text-soft)", fontSize: "13px", lineHeight: 1.5 }}>
          Percentage of trades closed green
        </div>
      </div>

      <div style={styles.statCard}>
        <div style={styles.statLabel}>Total PnL</div>
        <div style={{ ...styles.statValue, color: totalPnL >= 0 ? "var(--app-success)" : "var(--app-danger)" }}>
          {formatMoney(totalPnL)}
        </div>
        <div style={{ marginTop: "8px", color: "var(--app-text-soft)", fontSize: "13px", lineHeight: 1.5 }}>
          Net performance across filtered trades
        </div>
      </div>
    </div>
  );
}

export default StatsCards;
