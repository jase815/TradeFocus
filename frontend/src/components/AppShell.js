import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useThemeMode } from "../context/ThemeContext";

const mobileNavItems = [
  { to: "/charts", label: "Charts", icon: "charts" },
  { to: "/calendar", label: "Calendar", icon: "calendar" },
  { to: "/add-trade", label: "Add Trade", icon: "add" },
  { to: "/journal", label: "Journal", icon: "journal" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

function IconBase({ children, size = 18, strokeWidth = 1.8 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <g
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
    </svg>
  );
}

function MenuIcon({ size = 20 }) {
  return (
    <IconBase size={size}>
      <path d="M4 7H20" />
      <path d="M4 12H20" />
      <path d="M4 17H20" />
    </IconBase>
  );
}

function ChartsIcon({ size = 18 }) {
  return (
    <IconBase size={size}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4V12L18 15" />
      <path d="M9 12A3 3 0 0 1 12 9" />
    </IconBase>
  );
}

function CalendarIcon({ size = 18 }) {
  return (
    <IconBase size={size}>
      <rect x="4" y="5" width="16" height="15" rx="3" />
      <path d="M8 3V7" />
      <path d="M16 3V7" />
      <path d="M4 10H20" />
      <path d="M8 14H8.01" />
      <path d="M12 14H12.01" />
      <path d="M16 14H16.01" />
    </IconBase>
  );
}

function AddTradeIcon({ size = 18 }) {
  return (
    <IconBase size={size}>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M12 8V16" />
      <path d="M8 12H16" />
    </IconBase>
  );
}

function JournalIcon({ size = 18 }) {
  return (
    <IconBase size={size}>
      <path d="M7 4.5H17A2.5 2.5 0 0 1 19.5 7V19H8.5A2.5 2.5 0 0 0 6 21.5V7A2.5 2.5 0 0 1 8.5 4.5" />
      <path d="M8 8H16" />
      <path d="M8 12H16" />
      <path d="M8 16H13" />
    </IconBase>
  );
}

function SettingsIcon({ size = 18 }) {
  return (
    <IconBase size={size}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5V5.2" />
      <path d="M12 18.8V20.5" />
      <path d="M20.5 12H18.8" />
      <path d="M5.2 12H3.5" />
      <path d="M17.8 6.2L16.6 7.4" />
      <path d="M7.4 16.6L6.2 17.8" />
      <path d="M17.8 17.8L16.6 16.6" />
      <path d="M7.4 7.4L6.2 6.2" />
    </IconBase>
  );
}

function getNavIcon(icon, isActive) {
  const size = isActive ? 19 : 18;

  if (icon === "charts") return <ChartsIcon size={size} />;
  if (icon === "calendar") return <CalendarIcon size={size} />;
  if (icon === "add") return <AddTradeIcon size={size} />;
  if (icon === "journal") return <JournalIcon size={size} />;
  if (icon === "settings") return <SettingsIcon size={size} />;
  return <IconBase size={size}><circle cx="12" cy="12" r="7" /></IconBase>;
}

function AppShell({ title, subtitle, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { themeMode, toggleThemeMode } = useThemeMode();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const activeMobileRoute = useMemo(() => {
    if (location.pathname === "/" || location.pathname === "/charts") {
      return "/charts";
    }

    return location.pathname;
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/auth");
  };

  const navLinkStyle = (isActive) => ({
    display: "block",
    padding: "13px 14px",
    borderRadius: "var(--app-radius-md)",
    textDecoration: "none",
    fontWeight: "bold",
    color: isActive ? "var(--app-nav-text)" : "var(--app-nav-muted)",
    background: isActive
      ? "linear-gradient(135deg, var(--app-primary) 0%, var(--app-primary-hover) 100%)"
      : "transparent",
    marginBottom: "8px",
    border: isActive ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent",
    boxShadow: isActive ? "var(--app-shadow-glow)" : "none",
  });

  return (
    <div
      className="app-shell"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, var(--app-bg-gradient-top) 0%, var(--app-bg-gradient-bottom) 100%)",
        color: "var(--app-text)",
        fontFamily: "Arial, sans-serif",
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
      }}
    >
      <div
        className="app-shell-header"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "var(--app-surface)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid color-mix(in srgb, var(--app-card-border) 70%, transparent)",
        }}
      >
        <div
          className="app-shell-header-inner"
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "16px clamp(14px, 3vw, 20px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          <div
            className="app-shell-topbar-left"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              minWidth: 0,
              flex: "1 1 420px",
            }}
          >
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              style={{
                minWidth: "46px",
                width: "46px",
                height: "46px",
                borderRadius: "14px",
                border: "1px solid color-mix(in srgb, var(--app-nav) 85%, white 15%)",
                background: "linear-gradient(135deg, var(--app-nav) 0%, color-mix(in srgb, var(--app-nav) 72%, var(--app-primary) 28%) 100%)",
                color: "#ffffff",
                cursor: "pointer",
                flexShrink: 0,
                boxShadow: "var(--app-shadow-nav)",
                display: "grid",
                placeItems: "center",
              }}
              aria-label="Open navigation"
            >
              <MenuIcon />
            </button>

            <div style={{ minWidth: 0, padding: "4px 0" }}>
              <div
                className="app-shell-brand-chip"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                  padding: "6px 10px",
                  borderRadius: "999px",
                  background: "var(--app-chip)",
                  color: "var(--app-chip-text)",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  border: "1px solid var(--app-primary-border)",
                  maxWidth: "100%",
                }}
              >
                <img
                  src="/tradefocus-brand.png"
                  alt="TradeFocus logo"
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "6px",
                    objectFit: "cover",
                    boxShadow: "0 0 16px color-mix(in srgb, var(--app-primary) 35%, transparent)",
                  }}
                />
                TradeFocus
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(24px, 5vw, 30px)",
                  color: "var(--app-text)",
                  lineHeight: 1.1,
                  fontWeight: 800,
                  wordBreak: "break-word",
                }}
              >
                {title}
              </h1>

              {subtitle ? (
                <div
                  style={{
                    marginTop: "5px",
                    color: "var(--app-text-soft)",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  {subtitle}
                </div>
              ) : null}
            </div>
          </div>

          <div
            className="app-shell-topbar-right"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "10px",
              flexWrap: "wrap",
              flex: "1 1 280px",
            }}
          >
            <button
              type="button"
              onClick={toggleThemeMode}
              style={{
                border: "1px solid var(--app-primary-border)",
                borderRadius: "14px",
                padding: "10px 14px",
                background: "linear-gradient(135deg, var(--app-card) 0%, var(--app-card-muted) 100%)",
                color: "var(--app-text)",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "var(--app-shadow-soft)",
              }}
            >
              {themeMode === "dark" ? "Light Mode" : "Dark Mode"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/settings")}
              style={{
                border: "1px solid var(--app-primary-border)",
                borderRadius: "14px",
                padding: "10px 14px",
                background: "linear-gradient(135deg, var(--app-card) 0%, var(--app-card-muted) 100%)",
                color: "var(--app-text)",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "var(--app-shadow-soft)",
              }}
            >
              Settings
            </button>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, var(--app-card) 0%, var(--app-card-muted) 100%)",
                border: "1px solid var(--app-card-border)",
                boxShadow: "var(--app-shadow-soft)",
                minWidth: 0,
              }}
            >
              <img
                src="/tradefocus-brand.png"
                alt="TradeFocus"
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "12px",
                  objectFit: "cover",
                  boxShadow: "var(--app-shadow-glow)",
                  flexShrink: 0,
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--app-text-soft)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  App
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    color: "var(--app-text)",
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  TradeFocus
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {menuOpen && (
        <>
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "var(--app-overlay)",
              zIndex: 60,
            }}
          />

          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "300px",
              maxWidth: "88vw",
              height: "100vh",
              background: "linear-gradient(180deg, var(--app-nav) 0%, color-mix(in srgb, var(--app-nav) 82%, var(--app-primary) 18%) 100%)",
              boxShadow: "var(--app-shadow-nav)",
              zIndex: 70,
              padding: "22px",
              boxSizing: "border-box",
              color: "var(--app-nav-text)",
            }}
          >
            <div
              style={{
                marginBottom: "20px",
                padding: "16px",
                borderRadius: "var(--app-radius-lg)",
                background: "linear-gradient(135deg, rgba(96,165,250,0.24) 0%, rgba(96,165,250,0.08) 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "10px",
                }}
              >
                <img
                  src="/tradefocus-brand.png"
                  alt="TradeFocus logo"
                  style={{
                    width: "46px",
                    height: "46px",
                    borderRadius: "14px",
                    objectFit: "cover",
                    boxShadow: "var(--app-shadow-glow)",
                  }}
                />

                <div>
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: 800,
                      color: "#ffffff",
                      lineHeight: 1.1,
                    }}
                  >
                    TradeFocus
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "var(--app-nav-muted)",
                      marginTop: "4px",
                    }}
                  >
                    Focused trading journal
                  </div>
                </div>
              </div>

              <div
                style={{
                  fontSize: "12px",
                  color: "var(--app-nav-muted)",
                  lineHeight: 1.5,
                }}
              >
                Clean tracking. Better review. Sharper decisions.
              </div>
            </div>

            <Link
              to="/charts"
              style={navLinkStyle(location.pathname === "/" || location.pathname === "/charts")}
            >
              Charts
            </Link>
            <Link to="/calendar" style={navLinkStyle(location.pathname === "/calendar")}>
              Calendar
            </Link>
            <Link to="/journal" style={navLinkStyle(location.pathname === "/journal")}>
              Journal
            </Link>
            <Link to="/add-trade" style={navLinkStyle(location.pathname === "/add-trade")}>
              Add Trade
            </Link>
            <Link to="/import-trades" style={navLinkStyle(location.pathname === "/import-trades")}>
              Import Trades
            </Link>
            <Link to="/settings" style={navLinkStyle(location.pathname === "/settings")}>
              Settings
            </Link>

            <div
              style={{
                marginTop: "20px",
                paddingTop: "20px",
                borderTop: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: "var(--app-radius-md)",
                  padding: "13px 14px",
                  background: "linear-gradient(135deg, var(--app-danger) 0%, color-mix(in srgb, var(--app-danger) 86%, white 14%) 100%)",
                  color: "#ffffff",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </>
      )}

      <div
        className="app-shell-content"
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "24px clamp(14px, 3vw, 20px) 40px",
          width: "100%",
          overflowX: "hidden",
        }}
      >
        {children}
      </div>

      <nav
        className="mobile-bottom-nav"
        aria-label="Mobile navigation"
        style={{
          position: "fixed",
          left: "12px",
          right: "12px",
          bottom: "10px",
          zIndex: 55,
          display: "none",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "8px",
          padding: "8px",
          borderRadius: "24px",
          background: "color-mix(in srgb, var(--app-surface) 88%, transparent)",
          backdropFilter: "blur(18px)",
          border: "1px solid color-mix(in srgb, var(--app-card-border) 76%, transparent)",
          boxShadow: "0 18px 40px rgba(15,23,42,0.18)",
        }}
      >
        {mobileNavItems.map((item) => {
          const isActive = activeMobileRoute === item.to;

          return (
            <Link
              key={item.to}
              to={item.to}
              style={{
                textDecoration: "none",
                color: isActive ? "#ffffff" : "var(--app-text-soft)",
              }}
            >
              <div
                style={{
                  minHeight: "58px",
                  borderRadius: "18px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  background: isActive
                    ? "linear-gradient(135deg, var(--app-primary) 0%, var(--app-primary-hover) 100%)"
                    : "transparent",
                  boxShadow: isActive ? "var(--app-shadow-glow)" : "none",
                  fontWeight: 700,
                }}
              >
                <span style={{ lineHeight: 1, display: "grid", placeItems: "center" }}>
                  {getNavIcon(item.icon, isActive)}
                </span>
                <span style={{ fontSize: "11px", lineHeight: 1.1 }}>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default AppShell;


