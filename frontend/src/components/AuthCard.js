import React from "react";
import styles from "../styles";

function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div
      style={{
        ...styles.card,
        maxWidth: "440px",
        margin: "0 auto",
        padding: "clamp(20px, 4vw, 28px)",
        background: "linear-gradient(180deg, color-mix(in srgb, var(--app-card) 88%, var(--app-surface-alt) 12%) 0%, var(--app-card-muted) 100%)",
      }}
    >
      <h2 style={{ ...styles.cardTitle, marginBottom: "10px" }}>{title}</h2>

      {subtitle ? (
        <div
          style={{
            fontSize: "14px",
            color: "var(--app-text-soft)",
            marginBottom: "18px",
            lineHeight: 1.6,
          }}
        >
          {subtitle}
        </div>
      ) : null}

      {children}

      {footer ? (
        <div
          style={{
            marginTop: "18px",
            paddingTop: "16px",
            borderTop: "1px solid var(--app-card-border)",
            fontSize: "13px",
            color: "var(--app-text-soft)",
            lineHeight: 1.6,
          }}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export default AuthCard;
