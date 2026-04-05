import React from "react";
import styles from "../styles";

function AuthLayout({ eyebrow, title, subtitle, children }) {
  return (
    <div style={styles.page}>
      <div style={{ ...styles.container, maxWidth: "1120px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            gap: "24px",
            alignItems: "center",
            minHeight: "calc(100vh - 64px)",
          }}
        >
          <div
            style={{
              maxWidth: "520px",
              color: "var(--app-text)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                borderRadius: "999px",
                background: "var(--app-chip)",
                color: "var(--app-chip-text)",
                border: "1px solid var(--app-primary-border)",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                marginBottom: "16px",
              }}
            >
              <img
                src="/tradefocus-brand.png"
                alt="TradeFocus logo"
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "7px",
                  objectFit: "cover",
                  boxShadow: "var(--app-shadow-glow)",
                }}
              />
              {eyebrow || "TradeFocus"}
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(34px, 7vw, 56px)",
                lineHeight: 1.02,
                fontWeight: 900,
                letterSpacing: "-0.03em",
              }}
            >
              {title}
            </h1>

            <p
              style={{
                margin: "16px 0 0 0",
                maxWidth: "500px",
                color: "var(--app-text-soft)",
                fontSize: "16px",
                lineHeight: 1.7,
              }}
            >
              {subtitle}
            </p>

            <div
              style={{
                marginTop: "22px",
                display: "grid",
                gap: "12px",
              }}
            >
              {[
                "Track trades, screenshots, and AI reviews in one place.",
                "Built for mobile-first journaling without losing desktop depth.",
                "Dark-first workspace with light mode still available anytime.",
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    color: "var(--app-text-soft)",
                    fontSize: "14px",
                    lineHeight: 1.6,
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "999px",
                      background: "var(--app-primary)",
                      marginTop: "8px",
                      flexShrink: 0,
                    }}
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ width: "100%", maxWidth: "460px", justifySelf: "center" }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
