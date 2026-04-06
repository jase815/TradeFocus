import React, { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppShell from "../components/AppShell";
import StatusBanner from "../components/StatusBanner";
import usePremiumAccess from "../hooks/usePremiumAccess";
import styles from "../styles";
import { API_URL } from "../config";
import handleUpgradeToPro from "../utils/handleUpgradeToPro";
import { getFriendlyErrorMessage, readResponsePayload } from "../utils/apiFeedback";
import {
  computeAnalytics,
  formatDateLabel,
  formatMoney,
  formatPercent,
  getTradeTimestamp,
  normalizeSymbol,
} from "../utils/analyticsHelpers";

const INITIAL_TABLE_ROWS = 6;

function StatCard({
  label,
  value,
  valueColor = "var(--app-text)",
  subtext = "",
  accent = "var(--app-primary)",
  accentBg = "var(--app-primary-soft)",
  badge = "",
}) {
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
          {subtext ? <div style={{ marginTop: "8px", color: "var(--app-text-soft)", fontSize: "13px" }}>{subtext}</div> : null}
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
            fontSize: "11px",
            fontWeight: "bold",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            textAlign: "center",
            padding: "4px",
          }}
        >
          {badge || "Stat"}
        </div>
      </div>
    </div>
  );
}

function ChartPanel({ title, subtitle = "", children }) {
  return (
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
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
        <div>
          <div style={{ fontSize: "20px", fontWeight: "bold", color: "var(--app-text)", marginBottom: "4px" }}>{title}</div>
          {subtitle ? <div style={{ color: "var(--app-text-soft)", fontSize: "13px" }}>{subtitle}</div> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function BreakdownTable({ rows, columns, emptyText = "No data available.", loadMoreKey }) {
  const [visibleRows, setVisibleRows] = useState(INITIAL_TABLE_ROWS);

  useEffect(() => {
    setVisibleRows(INITIAL_TABLE_ROWS);
  }, [loadMoreKey, rows.length]);

  const visible = rows.slice(0, visibleRows);

  if (!rows.length) {
    return <div style={styles.emptyState}>{emptyText}</div>;
  }

  return (
    <>
      <div style={{ display: "grid", gap: "10px" }}>
        {visible.map((row) => (
          <div
            key={row.label}
            style={{
              border: "1px solid var(--app-card-border)",
              borderRadius: "16px",
              padding: "14px",
              background: "linear-gradient(180deg, var(--app-card) 0%, var(--app-card-muted) 100%)",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 120px), 1fr))", gap: "12px" }}>
              {columns.map((column) => (
                <div key={column.label}>
                  <div style={{ color: "var(--app-text-soft)", fontSize: "12px", marginBottom: "4px" }}>{column.label}</div>
                  <div style={{ color: "var(--app-text)", fontWeight: column.isPrimary ? 800 : 600, fontSize: column.isPrimary ? "15px" : "14px" }}>
                    {column.render(row)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {rows.length > visible.length ? (
        <div style={{ marginTop: "14px", display: "flex", justifyContent: "center" }}>
          <button type="button" onClick={() => setVisibleRows((prev) => prev + INITIAL_TABLE_ROWS)} style={styles.secondaryButton}>
            Load More
          </button>
        </div>
      ) : null}
    </>
  );
}

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        background: "var(--app-card)",
        border: "1px solid var(--app-card-border)",
        borderRadius: "14px",
        padding: "10px 12px",
        boxShadow: "var(--app-shadow-card)",
      }}
    >
      <div style={{ color: "var(--app-text)", fontWeight: 700, marginBottom: "6px" }}>{label}</div>
      {payload.map((item) => (
        <div key={item.dataKey} style={{ color: item.color || "var(--app-text)", fontSize: "13px", marginBottom: "4px" }}>
          {item.name}: {formatter ? formatter(item.value, item.name) : item.value}
        </div>
      ))}
    </div>
  );
}

function AnalyticsPage() {
  const { isPremium, loading: premiumLoading } = usePremiumAccess();
  const [trades, setTrades] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ tone: "info", title: "", message: "" });
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    symbol: "all",
    direction: "all",
    source: "all",
    folderId: "all",
  });

  useEffect(() => {
    if (!premiumLoading && isPremium) {
      fetchAnalyticsData();
    }
  }, [isPremium, premiumLoading]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setStatus({
        tone: "info",
        title: "Loading Analytics",
        message: "Pulling in your performance, trade history, and review groups.",
      });

      const token = localStorage.getItem("token") || "";
      const [tradeRes, folderRes] = await Promise.all([
        fetch(`${API_URL}/api/trades`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/folders`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [tradeData, folderData] = await Promise.all([
        readResponsePayload(tradeRes),
        readResponsePayload(folderRes),
      ]);

      if (!tradeRes.ok) {
        setStatus({
          tone: "error",
          title: "Could Not Load Analytics",
          message: getFriendlyErrorMessage({
            response: tradeRes,
            data: tradeData,
            fallback: "We could not load your analytics right now.",
            context: "Analytics",
          }),
        });
        return;
      }

      if (!folderRes.ok) {
        setStatus({
          tone: "error",
          title: "Could Not Load Folders",
          message: getFriendlyErrorMessage({
            response: folderRes,
            data: folderData,
            fallback: "We could not load your analytics filters right now.",
            context: "Folder",
          }),
        });
        return;
      }

      setTrades(Array.isArray(tradeData) ? tradeData : []);
      setFolders(Array.isArray(folderData) ? folderData : []);
      setStatus({
        tone: "success",
        title: "Pro Analytics Ready",
        message: "Your performance, drawdown, and breakdown views are loaded.",
      });
    } catch (error) {
      setStatus({
        tone: "error",
        title: "Connection Problem",
        message: getFriendlyErrorMessage({
          error,
          fallback: "We could not load your analytics right now.",
          context: "Analytics",
        }),
      });
    } finally {
      setLoading(false);
    }
  };

  const filterOptions = useMemo(() => {
    const symbols = Array.from(new Set(trades.map((trade) => normalizeSymbol(trade.symbol)).filter(Boolean))).sort();
    const sources = Array.from(
      new Set(
        trades.map((trade) => {
          if (!trade.imported) return "manual";
          return trade.importSource || "imported";
        })
      )
    ).sort();

    return { symbols, sources };
  }, [trades]);

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const timestamp = getTradeTimestamp(trade);
      const tradeDate = timestamp ? timestamp.toISOString().slice(0, 10) : "";
      const symbol = normalizeSymbol(trade.symbol);
      const direction = String(trade.direction || "").toLowerCase();
      const source = !trade.imported ? "manual" : trade.importSource || "imported";
      const folderId = String(trade.folderId || "");

      if (filters.dateFrom && tradeDate && tradeDate < filters.dateFrom) return false;
      if (filters.dateTo && tradeDate && tradeDate > filters.dateTo) return false;
      if (filters.symbol !== "all" && symbol !== filters.symbol) return false;
      if (filters.direction !== "all" && direction !== filters.direction) return false;
      if (filters.source !== "all" && source !== filters.source) return false;
      if (filters.folderId !== "all" && folderId !== filters.folderId) return false;
      return true;
    });
  }, [trades, filters]);

  const analytics = useMemo(() => computeAnalytics(filteredTrades, folders), [filteredTrades, folders]);

  const overviewCards = [
    {
      label: "Total PnL",
      value: formatMoney(analytics.overview.totalPnL),
      valueColor: analytics.overview.totalPnL >= 0 ? "var(--app-success)" : "var(--app-danger)",
      subtext: `${analytics.overview.totalTrades} total trades`,
      accent: analytics.overview.totalPnL >= 0 ? "var(--app-success)" : "var(--app-danger)",
      accentBg: analytics.overview.totalPnL >= 0 ? "var(--app-success-bg)" : "var(--app-danger-bg)",
      badge: "PnL",
    },
    {
      label: "Win Rate",
      value: formatPercent(analytics.overview.winRate),
      subtext: `${analytics.overview.winners} wins | ${analytics.overview.losers} losses`,
      accent: "var(--app-primary)",
      accentBg: "var(--app-primary-soft)",
      badge: "WR",
    },
    {
      label: "Average Win",
      value: formatMoney(analytics.overview.avgWin),
      valueColor: "var(--app-success)",
      subtext: `Gross profit ${formatMoney(analytics.overview.grossProfit)}`,
      accent: "var(--app-success)",
      accentBg: "var(--app-success-bg)",
      badge: "Avg+",
    },
    {
      label: "Average Loss",
      value: formatMoney(analytics.overview.avgLoss),
      valueColor: "var(--app-danger)",
      subtext: `Gross loss ${formatMoney(-analytics.overview.grossLoss)}`,
      accent: "var(--app-danger)",
      accentBg: "var(--app-danger-bg)",
      badge: "Avg-",
    },
    {
      label: "Profit Factor",
      value: analytics.overview.profitFactor === null ? "--" : analytics.overview.profitFactor.toFixed(2),
      subtext: "Gross profit / gross loss",
      accent: "var(--app-primary)",
      accentBg: "var(--app-primary-soft)",
      badge: "PF",
    },
    {
      label: "Expectancy / Trade",
      value: formatMoney(analytics.overview.expectancy),
      subtext: "Average PnL per closed trade",
      accent: "var(--app-primary)",
      accentBg: "var(--app-primary-soft)",
      badge: "Exp",
    },
    {
      label: "Best Day",
      value: analytics.overview.bestDay ? formatMoney(analytics.overview.bestDay.pnl) : "--",
      valueColor: "var(--app-success)",
      subtext: analytics.overview.bestDay ? formatDateLabel(analytics.overview.bestDay.date) : "No daily data yet",
      accent: "var(--app-success)",
      accentBg: "var(--app-success-bg)",
      badge: "Best",
    },
    {
      label: "Worst Day",
      value: analytics.overview.worstDay ? formatMoney(analytics.overview.worstDay.pnl) : "--",
      valueColor: "var(--app-danger)",
      subtext: analytics.overview.worstDay ? formatDateLabel(analytics.overview.worstDay.date) : "No daily data yet",
      accent: "var(--app-danger)",
      accentBg: "var(--app-danger-bg)",
      badge: "Worst",
    },
    {
      label: "Max Drawdown",
      value: formatMoney(analytics.overview.maxDrawdown),
      valueColor: "var(--app-danger)",
      subtext: `Current drawdown ${formatMoney(analytics.overview.currentDrawdown)}`,
      accent: "var(--app-danger)",
      accentBg: "var(--app-danger-bg)",
      badge: "DD",
    },
  ];

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <AppShell title="Analytics" subtitle="Advanced performance analytics built around your real trade history.">
      <div style={{ marginBottom: "20px" }}>
        <StatusBanner
          tone={status.message ? status.tone : "info"}
          title={status.title || "Analytics"}
          message={status.message || "Track your edge with equity, drawdown, and performance breakdowns."}
        />
      </div>

      {premiumLoading ? <StatusBanner tone="info" title="Loading" message="Checking Pro analytics access." compact /> : null}

      {!premiumLoading && !isPremium ? (
        <div style={{ ...styles.lockedCard, maxWidth: "980px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--app-text)", marginBottom: "8px" }}>
                Advanced Analytics is Pro
              </div>
              <div style={{ color: "var(--app-text-soft)", fontSize: "14px", lineHeight: 1.7, maxWidth: "760px" }}>
                Unlock deeper performance insights like equity curve, drawdown, instrument breakdowns, weekday analysis, and folder-based performance tracking.
              </div>
            </div>
            <button type="button" onClick={handleUpgradeToPro} style={styles.primaryButton}>
              Upgrade to Pro
            </button>
          </div>
        </div>
      ) : null}

      {!premiumLoading && isPremium && loading ? <StatusBanner tone="info" title="Loading" message="Building your analytics workspace." compact /> : null}

      {!premiumLoading && isPremium ? (
      <>
      <div style={{ ...styles.card, marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
          <div>
            <div style={{ ...styles.cardTitle, marginBottom: "6px" }}>Advanced Analytics</div>
            <div style={{ color: "var(--app-text-soft)", fontSize: "14px" }}>
              Filter by date, symbol, direction, source, or folder to review what is actually driving your results.
            </div>
          </div>
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "999px",
              background: "var(--app-primary-soft)",
              border: "1px solid var(--app-primary-border)",
              color: "var(--app-chip-text)",
              fontWeight: 800,
              fontSize: "13px",
            }}
          >
            Premium Analytics
          </div>
        </div>

        <div style={styles.twoCol}>
          <input type="date" value={filters.dateFrom} onChange={(e) => handleFilterChange("dateFrom", e.target.value)} style={styles.input} />
          <input type="date" value={filters.dateTo} onChange={(e) => handleFilterChange("dateTo", e.target.value)} style={styles.input} />
          <select value={filters.symbol} onChange={(e) => handleFilterChange("symbol", e.target.value)} style={styles.input}>
            <option value="all">All Symbols</option>
            {filterOptions.symbols.map((symbol) => (
              <option key={symbol} value={symbol}>{symbol}</option>
            ))}
          </select>
          <select value={filters.direction} onChange={(e) => handleFilterChange("direction", e.target.value)} style={styles.input}>
            <option value="all">All Directions</option>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
          <select value={filters.source} onChange={(e) => handleFilterChange("source", e.target.value)} style={styles.input}>
            <option value="all">All Sources</option>
            {filterOptions.sources.map((source) => (
              <option key={source} value={source}>
                {source === "manual" ? "Manual" : source}
              </option>
            ))}
          </select>
          <select value={filters.folderId} onChange={(e) => handleFilterChange("folderId", e.target.value)} style={styles.input}>
            <option value="all">All Folders</option>
            <option value="">No Folder</option>
            {folders.map((folder) => (
              <option key={folder._id} value={folder._id}>{folder.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="charts-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "16px", marginBottom: "20px" }}>
        {overviewCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="charts-donut-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: "20px", marginBottom: "20px" }}>
        <ChartPanel title="Equity Curve" subtitle="Cumulative PnL over ordered trades.">
          {analytics.equityCurve.length ? (
            <div style={{ width: "100%", height: "300px" }}>
              <ResponsiveContainer>
                <LineChart data={analytics.equityCurve}>
                  <CartesianGrid stroke="var(--app-card-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="tradeNumber" stroke="var(--app-text-soft)" />
                  <YAxis stroke="var(--app-text-soft)" tickFormatter={(value) => `$${Math.round(value)}`} />
                  <Tooltip content={<CustomTooltip formatter={(value) => formatMoney(value)} />} />
                  <Legend />
                  <Line type="monotone" dataKey="equity" name="Equity" stroke="#22c55e" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={styles.emptyState}>Not enough trade data for an equity curve yet.</div>
          )}
        </ChartPanel>

        <ChartPanel title="Drawdown Curve" subtitle="Peak-to-trough pressure across the same ordered trade sequence.">
          {analytics.equityCurve.length ? (
            <div style={{ width: "100%", height: "300px" }}>
              <ResponsiveContainer>
                <AreaChart data={analytics.equityCurve}>
                  <CartesianGrid stroke="var(--app-card-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="tradeNumber" stroke="var(--app-text-soft)" />
                  <YAxis stroke="var(--app-text-soft)" tickFormatter={(value) => `$${Math.round(value)}`} />
                  <Tooltip content={<CustomTooltip formatter={(value) => formatMoney(value)} />} />
                  <Legend />
                  <Area type="monotone" dataKey="drawdown" name="Drawdown" stroke="#ef4444" fill="#ef444455" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={styles.emptyState}>Not enough trade data for drawdown analytics yet.</div>
          )}
        </ChartPanel>
      </div>

      <div className="charts-donut-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: "20px", marginBottom: "20px" }}>
        <ChartPanel title="Performance by Weekday" subtitle="PnL by day of week using your trade timestamps.">
          <div style={{ width: "100%", height: "300px" }}>
            <ResponsiveContainer>
              <BarChart data={analytics.weekdayBreakdown}>
                <CartesianGrid stroke="var(--app-card-border)" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="var(--app-text-soft)" />
                <YAxis stroke="var(--app-text-soft)" tickFormatter={(value) => `$${Math.round(value)}`} />
                <Tooltip content={<CustomTooltip formatter={(value) => formatMoney(value)} />} />
                <Legend />
                <Bar dataKey="pnl" name="PnL" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel title="Performance by Month" subtitle="Monthly PnL trend from your filtered trade history.">
          <div style={{ width: "100%", height: "300px" }}>
            <ResponsiveContainer>
              <BarChart data={analytics.monthBreakdown}>
                <CartesianGrid stroke="var(--app-card-border)" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="var(--app-text-soft)" />
                <YAxis stroke="var(--app-text-soft)" tickFormatter={(value) => `$${Math.round(value)}`} />
                <Tooltip content={<CustomTooltip formatter={(value) => formatMoney(value)} />} />
                <Legend />
                <Bar dataKey="pnl" name="PnL" fill="#22c55e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      </div>

      <div className="charts-day-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: "16px", marginBottom: "20px" }}>
        <StatCard
          label="Winning Trades"
          value={analytics.overview.winners}
          subtext={`Breakeven: ${analytics.overview.breakeven}`}
          accent="var(--app-success)"
          accentBg="var(--app-success-bg)"
          badge="Win"
        />
        <StatCard
          label="Losing Trades"
          value={analytics.overview.losers}
          subtext={`Best weekday: ${analytics.bestWeekday ? analytics.bestWeekday.label : "--"}`}
          accent="var(--app-danger)"
          accentBg="var(--app-danger-bg)"
          badge="Loss"
        />
        <StatCard
          label="Long Trades"
          value={analytics.longShort.long.trades}
          subtext={`${formatPercent(analytics.longShort.long.winRate)} win rate | ${formatMoney(analytics.longShort.long.pnl)}`}
          accent="var(--app-primary)"
          accentBg="var(--app-primary-soft)"
          badge="Long"
        />
        <StatCard
          label="Short Trades"
          value={analytics.longShort.short.trades}
          subtext={`${formatPercent(analytics.longShort.short.winRate)} win rate | ${formatMoney(analytics.longShort.short.pnl)}`}
          accent="var(--app-nav)"
          accentBg="var(--app-card-muted)"
          badge="Short"
        />
      </div>

      <div className="charts-donut-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: "20px", marginBottom: "20px" }}>
        <ChartPanel title="Instrument Breakdown" subtitle="See which symbols are doing the real work.">
          <BreakdownTable
            rows={analytics.symbolBreakdown}
            loadMoreKey={`symbols-${filters.symbol}-${filteredTrades.length}`}
            columns={[
              { label: "Instrument", render: (row) => row.label, isPrimary: true },
              { label: "Trades", render: (row) => row.trades },
              { label: "PnL", render: (row) => formatMoney(row.pnl) },
              { label: "Win Rate", render: (row) => formatPercent(row.winRate) },
              { label: "Avg PnL", render: (row) => formatMoney(row.avgPnl) },
            ]}
          />
        </ChartPanel>

        <ChartPanel title="Folder Breakdown" subtitle="Measure performance across your journal review groups.">
          <BreakdownTable
            rows={analytics.folderBreakdown}
            loadMoreKey={`folders-${filters.folderId}-${filteredTrades.length}`}
            columns={[
              { label: "Folder", render: (row) => row.label, isPrimary: true },
              { label: "Trades", render: (row) => row.trades },
              { label: "PnL", render: (row) => formatMoney(row.pnl) },
              { label: "Win Rate", render: (row) => formatPercent(row.winRate) },
            ]}
          />
        </ChartPanel>
      </div>

      <div className="charts-donut-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: "20px", marginBottom: "20px" }}>
        <ChartPanel title="Import Source Breakdown" subtitle="Compare manual trades against imported firm data.">
          <BreakdownTable
            rows={analytics.sourceBreakdown}
            loadMoreKey={`sources-${filters.source}-${filteredTrades.length}`}
            columns={[
              { label: "Source", render: (row) => row.label, isPrimary: true },
              { label: "Trades", render: (row) => row.trades },
              { label: "PnL", render: (row) => formatMoney(row.pnl) },
              { label: "Win Rate", render: (row) => formatPercent(row.winRate) },
            ]}
          />
        </ChartPanel>

        <ChartPanel title="Session Breakdown" subtitle="Only shown when timestamp data exists for your entries or exits.">
          <BreakdownTable
            rows={analytics.sessionBreakdown}
            loadMoreKey={`sessions-${filteredTrades.length}`}
            emptyText="Not enough timestamp data yet for session analytics."
            columns={[
              { label: "Session", render: (row) => row.label, isPrimary: true },
              { label: "Trades", render: (row) => row.trades },
              { label: "PnL", render: (row) => formatMoney(row.pnl) },
              { label: "Win Rate", render: (row) => formatPercent(row.winRate) },
            ]}
          />
        </ChartPanel>
      </div>
      </>
      ) : null}
    </AppShell>
  );
}

export default AnalyticsPage;
