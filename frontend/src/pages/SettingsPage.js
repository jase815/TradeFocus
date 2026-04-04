import React, { useCallback, useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import StatusBanner from "../components/StatusBanner";
import styles from "../styles";
import { useThemeMode } from "../context/ThemeContext";
import { API_URL } from "../config";
import { getFriendlyErrorMessage, readResponsePayload } from "../utils/apiFeedback";

const defaultSettings = {
  displayName: "",
  broker: "",
  platform: "",
  accountType: "Personal",
  startingBalance: "",
  currentBalance: "",
  defaultSymbol: "",
  defaultContracts: "1",
  defaultRiskPerTrade: "",
  dailyLossLimit: "",
  weeklyLossLimit: "",
  timezone: "America/Chicago",
  currency: "USD",
  notesTemplate: "",
  darkMode: false,
  autoOpenJournalAfterSave: true,
  showWeekendsInCalendar: true,
  enableTradeReviewReminders: false,
};

function PreferenceToggle({ label, hint, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: "100%",
        textAlign: "left",
        border: "1px solid var(--app-card-border)",
        borderRadius: "16px",
        padding: "14px 16px",
        background: checked
          ? "linear-gradient(135deg, var(--app-primary-soft) 0%, var(--app-card-muted) 100%)"
          : "linear-gradient(135deg, var(--app-card) 0%, var(--app-card-muted) 100%)",
        color: "var(--app-text)",
        cursor: "pointer",
        marginBottom: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontWeight: 700, marginBottom: "4px" }}>{label}</div>
          <div style={{ color: "var(--app-text-soft)", fontSize: "13px", lineHeight: 1.5 }}>
            {hint}
          </div>
        </div>

        <div
          style={{
            width: "54px",
            height: "30px",
            borderRadius: "999px",
            background: checked ? "var(--app-primary)" : "var(--app-input-border)",
            position: "relative",
            transition: "background 160ms ease",
            flexShrink: 0,
            boxShadow: checked ? "var(--app-shadow-glow)" : "none",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: "4px",
              left: checked ? "28px" : "4px",
              width: "22px",
              height: "22px",
              borderRadius: "50%",
              background: "#ffffff",
              transition: "left 160ms ease",
              boxShadow: "0 6px 12px rgba(15,23,42,0.22)",
            }}
          />
        </div>
      </div>
    </button>
  );
}

function SettingsPage() {
  const { themeMode, setThemeMode } = useThemeMode();
  const [settings, setSettings] = useState(defaultSettings);
  const [status, setStatus] = useState({ tone: "info", title: "", message: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSettings((prev) => ({
      ...prev,
      darkMode: themeMode === "dark",
    }));
  }, [themeMode]);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setStatus({
        tone: "info",
        title: "Loading Settings",
        message: "Pulling in your account preferences.",
      });

      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_URL}/api/settings`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await readResponsePayload(res);

      if (res.ok && data) {
        setSettings({
          displayName: data.displayName ?? "",
          broker: data.broker ?? "",
          platform: data.platform ?? "",
          accountType: data.accountType ?? "Personal",
          startingBalance:
            data.startingBalance === 0 || data.startingBalance ? String(data.startingBalance) : "",
          currentBalance:
            data.currentBalance === 0 || data.currentBalance ? String(data.currentBalance) : "",
          defaultSymbol: data.defaultSymbol ?? "",
          defaultContracts:
            data.defaultContracts === 0 || data.defaultContracts ? String(data.defaultContracts) : "1",
          defaultRiskPerTrade:
            data.defaultRiskPerTrade === 0 || data.defaultRiskPerTrade
              ? String(data.defaultRiskPerTrade)
              : "",
          dailyLossLimit:
            data.dailyLossLimit === 0 || data.dailyLossLimit ? String(data.dailyLossLimit) : "",
          weeklyLossLimit:
            data.weeklyLossLimit === 0 || data.weeklyLossLimit ? String(data.weeklyLossLimit) : "",
          timezone: data.timezone ?? "America/Chicago",
          currency: data.currency ?? "USD",
          notesTemplate: data.notesTemplate ?? "",
          darkMode: typeof data.darkMode === "boolean" ? data.darkMode : themeMode === "dark",
          autoOpenJournalAfterSave:
            typeof data.autoOpenJournalAfterSave === "boolean"
              ? data.autoOpenJournalAfterSave
              : true,
          showWeekendsInCalendar:
            typeof data.showWeekendsInCalendar === "boolean" ? data.showWeekendsInCalendar : true,
          enableTradeReviewReminders:
            typeof data.enableTradeReviewReminders === "boolean"
              ? data.enableTradeReviewReminders
              : false,
        });

        setStatus({
          tone: "success",
          title: "Settings Ready",
          message: "Your saved preferences are loaded.",
        });
      } else {
        setStatus({
          tone: "error",
          title: "Could Not Load Settings",
          message: getFriendlyErrorMessage({
            response: res,
            data,
            fallback: "We could not load your settings right now.",
            context: "Settings",
          }),
        });
      }
    } catch (error) {
      console.error("fetch settings error:", error);
      setStatus({
        tone: "error",
        title: "Connection Problem",
        message: getFriendlyErrorMessage({
          error,
          fallback: "We could not load your settings right now.",
          context: "Settings",
        }),
      });
    } finally {
      setLoading(false);
    }
  }, [themeMode]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));

    if (field === "darkMode") {
      setThemeMode(value ? "dark" : "light");
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setStatus({
        tone: "info",
        title: "Saving Settings",
        message: "Applying your latest preferences.",
      });

      const token = localStorage.getItem("token") || "";

      const payload = {
        ...settings,
        startingBalance: settings.startingBalance === "" ? 0 : Number(settings.startingBalance),
        currentBalance: settings.currentBalance === "" ? 0 : Number(settings.currentBalance),
        defaultContracts: settings.defaultContracts === "" ? 1 : Number(settings.defaultContracts),
        defaultRiskPerTrade:
          settings.defaultRiskPerTrade === "" ? 0 : Number(settings.defaultRiskPerTrade),
        dailyLossLimit: settings.dailyLossLimit === "" ? 0 : Number(settings.dailyLossLimit),
        weeklyLossLimit: settings.weeklyLossLimit === "" ? 0 : Number(settings.weeklyLossLimit),
      };

      const res = await fetch(`${API_URL}/api/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await readResponsePayload(res);

      if (res.ok) {
        setStatus({
          tone: "success",
          title: "Settings Saved",
          message: data.message || "Your settings have been updated.",
        });
      } else {
        setStatus({
          tone: "error",
          title: "Save Failed",
          message: getFriendlyErrorMessage({
            response: res,
            data,
            fallback: "We could not save your settings right now.",
            context: "Settings",
          }),
        });
      }
    } catch (error) {
      console.error("save settings error:", error);
      setStatus({
        tone: "error",
        title: "Save Failed",
        message: getFriendlyErrorMessage({
          error,
          fallback: "We could not save your settings right now.",
          context: "Settings",
        }),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="Settings"
      subtitle="Manage your journal defaults, visual theme, risk limits, and preferences."
    >
      <div style={{ marginBottom: "20px" }}>
        <StatusBanner
          tone={status.message ? status.tone : "info"}
          title={status.title || "Settings"}
          message={
            status.message ||
            "Update your defaults and workspace preferences here."
          }
        />
      </div>

      {loading ? (
        <div style={styles.card}>Loading your settings...</div>
      ) : (
        <>
          <div style={styles.mainGrid}>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Account Profile</h2>

              <input
                type="text"
                placeholder="Display Name"
                value={settings.displayName}
                onChange={(e) => handleChange("displayName", e.target.value)}
                style={styles.input}
              />
              <input
                type="text"
                placeholder="Broker"
                value={settings.broker}
                onChange={(e) => handleChange("broker", e.target.value)}
                style={styles.input}
              />
              <input
                type="text"
                placeholder="Platform"
                value={settings.platform}
                onChange={(e) => handleChange("platform", e.target.value)}
                style={styles.input}
              />
              <select
                value={settings.accountType}
                onChange={(e) => handleChange("accountType", e.target.value)}
                style={styles.input}
              >
                <option value="Personal">Personal</option>
                <option value="Prop Firm">Prop Firm</option>
                <option value="Sim">Sim</option>
                <option value="Funded">Funded</option>
              </select>

              <div style={styles.twoCol}>
                <input
                  type="number"
                  placeholder="Starting Balance"
                  value={settings.startingBalance}
                  onChange={(e) => handleChange("startingBalance", e.target.value)}
                  style={styles.input}
                />
                <input
                  type="number"
                  placeholder="Current Balance"
                  value={settings.currentBalance}
                  onChange={(e) => handleChange("currentBalance", e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Trade Defaults</h2>

              <input
                type="text"
                placeholder="Default Symbol"
                value={settings.defaultSymbol}
                onChange={(e) => handleChange("defaultSymbol", e.target.value)}
                style={styles.input}
              />

              <div style={styles.twoCol}>
                <input
                  type="number"
                  placeholder="Default Contracts"
                  value={settings.defaultContracts}
                  onChange={(e) => handleChange("defaultContracts", e.target.value)}
                  style={styles.input}
                />
                <input
                  type="number"
                  placeholder="Default Risk Per Trade"
                  value={settings.defaultRiskPerTrade}
                  onChange={(e) => handleChange("defaultRiskPerTrade", e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.twoCol}>
                <input
                  type="number"
                  placeholder="Daily Loss Limit"
                  value={settings.dailyLossLimit}
                  onChange={(e) => handleChange("dailyLossLimit", e.target.value)}
                  style={styles.input}
                />
                <input
                  type="number"
                  placeholder="Weekly Loss Limit"
                  value={settings.weeklyLossLimit}
                  onChange={(e) => handleChange("weeklyLossLimit", e.target.value)}
                  style={styles.input}
                />
              </div>

              <textarea
                placeholder="Notes Template"
                value={settings.notesTemplate}
                onChange={(e) => handleChange("notesTemplate", e.target.value)}
                style={styles.textarea}
              />
            </div>

            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Regional Settings</h2>

              <input
                type="text"
                placeholder="Timezone"
                value={settings.timezone}
                onChange={(e) => handleChange("timezone", e.target.value)}
                style={styles.input}
              />

              <select
                value={settings.currency}
                onChange={(e) => handleChange("currency", e.target.value)}
                style={styles.input}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
              </select>
            </div>

            <div style={styles.card}>
              <h2 style={styles.cardTitle}>App Preferences</h2>

              <PreferenceToggle
                label="Dark Mode"
                hint="Switch the app between the standard light theme and a darker workspace-friendly theme."
                checked={settings.darkMode}
                onChange={(checked) => handleChange("darkMode", checked)}
              />
              <PreferenceToggle
                label="Auto-open Journal after saving a trade"
                hint="Jump to your journal immediately after a successful save."
                checked={settings.autoOpenJournalAfterSave}
                onChange={(checked) => handleChange("autoOpenJournalAfterSave", checked)}
              />
              <PreferenceToggle
                label="Show weekends in calendar"
                hint="Keep Saturday and Sunday visible in the calendar view."
                checked={settings.showWeekendsInCalendar}
                onChange={(checked) => handleChange("showWeekendsInCalendar", checked)}
              />
              <PreferenceToggle
                label="Enable trade review reminders"
                hint="Surface reminders to revisit trades and notes after the session."
                checked={settings.enableTradeReviewReminders}
                onChange={(checked) => handleChange("enableTradeReviewReminders", checked)}
              />
            </div>
          </div>

          <div style={{ marginTop: "8px" }}>
            <button onClick={saveSettings} style={styles.primaryButton} disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </>
      )}
    </AppShell>
  );
}

export default SettingsPage;
