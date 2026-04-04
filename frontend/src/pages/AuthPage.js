import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles";
import AuthCard from "../components/AuthCard";
import StatusBanner from "../components/StatusBanner";
import { API_URL } from "../config";
import { getFriendlyErrorMessage, readResponsePayload } from "../utils/apiFeedback";

function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState({
    tone: "info",
    title: "",
    message: "",
  });
  const [activeAction, setActiveAction] = useState("");
  const navigate = useNavigate();

  const handleSignup = async () => {
    try {
      setActiveAction("signup");
      setStatus({
        tone: "info",
        title: "Creating Account",
        message: "We're setting up your TradeFocus account now.",
      });

      const res = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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
        message: data.message || "Your account has been created. You can sign in now.",
      });
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
      setActiveAction("");
    }
  };

  const handleLogin = async () => {
    try {
      setActiveAction("login");
      setStatus({
        tone: "info",
        title: "Signing In",
        message: "Checking your account details.",
      });

      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await readResponsePayload(res);

      if (!res.ok) {
        setStatus({
          tone: "error",
          title: "Login Failed",
          message: getFriendlyErrorMessage({
            response: res,
            data,
            fallback: "We could not sign you in.",
            context: "Login",
          }),
        });
        return;
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
        setStatus({
          tone: "success",
          title: "Welcome Back",
          message: "Login successful. Opening your dashboard now.",
        });
        navigate("/");
      } else {
        setStatus({
          tone: "error",
          title: "Login Failed",
          message: data.message || "We could not sign you in.",
        });
      }
    } catch (error) {
      console.error("login error:", error);
      setStatus({
        tone: "error",
        title: "Connection Problem",
        message: getFriendlyErrorMessage({
          error,
          fallback: "We could not sign you in.",
          context: "Login",
        }),
      });
    } finally {
      setActiveAction("");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setStatus({
      tone: "success",
      title: "Logged Out",
      message: "You have been signed out.",
    });
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <img
              src="/tradefocus-brand.png"
              alt="TradeFocus logo"
              style={{
                width: "88px",
                height: "88px",
                borderRadius: "24px",
                objectFit: "cover",
                marginBottom: "16px",
                boxShadow: "var(--app-shadow-glow)",
              }}
            />
            <h1 style={styles.title}>TradeFocus</h1>
            <p style={styles.subtitle}>
              Login or create your account to access your dashboard.
            </p>
          </div>
        </div>

        <div style={{ maxWidth: "520px", margin: "0 auto", width: "100%" }}>
          <div style={{ marginBottom: "16px" }}>
            <StatusBanner
              tone={status.message ? status.tone : "info"}
              title={status.title || "Welcome"}
              message={status.message || "Sign in to continue or create your account to get started."}
            />
          </div>

          <AuthCard
            email={email}
            password={password}
            setEmail={setEmail}
            setPassword={setPassword}
            handleSignup={handleSignup}
            handleLogin={handleLogin}
            handleLogout={handleLogout}
            isSubmitting={!!activeAction}
            activeAction={activeAction}
          />
        </div>
      </div>
    </div>
  );
}

export default AuthPage;

