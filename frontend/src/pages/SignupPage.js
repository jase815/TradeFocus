import React, { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import AuthLayout from "../components/AuthLayout";
import StatusBanner from "../components/StatusBanner";
import styles from "../styles";
import { API_URL } from "../config";
import { getFriendlyErrorMessage, readResponsePayload } from "../utils/apiFeedback";

function SignupPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState({
    tone: "info",
    title: "Create Your Account",
    message: "Set up your TradeFocus workspace in under a minute.",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasToken = !!localStorage.getItem("token");

  useEffect(() => {
    document.title = "Sign Up | TradeFocus";
  }, []);

  if (hasToken) {
    return <Navigate to="/" replace />;
  }

  const handleSignup = async () => {
    try {
      if (!username.trim()) {
        setStatus({
          tone: "warning",
          title: "Username Required",
          message: "Choose a username to create your account.",
        });
        return;
      }

      if (!email.trim()) {
        setStatus({
          tone: "warning",
          title: "Email Required",
          message: "Enter your email to create your account.",
        });
        return;
      }

      if (!password) {
        setStatus({
          tone: "warning",
          title: "Password Required",
          message: "Create a password before signing up.",
        });
        return;
      }

      if (!confirmPassword) {
        setStatus({
          tone: "warning",
          title: "Confirm Your Password",
          message: "Re-enter your password so we can confirm it matches.",
        });
        return;
      }

      if (password !== confirmPassword) {
        setStatus({
          tone: "error",
          title: "Passwords Do Not Match",
          message: "Make sure both password fields match before creating your account.",
        });
        return;
      }

      setIsSubmitting(true);
      setStatus({
        tone: "info",
        title: "Creating Account",
        message: "Setting up your TradeFocus account now.",
      });

      const res = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await readResponsePayload(res);

      if (!res.ok) {
        setStatus({
          tone: "error",
          title: "Could Not Sign Up",
          message: getFriendlyErrorMessage({
            response: res,
            data,
            fallback: "We could not create your account right now.",
            context: "Signup",
          }),
        });
        return;
      }

      setStatus({
        tone: "success",
        title: "Account Ready",
        message: data.message || "Your account is ready. You can log in now.",
      });

      setTimeout(() => navigate("/login"), 500);
    } catch (error) {
      console.error("signup error:", error);
      setStatus({
        tone: "error",
        title: "Connection Problem",
        message: getFriendlyErrorMessage({
          error,
          fallback: "We could not create your account right now.",
          context: "Signup",
        }),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="TradeFocus Sign Up"
      title="Build a journal you actually want to use."
      subtitle="Create your account with a username, save your trades securely, and keep your reviews synced across desktop and mobile."
    >
      <div style={{ marginBottom: "16px" }}>
        <StatusBanner tone={status.tone} title={status.title} message={status.message} />
      </div>

      <AuthCard
        title="Sign Up"
        subtitle="Create a secure account with a username and email."
        footer={
          <span>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "var(--app-primary)", fontWeight: 700 }}>
              Log in
            </Link>
          </span>
        }
      >
        <label style={{ display: "block", color: "var(--app-text)", fontWeight: 700, marginBottom: "8px" }}>
          Username
        </label>
        <input
          type="text"
          placeholder="Choose a username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={styles.input}
          disabled={isSubmitting}
          autoComplete="username"
        />

        <label style={{ display: "block", color: "var(--app-text)", fontWeight: 700, marginBottom: "8px" }}>
          Email
        </label>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          disabled={isSubmitting}
          autoComplete="email"
        />

        <label style={{ display: "block", color: "var(--app-text)", fontWeight: 700, marginBottom: "8px" }}>
          Password
        </label>
        <input
          type="password"
          placeholder="Create a password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          disabled={isSubmitting}
          autoComplete="new-password"
        />

        <label style={{ display: "block", color: "var(--app-text)", fontWeight: 700, marginBottom: "8px" }}>
          Confirm Password
        </label>
        <input
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={styles.input}
          disabled={isSubmitting}
          autoComplete="new-password"
        />

        <button
          type="button"
          onClick={handleSignup}
          style={{ ...styles.primaryButton, width: "100%", marginTop: "4px", opacity: isSubmitting ? 0.8 : 1 }}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating Account..." : "Create Account"}
        </button>
      </AuthCard>
    </AuthLayout>
  );
}

export default SignupPage;
