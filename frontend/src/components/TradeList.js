import React from "react";
import styles from "../styles";
import { API_URL } from "../config";

function formatMoney(value) {
  const number = Number(value || 0);
  return `${number >= 0 ? "+" : ""}${number.toFixed(2)}`;
}

function TradeList({
  trades,
  deleteTrade,
  startEditTrade,
  calculateTradePnl,
  detectResult,
  reviewTrade,
  reviewingTradeId,
}) {
  if (!trades.length) {
    return (
      <div className="trade-list-card" style={styles.card}>
        <h2 style={styles.cardTitle}>Trades</h2>
        <div style={styles.emptyState}>No trades yet</div>
      </div>
    );
  }

  return (
    <div className="trade-list-card" style={styles.card}>
      <div style={styles.tradesHeader}>
        <h2 style={{ ...styles.cardTitle, marginBottom: 0 }}>Trades</h2>
        <div style={{ fontSize: "13px", color: "var(--app-text-soft)" }}>Showing latest to oldest</div>
      </div>

      <div style={styles.tradeList}>
        {trades.map((trade) => {
          const pnl = calculateTradePnl(trade);
          const result = detectResult(trade);

          return (
            <div key={trade._id} style={styles.tradeCard}>
              <div className="trade-list-top-row" style={styles.tradeTopRow}>
                <div>
                  <div style={styles.tradeSymbol}>{trade.symbol || "Trade"} | {(trade.direction || "").toUpperCase()}</div>
                  <div style={styles.tradeNote}>
                    {trade.tradeDate || "No date"} {trade.presetName ? `| ${trade.presetName}` : ""}
                  </div>
                </div>

                <div
                  style={{
                    ...styles.pnlBadge,
                    background: pnl >= 0 ? "var(--app-success-bg)" : "var(--app-danger-bg)",
                    color: pnl >= 0 ? "var(--app-success)" : "var(--app-danger)",
                  }}
                >
                  {formatMoney(pnl)}
                </div>
              </div>

              <div className="trade-list-meta" style={styles.tradeMeta}>
                <span>Entry: {trade.entry ?? "--"}</span>
                <span>Exit: {trade.exit ?? "--"}</span>
                <span>Contracts: {trade.contracts ?? "--"}</span>
                <span>Point Value: {trade.pointValue ?? "--"}</span>
                <span>Result: {result || "--"}</span>
              </div>

              {trade.screenshot ? (
                <div
                  style={{
                    marginBottom: "14px",
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid var(--app-card-border)",
                    background: "var(--app-card)",
                  }}
                >
                  <img
                    src={`${API_URL}${trade.screenshot}`}
                    alt="Trade screenshot"
                    style={{ width: "100%", maxHeight: "260px", objectFit: "cover", display: "block" }}
                  />
                </div>
              ) : null}

              {trade.notes ? (
                <div style={{ marginBottom: "12px", color: "var(--app-text)", fontSize: "14px", whiteSpace: "pre-wrap" }}>
                  {trade.notes}
                </div>
              ) : null}

              {trade.aiReview ? (
                <div
                  style={{
                    marginBottom: "12px",
                    background: "var(--app-primary-soft)",
                    border: "1px solid var(--app-primary-border)",
                    borderRadius: "12px",
                    padding: "12px",
                    color: "var(--app-chip-text)",
                    fontSize: "14px",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  <strong>AI Review:</strong> {trade.aiReview}
                </div>
              ) : null}

              <div className="trade-list-action-row" style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                <div className="trade-form-action-row" style={styles.buttonRow}>
                  <button onClick={() => startEditTrade(trade)} style={styles.ghostButton}>
                    Edit
                  </button>

                  <button onClick={() => reviewTrade(trade._id)} style={styles.secondaryButton} disabled={reviewingTradeId === trade._id}>
                    {reviewingTradeId === trade._id ? "Reviewing..." : "AI Review"}
                  </button>
                </div>

                <button onClick={() => deleteTrade(trade._id)} style={styles.deleteButton}>
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TradeList;


