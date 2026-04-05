import React, { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import AuthLayout from "../components/AuthLayout";
import StatusBanner from "../components/StatusBanner";
import styles from "../styles";
import { API_URL } from "../config";
import { getFriendlyErrorMessage, readResponsePayload } from "../utils/apiFeedback";

function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState({
    tone: "info",
    title: "Welcome Back",
    message: "Sign in to continue to your trading journal.",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasToken = !!localStorage.getItem("token");

  useEffect(() => {
    document.title = "Login | TradeFocus";
  }, []);

  if (hasToken) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async () => {
    try {
      if (!identifier.trim()) {
        setStatus({
          tone: "warning",
          title: "Email or Username Required",
          message: "Enter your email or username before signing in.",
        });
        return;
      }

      if (!password) {
        setStatus({
          tone: "warning",
          title: "Password Required",
          message: "Enter your password before signing in.",
        });
        return;
      }

      setIsSubmitting(true);
      setStatus({
        tone: "info",
        title: "Signing In",
        message: "Checking your account details now.",
      });

      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await readResponsePayload(res);

      if (!res.ok) {
        setStatus({
          tone: "error",
          title: "Login Failed",
          message: getFriendlyErrorMessage({
            response: res,
            data,
            fallback: "We could not sign you in right now.",
            context: "Login",
          }),
        });
        return;
      }

      if (!data.token) {
        setStatus({
          tone: "error",
          title: "Login Failed",
          message: "We did not receive a valid sign-in token. Please try again.",
        });
        return;
      }

      localStorage.setItem("token", data.token);
      setStatus({
        tone: "success",
        title: "Welcome Back",
        message: "Login successful. Opening your dashboard now.",
      });
      navigate("/");
    } catch (error) {
      console.error("login error:", error);
      setStatus({
        tone: "error",
        title: "Connection Problem",
        message: getFriendlyErrorMessage({
          error,
          fallback: "We could not sign you in right now.",
          context: "Login",
        }),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="TradeFocus Login"
      title="A cleaner way to review every trade."
      subtitle="Sign in with your email or username to get back to your journal, performance breakdowns, and daily review flow."
    >
      <div style={{ marginBottom: "16px" }}>
        <StatusBanner tone={status.tone} title={status.title} message={status.message} />
      </div>

      <AuthCard
        title="Log In"
        subtitle="Secure access to your dashboard, journal, and settings."
        footer={
          <span>
            Don't have an account?{" "}
            <Link to="/signup" style={{ color: "var(--app-primary)", fontWeight: 700 }}>
              Sign up
            </Link>
          </span>
        }
      >
        <label style={{ display: "block", color: "var(--app-text)", fontWeight: 700, marginBottom: "8px" }}>
          Email or Username
        </label>
        <input
          type="text"
          placeholder="Enter your email or username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          style={styles.input}
          disabled={isSubmitting}
          autoComplete="username"
        />

        <label style={{ display: "block", color: "var(--app-text)", fontWeight: 700, marginBottom: "8px" }}>
          Password
        </label>
        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          disabled={isSubmitting}
          autoComplete="current-password"
        />

        <button
          type="button"
          onClick={handleLogin}
          style={{ ...styles.primaryButton, width: "100%", marginTop: "4px", opacity: isSubmitting ? 0.8 : 1 }}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing In..." : "Log In"}
        </button>
      </AuthCard>
    </AuthLayout>
  );
}

export default LoginPage;
