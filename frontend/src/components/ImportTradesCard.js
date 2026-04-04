import React, { useState } from "react";
import styles from "../styles";

function ImportTradesCard({ importCsvTrades, isImportingCsv, importResult }) {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleImport = () => {
    if (!selectedFile) return;
    importCsvTrades(selectedFile);
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>CSV Import</h2>

      <div style={{ fontSize: "14px", color: "var(--app-text-soft)", lineHeight: 1.5, marginBottom: "14px" }}>
        Import trades from Tradovate, NinjaTrader, Apex, or other CSV exports. The app auto-maps
        common columns like symbol, side, qty, entry, exit, PnL, and date.
      </div>

      <input
        type="file"
        accept=".csv,text/csv,.txt"
        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
        style={styles.input}
      />

      <div style={styles.buttonRow}>
        <button type="button" onClick={handleImport} style={styles.primaryButton} disabled={!selectedFile || isImportingCsv}>
          {isImportingCsv ? "Importing..." : "Import CSV"}
        </button>
      </div>

      {selectedFile && (
        <div style={{ marginTop: "10px", fontSize: "13px", color: "var(--app-text)" }}>
          Selected file: <strong>{selectedFile.name}</strong>
        </div>
      )}

      {importResult && (
        <div
          style={{
            marginTop: "16px",
            padding: "14px",
            borderRadius: "14px",
            background: "var(--app-card-muted)",
            border: "1px solid var(--app-card-border)",
          }}
        >
          <div style={{ fontSize: "15px", fontWeight: "bold", color: "var(--app-text)", marginBottom: "10px" }}>
            Import Summary
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
              gap: "10px",
              fontSize: "13px",
              color: "var(--app-text)",
              marginBottom: "12px",
            }}
          >
            <div><strong>Platform:</strong> {importResult.platform || "--"}</div>
            <div><strong>Imported:</strong> {importResult.importedCount || 0}</div>
            <div><strong>Skipped:</strong> {importResult.skippedCount || 0}</div>
          </div>

          {Array.isArray(importResult.skippedRows) && importResult.skippedRows.length > 0 ? (
            <div style={{ fontSize: "12px", color: "var(--app-danger)", marginBottom: "10px" }}>
              Skipped rows:{" "}
              {importResult.skippedRows
                .slice(0, 5)
                .map((row) => `#${row.rowNumber} (${row.reason})`)
                .join(", ")}
            </div>
          ) : null}

          {Array.isArray(importResult.detectedHeaders) && importResult.detectedHeaders.length > 0 ? (
            <div style={{ fontSize: "12px", color: "var(--app-text-soft)", lineHeight: 1.6 }}>
              <strong>Detected headers:</strong> {importResult.detectedHeaders.join(", ")}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default ImportTradesCard;
