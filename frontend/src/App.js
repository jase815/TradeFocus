import React from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import ChartsPage from "./pages/ChartsPage";
import JournalPage from "./pages/JournalPage";
import AddTradePage from "./pages/AddTradePage";
import CalendarPage from "./pages/CalendarPage";
import SettingsPage from "./pages/SettingsPage";
import ImportTradesPage from "./pages/ImportTradesPage";
import AuthPage from "./pages/AuthPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import { ThemeProvider } from "./context/ThemeContext";

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicAuthRoute({ children }) {
  const token = localStorage.getItem("token");

  if (token) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/login"
            element={
              <PublicAuthRoute>
                <LoginPage />
              </PublicAuthRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicAuthRoute>
                <SignupPage />
              </PublicAuthRoute>
            }
          />

          <Route
            path="/"
            element={
              <PrivateRoute>
                <ChartsPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/charts"
            element={
              <PrivateRoute>
                <ChartsPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/calendar"
            element={
              <PrivateRoute>
                <CalendarPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/journal"
            element={
              <PrivateRoute>
                <JournalPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/add-trade"
            element={
              <PrivateRoute>
                <AddTradePage />
              </PrivateRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <SettingsPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/import-trades"
            element={
              <PrivateRoute>
                <ImportTradesPage />
              </PrivateRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
