import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../context/useAuth";
import { errorMessage } from "../services/api";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Invalid email or password. Please check your credentials and try again.");
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={submit}>
        <h2>AI Inventory Intelligence</h2>
        <p className="muted">Sign in to continue</p>
        {error && <div className="alert">{error}</div>}
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="email"
          />
        </label>
        <label className="field">
          <span>Password</span>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{ width: "100%", paddingRight: "44px" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              style={{
                position: "absolute",
                right: "4px",
                background: "transparent",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                padding: "4px 8px",
                fontSize: "12px",
                fontWeight: 600,
              }}
              title={showPassword ? "Hide password" : "Show password"}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>
        <button className="btn primary" disabled={busy} style={{ marginTop: "8px" }}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
        <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 650 }}>Quick Demo Fill</span>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              className="btn small"
              style={{ flex: 1 }}
              onClick={() => {
                setEmail("admin@inventory.com");
                setPassword("Admin@123");
              }}
            >
              Admin
            </button>
            <button
              type="button"
              className="btn small"
              style={{ flex: 1 }}
              onClick={() => {
                setEmail("manager@inventory.com");
                setPassword("Manager@123");
              }}
            >
              Manager
            </button>
            <button
              type="button"
              className="btn small"
              style={{ flex: 1 }}
              onClick={() => {
                setEmail("staff@inventory.com");
                setPassword("Staff@123");
              }}
            >
              Staff
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}