import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import StatusBanner from "../components/StatusBanner";
import { API_URL } from "../config";
import useIsMobile from "../hooks/useIsMobile";
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
  const num = value || 0;
  return `${num >= 0 ? "+" : ""}${num.toFixed(2)}`;
}

function formatMoneyPretty(value) {
  const num = value || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(num);
}

function formatMonthLabel(date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function getTradeDateKey(trade) {
  const source = trade.tradeDate || trade.createdAt;
  if (!source) return "";
  const parsed = new Date(source);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function buildCalendarCells(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const startDay = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < startDay; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

const INITIAL_SELECTED_TRADES = 6;
const SELECTED_TRADES_STEP = 6;

function CalendarPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [trades, setTrades] = useState([]);
  const [status, setStatus] = useState({ tone: "info", title: "", message: "" });
  const [deletingId, setDeletingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState("");
  const [visibleSelectedTrades, setVisibleSelectedTrades] = useState(INITIAL_SELECTED_TRADES);

  useEffect(() => {
    fetchTrades();
  }, []);

  useEffect(() => {
    setVisibleSelectedTrades(INITIAL_SELECTED_TRADES);
  }, [selectedDate]);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      setStatus({
        tone: "info",
        title: "Loading Calendar",
        message: "Pulling in your trades and daily performance.",
      });

      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_URL}/api/trades`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readResponsePayload(res);

      if (res.ok) {
        setTrades(Array.isArray(data) ? data : []);
        setStatus({
          tone: "success",
          title: "Calendar Ready",
          message: "Your latest trade activity is loaded.",
        });
      } else {
        setStatus({
          tone: "error",
          title: "Could Not Load Calendar",
          message: getFriendlyErrorMessage({
            response: res,
            data,
            fallback: "We could not load your calendar right now.",
            context: "Calendar",
          }),
        });
      }
    } catch (error) {
      setStatus({
        tone: "error",
        title: "Connection Problem",
        message: getFriendlyErrorMessage({
          error,
          fallback: "We could not load your calendar right now.",
          context: "Calendar",
        }),
      });
    } finally {
      setLoading(false);
    }
  };

  const dailyMap = useMemo(() => {
    const map = {};

    trades.forEach((trade) => {
      const key = getTradeDateKey(trade);
      if (!key) return;
      if (!map[key]) map[key] = { pnl: 0, trades: [], tradeCount: 0 };

      map[key].pnl += calculateTradePnl(trade);
      map[key].trades.push(trade);
      map[key].tradeCount += 1;
    });

    Object.keys(map).forEach((key) => {
      map[key].trades.sort((a, b) => {
        const aTime = new Date(a.createdAt || a.tradeDate || 0).getTime();
        const bTime = new Date(b.createdAt || b.tradeDate || 0).getTime();
        return bTime - aTime;
      });
    });

    return map;
  }, [trades]);

  const calendarCells = useMemo(() => buildCalendarCells(currentMonth), [currentMonth]);

  const monthSummary = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const monthKeys = Object.keys(dailyMap).filter((key) => {
      const parsed = new Date(`${key}T00:00:00`);
      return !Number.isNaN(parsed.getTime()) && parsed.getFullYear() === year && parsed.getMonth() === month;
    });

    let totalMonthPnl = 0;
    let totalTrades = 0;
    let winDays = 0;
    let lossDays = 0;

    monthKeys.forEach((key) => {
      const day = dailyMap[key];
      totalMonthPnl += day.pnl;
      totalTrades += day.tradeCount;
      if (day.pnl > 0) winDays += 1;
      if (day.pnl < 0) lossDays += 1;
    });

    return { totalMonthPnl, totalTrades, winDays, lossDays };
  }, [currentMonth, dailyMap]);

const selectedTrades = useMemo(() => {
  if (!selectedDate) return [];
  return dailyMap[selectedDate]?.trades || [];
}, [selectedDate, dailyMap]);

const displayedSelectedTrades = useMemo(
  () => selectedTrades.slice(0, visibleSelectedTrades),
  [selectedTrades, visibleSelectedTrades]
);
  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return "";
    const parsed = new Date(`${selectedDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return selectedDate;

    return parsed.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedDate]);

  const goToPreviousMonth = () => {
    setSelectedDate("");
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setSelectedDate("");
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setSelectedDate("");
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const deleteTrade = async (id) => {
    try {
      setDeletingId(id);
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_URL}/api/trades/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readResponsePayload(res);

      if (res.ok) {
        setTrades((prev) => prev.filter((trade) => trade._id !== id));
        setStatus({
          tone: "success",
          title: "Trade Deleted",
          message: data.message || "The trade was removed from your calendar.",
        });
      } else {
        setStatus({
          tone: "error",
          title: "Delete Failed",
          message: getFriendlyErrorMessage({
            response: res,
            data,
            fallback: "We could not delete that trade.",
            context: "Trade",
          }),
        });
      }
    } catch (error) {
      setStatus({
        tone: "error",
        title: "Delete Failed",
        message: getFriendlyErrorMessage({
          error,
          fallback: "We could not delete that trade.",
          context: "Trade",
        }),
      });
    } finally {
      setDeletingId("");
    }
  };

  return (
    <AppShell title="Calendar" subtitle="Track daily PnL, trade count, and review each day.">
      <div style={{ marginBottom: "18px" }}>
        <StatusBanner
          tone={status.message ? status.tone : "info"}
          title={status.title || "Calendar"}
          message={
            status.message ||
            "Review your month at a glance and tap any day to drill into the trades behind it."
          }
        />
      </div>

      <div className="calendar-panel" style={{ background: "linear-gradient(180deg, var(--app-card) 0%, var(--app-card-muted) 100%)", borderRadius: "24px", padding: "20px", boxShadow: "var(--app-shadow-card)", border: "1px solid var(--app-card-border)", marginBottom: "18px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "14px",
          }}
        >
          <div style={{ fontSize: "clamp(22px, 5vw, 24px)", fontWeight: "bold", color: "var(--app-text)" }}>
            {formatMonthLabel(currentMonth)}
          </div>

          <div
            style={{
              padding: isMobile ? "10px 12px" : "10px 14px",
              borderRadius: "14px",
              background: monthSummary.totalMonthPnl >= 0 ? "var(--app-success-bg)" : "var(--app-danger-bg)",
              color: monthSummary.totalMonthPnl >= 0 ? "var(--app-success)" : "var(--app-danger)",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Monthly PnL
            </span>
            <span style={{ fontSize: "18px" }}>{formatMoneyPretty(monthSummary.totalMonthPnl)}</span>
          </div>
        </div>

        <div className="calendar-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
          <button className="calendar-month-button" type="button" onClick={goToPreviousMonth} style={{ border: "none", borderRadius: "12px", padding: "10px 14px", background: "var(--app-nav)", color: "#ffffff", fontWeight: "bold", cursor: "pointer" }}>
            Previous
          </button>

          <div style={{ fontSize: "14px", color: "var(--app-text-soft)", textAlign: "center" }}>
            Tap any day to review that session.
          </div>

          <button className="calendar-month-button" type="button" onClick={goToNextMonth} style={{ border: "none", borderRadius: "12px", padding: "10px 14px", background: "var(--app-nav)", color: "#ffffff", fontWeight: "bold", cursor: "pointer" }}>
            Next
          </button>
        </div>

        <div className="calendar-month-controls" style={{ display: "flex", justifyContent: "center", marginBottom: "18px" }}>
          <button type="button" onClick={goToCurrentMonth} style={{ border: "1px solid var(--app-primary-border)", borderRadius: "999px", padding: "9px 14px", background: "var(--app-primary-soft)", color: "var(--app-chip-text)", fontWeight: "bold", cursor: "pointer" }}>
            Jump to Current Month
          </button>
        </div>

        {loading ? (
          <StatusBanner
            tone="info"
            title="Loading"
            message="We're building your calendar view."
            compact
          />
        ) : (
          <>
            <div className="calendar-grid-scroll" style={{ overflowX: "hidden", paddingBottom: 0 }}>
              <div className="calendar-grid-inner" style={{ minWidth: 0, width: "100%" }}>
                <div className="calendar-weekdays" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: isMobile ? "4px" : "10px", marginBottom: isMobile ? "6px" : "10px" }}>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} style={{ textAlign: "center", fontWeight: "bold", color: "var(--app-text-soft)", fontSize: isMobile ? "11px" : "13px", paddingBottom: isMobile ? "2px" : "4px" }}>
                      {isMobile ? day.slice(0, 2) : day}
                    </div>
                  ))}
                </div>

                <div className="calendar-days" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: isMobile ? "4px" : "10px" }}>
                  {calendarCells.map((date, index) => {
                    if (!date) {
                      return <div className="calendar-day-empty" key={`empty-${index}`} style={{ minHeight: isMobile ? "72px" : "118px", borderRadius: isMobile ? "12px" : "16px", background: "transparent" }} />;
                    }

                    const key = getDateKey(date);
                    const dayData = dailyMap[key];
                    const isSelected = selectedDate === key;

                    let background = "var(--app-card)";
                    let border = "1px solid var(--app-card-border)";
                    let pnlColor = "var(--app-text)";
                    let topAccent = "var(--app-primary-border)";

                    if (dayData?.pnl > 0) {
                      background = "linear-gradient(180deg, color-mix(in srgb, var(--app-success-bg) 72%, var(--app-card) 28%) 0%, var(--app-success-bg) 100%)";
                      border = "1px solid var(--app-success-border)";
                      pnlColor = "var(--app-success)";
                      topAccent = "var(--app-success)";
                    } else if (dayData?.pnl < 0) {
                      background = "linear-gradient(180deg, color-mix(in srgb, var(--app-danger-bg) 72%, var(--app-card) 28%) 0%, var(--app-danger-bg) 100%)";
                      border = "1px solid var(--app-danger-border)";
                      pnlColor = "var(--app-danger)";
                      topAccent = "var(--app-danger)";
                    } else if (dayData?.tradeCount > 0) {
                      background = "linear-gradient(180deg, var(--app-card-muted) 0%, color-mix(in srgb, var(--app-card-muted) 72%, var(--app-card) 28%) 100%)";
                      border = "1px solid var(--app-input-border)";
                      pnlColor = "var(--app-text)";
                      topAccent = "var(--app-text-muted)";
                    }

                    if (isSelected) border = "2px solid var(--app-primary)";

                    return (
                      <button
                        className="calendar-day-cell"
                        key={key}
                        type="button"
                        onClick={() => setSelectedDate((prev) => (prev === key ? "" : key))}
                        style={{
                          minHeight: isMobile ? "72px" : "118px",
                          borderRadius: isMobile ? "14px" : "18px",
                          background,
                          border,
                          padding: 0,
                          boxShadow: isSelected ? "var(--app-shadow-card)" : "var(--app-shadow-soft)",
                          boxSizing: "border-box",
                          textAlign: "left",
                          cursor: "pointer",
                          overflow: "hidden",
                        }}
                      >
                        <div style={{ width: "100%", height: isMobile ? "4px" : "6px", background: topAccent }} />
                        <div className="calendar-day-body" style={{ padding: isMobile ? "6px" : "12px" }}>
                          <div style={{ fontWeight: "bold", color: "var(--app-text)", marginBottom: isMobile ? "6px" : "10px", fontSize: isMobile ? "12px" : "15px" }}>
                            {date.getDate()}
                          </div>

                          {dayData ? (
                            <>
                              <div style={{ fontSize: isMobile ? "10px" : "14px", fontWeight: "bold", color: pnlColor, marginBottom: isMobile ? "4px" : "6px", lineHeight: 1.2 }}>
                                {formatMoney(dayData.pnl)}
                              </div>
                              {isMobile ? (
                                <div style={{ fontSize: "10px", color: "var(--app-text-soft)" }}>
                                  {dayData.tradeCount} trade{dayData.tradeCount === 1 ? "" : "s"}
                                </div>
                              ) : (
                                <div style={{ display: "inline-block", fontSize: "12px", color: "var(--app-text)", background: "rgba(255,255,255,0.45)", borderRadius: "999px", padding: "4px 8px" }}>
                                  {dayData.tradeCount} trade{dayData.tradeCount === 1 ? "" : "s"}
                                </div>
                              )}
                            </>
                          ) : (
                            <div style={{ fontSize: isMobile ? "10px" : "12px", color: "var(--app-text-muted)" }}>No trades</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div
              className="calendar-legend"
              style={{
                marginTop: "18px",
                display: "flex",
                gap: "18px",
                flexWrap: "wrap",
                color: "var(--app-text-soft)",
                fontSize: "13px",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "14px", height: "14px", borderRadius: "999px", background: "var(--app-success-bg)", border: "1px solid var(--app-success-border)", display: "inline-block" }} />
                Winning Days: <strong style={{ color: "var(--app-text)" }}>{monthSummary.winDays}</strong>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "14px", height: "14px", borderRadius: "999px", background: "var(--app-danger-bg)", border: "1px solid var(--app-danger-border)", display: "inline-block" }} />
                Losing Days: <strong style={{ color: "var(--app-text)" }}>{monthSummary.lossDays}</strong>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "14px", height: "14px", borderRadius: "999px", background: "var(--app-card-muted)", border: "1px solid var(--app-input-border)", display: "inline-block" }} />
                Breakeven day
              </div>
            </div>

            <div
              style={{
                marginTop: "10px",
                paddingTop: "12px",
                borderTop: "1px solid var(--app-card-border)",
                color: "var(--app-text-soft)",
                fontSize: "14px",
              }}
            >
              Total Trades: <strong style={{ color: "var(--app-text)" }}>{monthSummary.totalTrades}</strong>
            </div>
          </>
        )}
      </div>

      {selectedDate && (
        <div className="calendar-panel" style={{ background: "linear-gradient(180deg, var(--app-card) 0%, var(--app-card-muted) 100%)", borderRadius: "24px", padding: "20px", boxShadow: "var(--app-shadow-card)", border: "1px solid var(--app-card-border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, fontSize: "22px", color: "var(--app-text)" }}>Trades on {selectedDateLabel}</h2>
            <button type="button" onClick={() => setSelectedDate("")} style={{ border: "1px solid var(--app-primary-border)", borderRadius: "12px", padding: "10px 14px", background: "var(--app-primary-soft)", color: "var(--app-chip-text)", fontWeight: "bold", cursor: "pointer" }}>
              Close
            </button>
          </div>

          {selectedTrades.length === 0 ? (
            <StatusBanner
              tone="info"
              title="No Trades"
              message="There are no trades logged for this day."
              compact
            />
          ) : (
            <>
              <div style={{ display: "grid", gap: "12px" }}>
                {displayedSelectedTrades.map((trade) => {
                  const pnl = calculateTradePnl(trade);

                  return (
                    <div key={trade._id} style={{ border: "1px solid var(--app-card-border)", borderRadius: "18px", padding: "16px", background: "linear-gradient(180deg, var(--app-card) 0%, var(--app-card-muted) 100%)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "10px" }}>
                        <div>
                          <div style={{ fontWeight: "bold", fontSize: "17px", color: "var(--app-text)", marginBottom: "4px" }}>
                            {trade.symbol || "Trade"} | {(trade.direction || "").toUpperCase()}
                          </div>
                          <div style={{ color: "var(--app-text-soft)", fontSize: "14px" }}>
                            Entry: {trade.entry ?? "--"} | Exit: {trade.exit ?? "--"} | Contracts: {trade.contracts ?? "--"}
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
                          {formatMoneyPretty(pnl)}
                        </div>
                      </div>

                      {trade.notes ? (
                        <div style={{ fontSize: "14px", color: "var(--app-text)", marginBottom: "12px", whiteSpace: "pre-wrap" }}>
                          {trade.notes}
                        </div>
                      ) : null}

                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <button type="button" onClick={() => navigate(`/add-trade?edit=${trade._id}`)} style={{ background: "var(--app-nav)", color: "#fff", border: "none", borderRadius: "10px", padding: "8px 12px", cursor: "pointer", fontWeight: "bold" }}>
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteTrade(trade._id)}
                          disabled={deletingId === trade._id}
                          style={{
                            background: "var(--app-danger)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "10px",
                            padding: "8px 12px",
                            cursor: "pointer",
                            fontWeight: "bold",
                            opacity: deletingId === trade._id ? 0.7 : 1,
                          }}
                        >
                          {deletingId === trade._id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedTrades.length > displayedSelectedTrades.length ? (
                <div style={{ marginTop: "16px", display: "flex", justifyContent: "center" }}>
                  <button
                    type="button"
                    onClick={() => setVisibleSelectedTrades((prev) => prev + SELECTED_TRADES_STEP)}
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
        </div>
      )}
    </AppShell>
  );
}

export default CalendarPage;
