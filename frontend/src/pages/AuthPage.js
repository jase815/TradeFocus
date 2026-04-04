import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles";
import AuthCard from "../components/AuthCard";

const API_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/+$/, "");

function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSignup = async () => {
    try {
      const res = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const text = await res.text();
      let data = {};

      try {
        data = JSON.parse(text);
      } catch {
        data = {};
      }

      if (!res.ok) {
        setMessage(data.message || "Signup failed");
        return;
      }

      setMessage(data.message || "Signup worked");
    } catch (error) {
      console.error("signup error:", error);
      setMessage("Signup crashed");
    }
  };

  const handleLogin = async () => {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const text = await res.text();
      let data = {};

      try {
        data = JSON.parse(text);
      } catch {
        data = {};
      }

      if (!res.ok) {
        setMessage(data.message || "Login failed");
        return;
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
        setMessage("Login successful");
        navigate("/");
      } else {
        setMessage(data.message || "Login failed");
      }
    } catch (error) {
      console.error("login error:", error);
      setMessage("Login crashed");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setMessage("Logged out");
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

        <div style={{ ...styles.card, maxWidth: "520px", margin: "0 auto" }}>
          <div style={{ marginBottom: "12px", color: "var(--app-text)" }}>
            {message || "Welcome"}
          </div>

          <AuthCard
            email={email}
            password={password}
            setEmail={setEmail}
            setPassword={setPassword}
            handleSignup={handleSignup}
            handleLogin={handleLogin}
            handleLogout={handleLogout}
          />
        </div>
      </div>
    </div>
  );
}

export default AuthPage;