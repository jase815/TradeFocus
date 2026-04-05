import React from "react";
import { Link } from "react-router-dom";
import styles from "../styles";

function ImportTradesCard() {
  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>Prop Firm Import</h2>

      <div
        style={{
          fontSize: "14px",
          color: "var(--app-text-soft)",
          lineHeight: 1.6,
          marginBottom: "16px",
        }}
      >
        Preview CSV imports from Apex, Topstep, or a generic export, then confirm the import when
        your Pro access is active.
      </div>

      <div
        style={{
          padding: "14px",
          borderRadius: "16px",
          background: "linear-gradient(135deg, var(--app-primary-soft) 0%, var(--app-card-muted) 100%)",
          border: "1px solid var(--app-primary-border)",
          color: "var(--app-chip-text)",
          fontSize: "13px",
          lineHeight: 1.6,
          marginBottom: "16px",
        }}
      >
        Preview your import for free. Upgrade to Pro to confirm and bring valid trades into your
        journal, calendar, and analytics.
      </div>

      <Link to="/import-trades" style={{ textDecoration: "none" }}>
        <button type="button" style={styles.primaryButton}>
          Open Import Tool
        </button>
      </Link>
    </div>
  );
}

export default ImportTradesCard;
