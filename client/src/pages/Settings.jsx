import { useEffect, useState, useCallback } from "react";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";
import api from "../services/api";
import { authService } from "../services";
import PageHeader from "../components/PageHeader";
import Pill from "../components/Pill";
import Logo from "../components/Logo";

export default function Settings() {
  const { user, updateUser } = useAuth();
  const toast = useToast();

  // Theme state
  const [theme, setTheme] = useState(() => {
    return (
      localStorage.getItem("inventory-theme") ||
      document.documentElement.dataset.theme ||
      "dark"
    );
  });

  // Health check state
  const [healthStatus, setHealthStatus] = useState({
    backend: "checking...",
    database: "checking...",
    ml: "checking...",
  });
  const [lastChecked, setLastChecked] = useState(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  // Profile form state
  const [name, setName] = useState(user?.name || "");
  const [changePassword, setChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Sync name if user changes in context
  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  // Real Health Check function
  const runHealthCheck = useCallback(async () => {
    setCheckingHealth(true);
    const now = new Date();

    try {
      const res = await api.get("/health", { timeout: 3000 });
      const data = res.data || {};
      const dbOperational =
        data.services?.database === "operational" ||
        data.database === "connected";
      const mlOperational = data.services?.ml === "operational";

      setHealthStatus({
        backend: "Operational",
        database: dbOperational ? "Operational" : "Down",
        ml: mlOperational ? "Operational" : "Down",
      });
    } catch {
      // If backend is down, check direct ML service as fallback
      let directMlStatus = "Down";
      try {
        const mlUrl = import.meta.env.VITE_ML_URL || "http://localhost:8000";
        const mlRes = await fetch(`${mlUrl}/health`, { signal: AbortSignal.timeout(2000) });
        if (mlRes.ok) directMlStatus = "Operational";
      } catch {
        directMlStatus = "Down";
      }

      setHealthStatus({
        backend: "Down",
        database: "Down",
        ml: directMlStatus,
      });
    } finally {
      setLastChecked(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setCheckingHealth(false);
    }
  }, []);

  useEffect(() => {
    runHealthCheck();
  }, [runHealthCheck]);

  // Theme switch handler with persistence and event broadcast
  const switchTheme = (newTheme) => {
    setTheme(newTheme);
    document.documentElement.dataset.theme = newTheme;
    localStorage.setItem("inventory-theme", newTheme);
    window.dispatchEvent(new CustomEvent("inventory-theme-changed", { detail: newTheme }));
    toast.info(`Theme set to ${newTheme} mode`);
  };

  // Profile update handler
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError("");

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setProfileError("Name must be at least 2 characters.");
      return;
    }

    if (changePassword) {
      if (!currentPassword) {
        setProfileError("Current password is required to change password.");
        return;
      }
      if (newPassword.length < 6) {
        setProfileError("New password must be at least 6 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setProfileError("New password and confirmation do not match.");
        return;
      }
    }

    setSavingProfile(true);
    try {
      const payload = { name: trimmedName };
      if (changePassword && newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await authService.updateProfile(payload);
      if (res.data?.user && updateUser) {
        updateUser(res.data.user);
      }
      toast.success("Profile details updated successfully.");
      setChangePassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setProfileError(
        err.response?.data?.message || err.message || "Failed to update profile."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="settings-page">
      <PageHeader
        title="Settings & Preferences"
        subtitle="Manage user credentials, appearance themes, and review real-time microservice infrastructure health."
      />

      <div className="settings-grid">
        {/* Card 1: User Profile & Security */}
        <section className="card settings-card">
          <div className="settings-card-body">
            <h3>User Profile &amp; Security</h3>
            <p className="muted small">
              Update your personal display name and password credentials. Email and assigned role are immutable.
            </p>

            {profileError && (
              <div
                className="alert error"
                style={{ marginTop: "12px", marginBottom: "12px", fontSize: "12.5px" }}
              >
                {profileError}
              </div>
            )}

            <form onSubmit={handleProfileSubmit} style={{ marginTop: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label
                    htmlFor="profile-name"
                    style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}
                  >
                    Display Name
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    required
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label
                      htmlFor="profile-email"
                      style={{ fontSize: "12px", fontWeight: 600 }}
                    >
                      Email Address
                    </label>
                    <span className="small muted" style={{ fontSize: "11px" }}>Read-only</span>
                  </div>
                  <input
                    id="profile-email"
                    type="email"
                    value={user?.email || "user@inventory.com"}
                    disabled
                    style={{ width: "100%", opacity: 0.75, cursor: "not-allowed" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                    Assigned Role
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                    <span className={`role-badge ${user?.role || "staff"}`}>
                      {user?.role || "staff"}
                    </span>
                    <span className="small muted" style={{ fontSize: "11px" }}>
                      Permissions managed by system administrator
                    </span>
                  </div>
                </div>

                {/* Password Change Section */}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px", marginTop: "4px" }}>
                  <button
                    type="button"
                    className="btn small"
                    onClick={() => {
                      setChangePassword(!changePassword);
                      setProfileError("");
                    }}
                    style={{
                      background: "transparent",
                      border: "1px solid var(--border)",
                      color: "var(--accent)",
                      cursor: "pointer",
                    }}
                  >
                    {changePassword ? "Cancel Password Change" : "🔑 Change Password"}
                  </button>

                  {changePassword && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                      <div>
                        <label
                          htmlFor="current-password"
                          style={{ display: "block", fontSize: "11.5px", fontWeight: 600, marginBottom: "4px" }}
                        >
                          Current Password
                        </label>
                        <input
                          id="current-password"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Verify current password"
                          required
                          style={{ width: "100%" }}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="new-password"
                          style={{ display: "block", fontSize: "11.5px", fontWeight: 600, marginBottom: "4px" }}
                        >
                          New Password (min 6 characters)
                        </label>
                        <input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new secure password"
                          required
                          minLength={6}
                          style={{ width: "100%" }}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="confirm-password"
                          style={{ display: "block", fontSize: "11.5px", fontWeight: 600, marginBottom: "4px" }}
                        >
                          Confirm New Password
                        </label>
                        <input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          required
                          style={{ width: "100%" }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: "18px", display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={savingProfile}
                >
                  {savingProfile ? "Saving..." : "Save Profile Changes"}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Card 2: Appearance & Theme */}
        <section className="card settings-card">
          <div className="settings-card-body">
            <h3>Appearance &amp; Theme</h3>
            <p className="muted small">
              Customize the visual interface appearance. Settings persist automatically across browser sessions.
            </p>

            <div className="theme-tiles-grid">
              {/* Dark Theme Tile */}
              <div
                className={`theme-tile ${theme === "dark" ? "active" : ""}`}
                onClick={() => switchTheme("dark")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && switchTheme("dark")}
                aria-pressed={theme === "dark"}
              >
                <div className="theme-tile-header">
                  <div className="theme-tile-name">
                    <span>🌙</span> Dark Mode
                  </div>
                  {theme === "dark" ? (
                    <Pill tone="healthy" label="Active">Active</Pill>
                  ) : (
                    <span className="small muted" style={{ fontSize: "11px" }}>Select</span>
                  )}
                </div>
                <div className="theme-tile-preview dark-preview">
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6" }} />
                  <span style={{ width: "40px", height: "4px", borderRadius: "2px", background: "#334155" }} />
                  <span style={{ width: "24px", height: "4px", borderRadius: "2px", background: "#1e293b" }} />
                </div>
                <span className="small muted" style={{ fontSize: "11px" }}>
                  High contrast dark theme tuned for reduced eye strain in low-light environments.
                </span>
              </div>

              {/* Light Theme Tile */}
              <div
                className={`theme-tile ${theme === "light" ? "active" : ""}`}
                onClick={() => switchTheme("light")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && switchTheme("light")}
                aria-pressed={theme === "light"}
              >
                <div className="theme-tile-header">
                  <div className="theme-tile-name">
                    <span>☀️</span> Light Mode
                  </div>
                  {theme === "light" ? (
                    <Pill tone="healthy" label="Active">Active</Pill>
                  ) : (
                    <span className="small muted" style={{ fontSize: "11px" }}>Select</span>
                  )}
                </div>
                <div className="theme-tile-preview light-preview">
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2563eb" }} />
                  <span style={{ width: "40px", height: "4px", borderRadius: "2px", background: "#cbd5e1" }} />
                  <span style={{ width: "24px", height: "4px", borderRadius: "2px", background: "#e2e8f0" }} />
                </div>
                <span className="small muted" style={{ fontSize: "11px" }}>
                  Clean, high-visibility bright theme optimized for daylight and office lighting.
                </span>
              </div>
            </div>
          </div>

          <div className="settings-card-footer">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="small muted">
                Active Theme: <strong>{theme === "dark" ? "Dark Mode" : "Light Mode"}</strong>
              </span>
              <button
                type="button"
                className="btn small"
                onClick={() => switchTheme(theme === "dark" ? "light" : "dark")}
              >
                Toggle Theme ({theme === "dark" ? "☀️ Light" : "🌙 Dark"})
              </button>
            </div>
          </div>
        </section>

        {/* Card 3: Microservices Status */}
        <section className="card settings-card">
          <div className="settings-card-body">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3>Microservices Status</h3>
                <p className="muted small">
                  Live connectivity and health across gateway servers, database clusters, and ML microservices.
                </p>
              </div>
              <button
                type="button"
                className="btn small"
                onClick={runHealthCheck}
                disabled={checkingHealth}
                style={{ whiteSpace: "nowrap" }}
              >
                {checkingHealth ? "Checking..." : "🔄 Refresh"}
              </button>
            </div>

            <div className="health-list">
              <div className="health-item">
                <div className="health-item-name">
                  <span>⚡</span>
                  <div>
                    <strong>Backend Server</strong>
                    <div className="small muted" style={{ fontSize: "11px" }}>Node.js / Express API (:5000)</div>
                  </div>
                </div>
                <div>
                  <Pill
                    tone={
                      healthStatus.backend === "Operational"
                        ? "healthy"
                        : healthStatus.backend === "checking..."
                        ? "info"
                        : "critical"
                    }
                    label={healthStatus.backend}
                  >
                    {healthStatus.backend}
                  </Pill>
                </div>
              </div>

              <div className="health-item">
                <div className="health-item-name">
                  <span>🗄️</span>
                  <div>
                    <strong>Database Cluster</strong>
                    <div className="small muted" style={{ fontSize: "11px" }}>MongoDB Atlas Replica Set</div>
                  </div>
                </div>
                <div>
                  <Pill
                    tone={
                      healthStatus.database === "Operational"
                        ? "healthy"
                        : healthStatus.database === "checking..."
                        ? "info"
                        : "critical"
                    }
                    label={healthStatus.database}
                  >
                    {healthStatus.database}
                  </Pill>
                </div>
              </div>

              <div className="health-item">
                <div className="health-item-name">
                  <span>🧠</span>
                  <div>
                    <strong>ML Intelligence Node</strong>
                    <div className="small muted" style={{ fontSize: "11px" }}>FastAPI / Scikit-Learn (:8000)</div>
                  </div>
                </div>
                <div>
                  <Pill
                    tone={
                      healthStatus.ml === "Operational"
                        ? "healthy"
                        : healthStatus.ml === "checking..."
                        ? "info"
                        : "critical"
                    }
                    label={healthStatus.ml}
                  >
                    {healthStatus.ml}
                  </Pill>
                </div>
              </div>
            </div>
          </div>

          <div className="settings-card-footer">
            <div className="health-footer">
              <span>
                Last checked: <strong>{lastChecked || "Just now"}</strong>
              </span>
              <div className="settings-about-line">
                <Logo iconOnly height={16} alt="Replenix" style={{ marginRight: 2 }} />
                <span>About:</span>
                <code>Replenix v1.2.0</code>
                <span>·</span>
                <code>Vite + React 19</code>
              </div>
            </div>
          </div>
        </section>

        {/* Card 4: Help & Operational Guide */}
        <section className="card settings-card">
          <div className="settings-card-body">
            <h3>Help &amp; Operational Guide</h3>
            <p className="muted small">
              Quick reference for core supply chain inventory formulas, model architectures, and security compliance.
            </p>

            <ul
              style={{
                paddingLeft: "18px",
                marginTop: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
              className="small muted"
            >
              <li>
                <strong style={{ color: "var(--text)" }}>Reorder Point (ROP):</strong> Calculated dynamically as{" "}
                <code>Lead Time Demand + Safety Stock</code> based on historical demand variance.
              </li>
              <li>
                <strong style={{ color: "var(--text)" }}>Stockout Risk Model:</strong> Platt-calibrated Logistic
                Regression with StandardScaler predicting exact probability of stock exhaustion.
              </li>
              <li>
                <strong style={{ color: "var(--text)" }}>Feature Attribution:</strong> Linear log-odds contributions{" "}
                (<code>contribution = weight × scaled_val</code>) with local accuracy matching model log-odds.
              </li>
              <li>
                <strong style={{ color: "var(--text)" }}>Immutable Audit Trail:</strong> All mutations (creates,
                edits, deletes, and credential modifications) are logged permanently with actual execution timestamps.
              </li>
            </ul>
          </div>

          <div className="settings-card-footer">
            <span className="small muted">
              Need assistance? Use the <strong>AI Assistant (/assistant)</strong> or check the sidebar documentation guides.
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
