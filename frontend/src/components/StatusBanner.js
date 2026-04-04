import React from "react";

function StatusBanner({ tone = "info", title = "", message = "", compact = false }) {
  if (!message) return null;

  const palette = {
    info: {
      background: "linear-gradient(135deg, var(--app-card) 0%, var(--app-card-muted) 100%)",
      border: "1px solid var(--app-card-border)",
      color: "var(--app-text)",
    },
    success: {
      background: "linear-gradient(135deg, var(--app-success-bg) 0%, color-mix(in srgb, var(--app-success-bg) 72%, var(--app-card) 28%) 100%)",
      border: "1px solid var(--app-success-border)",
      color: "var(--app-success)",
    },
    warning: {
      background: "linear-gradient(135deg, color-mix(in srgb, #f59e0b 14%, var(--app-card) 86%) 0%, color-mix(in srgb, #fbbf24 16%, var(--app-card-muted) 84%) 100%)",
      border: "1px solid color-mix(in srgb, #f59e0b 45%, var(--app-card-border) 55%)",
      color: "#b45309",
    },
    error: {
      background: "linear-gradient(135deg, var(--app-danger-bg) 0%, color-mix(in srgb, var(--app-danger-bg) 74%, var(--app-card) 26%) 100%)",
      border: "1px solid var(--app-danger-border)",
      color: "var(--app-danger)",
    },
  };

  const selected = palette[tone] || palette.info;

  return (
    <div
      style={{
        borderRadius: compact ? "16px" : "18px",
        padding: compact ? "12px 14px" : "14px 16px",
        background: selected.background,
        border: selected.border,
        color: selected.color,
        boxShadow: "var(--app-shadow-soft)",
        width: "100%",
        maxWidth: "100%",
      }}
    >
      {title ? (
        <div
          style={{
            fontSize: "13px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: "4px",
          }}
        >
          {title}
        </div>
      ) : null}

      <div
        style={{
          fontSize: compact ? "13px" : "14px",
          lineHeight: 1.55,
          color: tone === "info" ? "var(--app-text)" : selected.color,
        }}
      >
        {message}
      </div>
    </div>
  );
}

export default StatusBanner;
