import React from "react";
import styles from "../styles";

function AuthCard({
  email,
  password,
  setEmail,
  setPassword,
  handleSignup,
  handleLogin,
  handleLogout,
  isSubmitting = false,
  activeAction = "",
}) {
  const hasToken = !!localStorage.getItem("token");

  return (
    <div style={{ ...styles.card, maxWidth: "420px", margin: "0 auto" }}>
      <h2 style={styles.cardTitle}>Account</h2>

      <div style={{ fontSize: "13px", color: "var(--app-text-soft)", marginBottom: "14px", lineHeight: 1.55 }}>
        {hasToken ? "You are currently logged in." : "Sign in or create an account to continue."}
      </div>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={styles.input}
        disabled={isSubmitting}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={styles.input}
        disabled={isSubmitting}
      />

      {!hasToken ? (
        <div style={styles.buttonRow}>
          <button
            onClick={handleSignup}
            style={{ ...styles.primaryButton, flex: "1 1 160px", opacity: isSubmitting ? 0.72 : 1 }}
            disabled={isSubmitting}
          >
            {activeAction === "signup" ? "Creating Account..." : "Sign Up"}
          </button>

          <button
            onClick={handleLogin}
            style={{ ...styles.secondaryButton, flex: "1 1 160px", opacity: isSubmitting ? 0.72 : 1 }}
            disabled={isSubmitting}
          >
            {activeAction === "login" ? "Signing In..." : "Login"}
          </button>
        </div>
      ) : (
        <div style={styles.buttonRow}>
          <button onClick={handleLogout} style={{ ...styles.deleteButton, flex: 1 }}>
            Logout
          </button>
        </div>
      )}

      <div style={{ marginTop: "14px", fontSize: "12px", color: "var(--app-text-muted)", textAlign: "center", lineHeight: 1.5 }}>
        Your account stores trades, presets, and AI reviews securely.
      </div>
    </div>
  );
}

export default AuthCard;
