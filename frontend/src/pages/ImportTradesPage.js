import React, { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import StatusBanner from "../components/StatusBanner";
import usePremiumAccess from "../hooks/usePremiumAccess";
import styles from "../styles";
import { API_URL } from "../config";
import handleUpgradeToPro from "../utils/handleUpgradeToPro";
import { getFriendlyErrorMessage, readResponsePayload } from "../utils/apiFeedback";

const SOURCE_OPTIONS = [
  { value: "apex", label: "Apex" },
  { value: "topstep", label: "Topstep" },
  { value: "alpha-futures", label: "Alpha Futures" },
  { value: "take-profit-trader", label: "Take Profit Trader" },
  { value: "my-funded-futures", label: "My Funded Futures" },
  { value: "bulenox", label: "Bulenox" },
  { value: "earn2trade", label: "Earn2Trade" },
  { value: "tradeday", label: "TradeDay" },
  { value: "tickticktrader", label: "TickTickTrader" },
  { value: "funded-futures-network", label: "Funded Futures Network" },
  { value: "generic", label: "Generic CSV" },
];

function SummaryPill({ label, value, tone = "default" }) {
  const colors =
    tone === "success"
      ? {
          background: "var(--app-success-bg)",
          border: "1px solid var(--app-success-border)",
          color: "var(--app-success)",
        }
      : tone === "warning"
      ? {
          background: "color-mix(in srgb, var(--app-warning-bg) 82%, var(--app-card) 18%)",
          border: "1px solid var(--app-warning-border)",
          color: "var(--app-warning)",
        }
      : tone === "danger"
      ? {
          background: "var(--app-danger-bg)",
          border: "1px solid var(--app-danger-border)",
          color: "var(--app-danger)",
        }
      : {
          background: "var(--app-card-muted)",
          border: "1px solid var(--app-card-border)",
          color: "var(--app-text)",
        };

  return (
    <div
      style={{
        ...colors,
        borderRadius: "14px",
        padding: "12px 14px",
        minWidth: "140px",
      }}
    >
      <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "4px" }}>
        {label}
      </div>
      <div style={{ fontSize: "20px", fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function ImportTradesPage() {
  const { isPremium, loading: premiumLoading } = usePremiumAccess();
  const [source, setSource] = useState("apex");
  const [file, setFile] = useState(null);
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [access, setAccess] = useState({ isPremium: false, availableSources: [] });
  const [preview, setPreview] = useState(null);
  const [showImportNotes, setShowImportNotes] = useState(false);
  const [importNotes, setImportNotes] = useState("");
  const [status, setStatus] = useState({
    tone: "info",
    title: "Import Trades",
    message:
      "Upload a CSV from Apex, Topstep, or a generic trade export to quickly bring your trades into TradeFocus.",
  });
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    fetchAccess();
  }, []);

  useEffect(() => {
    if (!premiumLoading && isPremium) {
      fetchFolders();
    }

    if (!premiumLoading && !isPremium) {
      setFolders([]);
      setSelectedFolderId("");
      setPreview(null);
    }
  }, [isPremium, premiumLoading]);

  useEffect(() => {
    setPreview(null);
  }, [source, file]);

  const selectedSourceLabel = useMemo(
    () => SOURCE_OPTIONS.find((option) => option.value === source)?.label || "Generic CSV",
    [source]
  );

  const fetchAccess = async () => {
    try {
      setLoadingAccess(true);
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_URL}/api/import/access`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await readResponsePayload(res);

      if (res.ok) {
        setAccess({
          isPremium: !!data.isPremium,
          availableSources: Array.isArray(data.availableSources) ? data.availableSources : [],
        });
      } else {
        setStatus({
          tone: "error",
          title: "Could Not Load Import Access",
          message: getFriendlyErrorMessage({
            response: res,
            data,
            fallback: "We could not load your import access right now.",
            context: "Import",
          }),
        });
      }
    } catch (error) {
      setStatus({
        tone: "error",
        title: "Connection Problem",
        message: getFriendlyErrorMessage({
          error,
          fallback: "We could not load your import access right now.",
          context: "Import",
        }),
      });
    } finally {
      setLoadingAccess(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_URL}/api/folders`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await readResponsePayload(res);

      if (res.ok) {
        setFolders(Array.isArray(data) ? data : []);
      }
    } catch {
      setFolders([]);
    }
  };

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null;

    if (nextFile && !/\.csv$/i.test(nextFile.name)) {
      setFile(null);
      setStatus({
        tone: "warning",
        title: "CSV Required",
        message: "Upload a CSV file to preview your prop firm import.",
      });
      return;
    }

    setFile(nextFile);
  };

  const buildImportFormData = ({ includeNotes = false } = {}) => {
    const formData = new FormData();
    formData.append("source", source);
    if (file) {
      formData.append("file", file);
    }
    if (includeNotes) {
      formData.append("importNotes", importNotes);
      formData.append("folderId", selectedFolderId);
    }
    return formData;
  };

  const previewImport = async () => {
    try {
      if (!file) {
        setStatus({
          tone: "warning",
          title: "CSV Required",
          message: "Upload a CSV file before previewing your import.",
        });
        return;
      }

      setIsPreviewing(true);
      setStatus({
        tone: "info",
        title: "Previewing Import",
        message: "Parsing your CSV and checking for duplicates now.",
      });

      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_URL}/api/import/preview`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: buildImportFormData(),
      });
      const data = await readResponsePayload(res);

      if (res.ok) {
        setPreview(data);
        setStatus({
          tone: "success",
          title: "Preview Ready",
          message: data.isPremium
            ? "Your import preview is ready. Confirm when you want to bring those trades in."
            : "Your import preview is ready. Upgrade to Pro to confirm and import all valid trades.",
        });
      } else {
        setPreview(null);
        setStatus({
          tone: "error",
          title: "Preview Failed",
          message: getFriendlyErrorMessage({
            response: res,
            data,
            fallback: "We could not preview that CSV right now.",
            context: "Import preview",
          }),
        });
      }
    } catch (error) {
      setPreview(null);
      setStatus({
        tone: "error",
        title: "Preview Failed",
        message: getFriendlyErrorMessage({
          error,
          fallback: "We could not preview that CSV right now.",
          context: "Import preview",
        }),
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  const confirmImport = async () => {
    try {
      if (!preview || !file) {
        return;
      }

      setIsConfirming(true);
      setStatus({
        tone: "info",
        title: "Importing Trades",
        message: "Saving valid non-duplicate trades into your journal now.",
      });

      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_URL}/api/import/confirm`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: buildImportFormData({ includeNotes: true }),
      });
      const data = await readResponsePayload(res);

      if (res.ok) {
        setPreview(data);
        setStatus({
          tone: "success",
          title: "Import Complete",
          message: data.message || "Your prop firm trades have been imported.",
        });
      } else {
        setStatus({
          tone: "error",
          title: "Import Failed",
          message: getFriendlyErrorMessage({
            response: res,
            data,
            fallback: "We could not import that CSV right now.",
            context: "Import",
          }),
        });
      }
    } catch (error) {
      setStatus({
        tone: "error",
        title: "Import Failed",
        message: getFriendlyErrorMessage({
          error,
          fallback: "We could not import that CSV right now.",
          context: "Import",
        }),
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const confirmDisabled =
    !preview ||
    !isPremium ||
    !preview.summary ||
    preview.summary.readyToImport === 0 ||
    isConfirming;

  return (
    <AppShell
      title="Import Your Prop Firm Trades"
      subtitle="Upload a CSV from Apex, Topstep, or a generic trade export to quickly bring your trades into TradeFocus."
    >
      <div style={{ marginBottom: "18px", maxWidth: "980px" }}>
        <StatusBanner tone={status.tone} title={status.title} message={status.message} />
      </div>

      {premiumLoading ? (
        <div style={{ ...styles.lockedCard, maxWidth: "980px", color: "var(--app-text-soft)" }}>
          Checking Pro import access...
        </div>
      ) : null}

      {!premiumLoading && !isPremium ? (
        <div style={{ ...styles.lockedCard, maxWidth: "980px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--app-text)", marginBottom: "8px" }}>
                CSV Import is Pro
              </div>
              <div style={{ color: "var(--app-text-soft)", fontSize: "14px", lineHeight: 1.7, maxWidth: "720px" }}>
                Unlock CSV imports for Apex, Topstep, and other trade exports so you can bring your history into TradeFocus in minutes.
              </div>
            </div>
            <button type="button" onClick={handleUpgradeToPro} style={styles.primaryButton}>
              Upgrade to Pro
            </button>
          </div>
        </div>
      ) : null}

      {!premiumLoading && isPremium ? (
      <div style={{ maxWidth: "980px", display: "grid", gap: "18px" }}>
        <div style={styles.card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "18px",
            }}
          >
            <div>
              <h2 style={{ ...styles.cardTitle, marginBottom: "8px" }}>Prop Firm Import</h2>
              <div style={{ color: "var(--app-text-soft)", fontSize: "14px", lineHeight: 1.6 }}>
                Import valid trades from Apex, Topstep, and other CSV exports into your journal,
                calendar, and analytics.
              </div>
            </div>

            <div
              style={{
                padding: "10px 14px",
                borderRadius: "999px",
                background: access.isPremium ? "var(--app-success-bg)" : "var(--app-primary-soft)",
                border: access.isPremium
                  ? "1px solid var(--app-success-border)"
                  : "1px solid var(--app-primary-border)",
                color: access.isPremium ? "var(--app-success)" : "var(--app-chip-text)",
                fontWeight: 800,
                fontSize: "13px",
              }}
            >
              {loadingAccess ? "Checking Access..." : access.isPremium ? "Pro Access Active" : "Pro Feature"}
            </div>
          </div>

          <div style={styles.twoCol}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--app-text)", marginBottom: "8px" }}>
                Prop Firm
              </div>
              <select value={source} onChange={(e) => setSource(e.target.value)} style={styles.input}>
                {SOURCE_OPTIONS.filter(
                  (option) =>
                    access.availableSources.length === 0 || access.availableSources.includes(option.value)
                ).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--app-text)", marginBottom: "8px" }}>
                CSV Upload
              </div>
              <input type="file" accept=".csv,text/csv" onChange={handleFileChange} style={styles.input} />
            </div>
          </div>

          <div style={{ maxWidth: "420px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--app-text)", marginBottom: "8px" }}>
              Assign to Folder
            </div>
            <select value={selectedFolderId} onChange={(e) => setSelectedFolderId(e.target.value)} style={styles.input}>
              <option value="">No Folder</option>
              {folders.map((folder) => (
                <option key={folder._id} value={folder._id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ color: "var(--app-text-soft)", fontSize: "13px", marginTop: "2px", marginBottom: "16px" }}>
            {file
              ? `Selected file: ${file.name}`
              : "Choose a CSV file, preview the parsed trades, then confirm the import when you're ready."}
          </div>

          <div style={styles.buttonRow}>
            <button type="button" onClick={previewImport} style={styles.primaryButton} disabled={!file || isPreviewing}>
              {isPreviewing ? "Previewing..." : "Preview Import"}
            </button>
            <button type="button" onClick={confirmImport} style={styles.secondaryButton} disabled={confirmDisabled}>
              {isConfirming ? "Importing..." : "Confirm Import"}
            </button>
            <button
              type="button"
              onClick={() => setShowImportNotes((prev) => !prev)}
              style={styles.ghostButton}
            >
              {showImportNotes ? "Hide Import Notes" : "Add Import Notes"}
            </button>
            {!access.isPremium ? (
              <button type="button" onClick={handleUpgradeToPro} style={styles.ghostButton}>
                Upgrade to Pro
              </button>
            ) : null}
          </div>

          {showImportNotes ? (
            <div
              style={{
                marginTop: "16px",
                padding: "14px",
                borderRadius: "16px",
                background: "var(--app-card-muted)",
                border: "1px solid var(--app-card-border)",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "var(--app-text)",
                  marginBottom: "8px",
                }}
              >
                Import Notes
              </div>
              <textarea
                value={importNotes}
                onChange={(e) => setImportNotes(e.target.value)}
                placeholder="Add context for this import, week, or trading period."
                style={{ ...styles.textarea, marginBottom: 0, minHeight: "120px" }}
              />
            </div>
          ) : null}
        </div>

        {preview ? (
          <div style={styles.card}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
                flexWrap: "wrap",
                marginBottom: "16px",
              }}
            >
              <div>
                <h2 style={{ ...styles.cardTitle, marginBottom: "6px" }}>Import Preview</h2>
                <div style={{ color: "var(--app-text-soft)", fontSize: "14px" }}>
                  {selectedSourceLabel} | {preview.fileName || file?.name || "--"}
                </div>
              </div>

              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "999px",
                  background: preview.isPremium ? "var(--app-success-bg)" : "var(--app-warning-bg)",
                  border: preview.isPremium
                    ? "1px solid var(--app-success-border)"
                    : "1px solid var(--app-warning-border)",
                  color: preview.isPremium ? "var(--app-success)" : "var(--app-warning)",
                  fontWeight: 800,
                  fontSize: "13px",
                }}
              >
                {preview.isPremium ? "Ready to Import" : "Preview Only"}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
                gap: "12px",
                marginBottom: "18px",
              }}
            >
              <SummaryPill label="Total Rows" value={preview.summary?.totalRows ?? 0} />
              <SummaryPill label="Valid Trades" value={preview.summary?.validTrades ?? 0} tone="success" />
              <SummaryPill label="Duplicates" value={preview.summary?.duplicates ?? 0} tone="warning" />
              <SummaryPill label="Skipped" value={preview.summary?.skippedRows ?? 0} tone="danger" />
            </div>

            <div
              style={{
                padding: "14px",
                borderRadius: "16px",
                background: "var(--app-card-muted)",
                border: "1px solid var(--app-card-border)",
                color: "var(--app-text)",
                marginBottom: "18px",
              }}
            >
              <div style={{ fontSize: "14px", marginBottom: "6px" }}>
                <strong>Selected firm:</strong> {preview.sourceLabel || selectedSourceLabel}
              </div>
              <div style={{ fontSize: "14px", marginBottom: "6px" }}>
                <strong>File name:</strong> {preview.fileName || file?.name || "--"}
              </div>
              <div style={{ fontSize: "14px" }}>
                <strong>Ready to import:</strong> {preview.summary?.readyToImport ?? 0}
              </div>
            </div>

            <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--app-text)", marginBottom: "12px" }}>
              Preview Trades
            </div>

            {Array.isArray(preview.previewTrades) && preview.previewTrades.length > 0 ? (
              <div style={{ display: "grid", gap: "12px" }}>
                {preview.previewTrades.map((trade) => (
                  <div
                    key={`${trade.rowNumber}-${trade.symbol}-${trade.tradeDate}`}
                    style={{
                      border: "1px solid var(--app-card-border)",
                      borderRadius: "18px",
                      padding: "14px",
                      background: "linear-gradient(180deg, var(--app-card) 0%, var(--app-card-muted) 100%)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "12px",
                        flexWrap: "wrap",
                        marginBottom: "10px",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "16px", color: "var(--app-text)", marginBottom: "4px" }}>
                          Row {trade.rowNumber} | {trade.symbol || "--"} | {(trade.direction || "--").toUpperCase()}
                        </div>
                        <div style={{ color: "var(--app-text-soft)", fontSize: "13px" }}>
                          Date: {trade.tradeDate || "--"} | Contracts: {trade.contracts ?? "--"} | PnL:{" "}
                          {trade.pnl ?? "--"}
                        </div>
                      </div>

                      <div
                        style={{
                          borderRadius: "999px",
                          padding: "8px 12px",
                          fontWeight: 700,
                          fontSize: "12px",
                          background: trade.isDuplicate ? "var(--app-warning-bg)" : "var(--app-success-bg)",
                          border: trade.isDuplicate
                            ? "1px solid var(--app-warning-border)"
                            : "1px solid var(--app-success-border)",
                          color: trade.isDuplicate ? "var(--app-warning)" : "var(--app-success)",
                        }}
                      >
                        {trade.isDuplicate ? "Duplicate" : "Ready"}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", color: "var(--app-text)", fontSize: "13px" }}>
                      <span>Entry: {trade.entry ?? "--"}</span>
                      <span>Exit: {trade.exit ?? "--"}</span>
                      <span>Fees: {trade.fees ?? 0}</span>
                      {trade.externalTradeId ? <span>ID: {trade.externalTradeId}</span> : null}
                    </div>

                    {trade.isDuplicate && trade.duplicateReason ? (
                      <div style={{ marginTop: "10px", fontSize: "13px", color: "var(--app-warning)" }}>
                        {trade.duplicateReason}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.emptyState}>No valid trades were available in this preview.</div>
            )}
          </div>
        ) : null}
      </div>
      ) : null}
    </AppShell>
  );
}

export default ImportTradesPage;
