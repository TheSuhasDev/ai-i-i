import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  TrendingUp,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Boxes,
} from "lucide-react";
import useAuth from "../context/useAuth";
import { errorMessage } from "../services/api";

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Demand Forecasting",
    desc: "ML-based predictions of future demand.",
  },
  {
    icon: RefreshCw,
    title: "Smart Reorders",
    desc: "Know which products to restock and when.",
  },
  {
    icon: ShieldCheck,
    title: "Supplier Insights",
    desc: "Track delays and reliability.",
  },
  {
    icon: Sparkles,
    title: "AI Assistant",
    desc: "Ask questions about your inventory in plain English.",
  },
];

const TECH_STACK = ["React", "Node.js", "MongoDB", "Python ML"];

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
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-[var(--bg)] text-[var(--text)] selection:bg-[var(--accent)]/30">
      {/* Left panel: Project Showcase (Desktop lg+) */}
      <div className="hidden lg:flex flex-col justify-between p-10 xl:p-14 border-r border-[var(--border)] bg-gradient-to-br from-[var(--bg)] via-[var(--surface)] to-[var(--bg-raised)] relative overflow-hidden">
        <div className="max-w-xl mx-auto w-full flex flex-col justify-between h-full space-y-8 z-10">
          {/* Header Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/20 text-[var(--primary-contrast)]">
              <Boxes className="w-5 h-5" />
            </div>
            <span className="font-extrabold tracking-tight text-xl text-[var(--text)] font-heading">
              AI Inventory Intelligence
            </span>
          </div>

          {/* Headline & Subtext */}
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold tracking-tight text-[var(--text)] leading-[1.15]">
              Know what to stock,{" "}
              <span className="text-[var(--accent)] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] bg-clip-text text-transparent">
                before you run out.
              </span>
            </h1>
            <p className="text-base text-[var(--muted)] leading-relaxed">
              AI-powered inventory and supply chain intelligence for smarter reorder decisions.
            </p>
          </div>

          {/* Real UI Telemetry Preview Card */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/90 backdrop-blur-md p-4 shadow-xl shadow-black/25 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--text)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--danger)] animate-pulse" />
                Live Telemetry &bull; Critical Stockout Alert
              </span>
              <span className="pill status-critical" style={{ fontSize: "10.5px", padding: "1px 7px" }}>
                Reorder Now
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div>
                <div className="font-bold text-[var(--text)]">USB 3.0 Hub (SKU: P008)</div>
                <div className="text-xs text-[var(--muted)]">Lead time: 5 days &bull; TechCorp Logistics</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[var(--muted)]">Suggested Qty</div>
                <span className="font-mono font-bold text-sm text-[var(--accent)]">+120 units</span>
              </div>
            </div>
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px] text-[var(--muted)]">
                <span>Current Stock: 14 units</span>
                <span>Reorder Point: 65 units</span>
              </div>
              <div className="w-full bg-[var(--surface)] h-2 rounded-full overflow-hidden border border-[var(--border)]">
                <div className="bg-[var(--danger)] h-full rounded-full transition-all duration-500" style={{ width: "21%" }} />
              </div>
            </div>
          </div>

          {/* 4 Feature Items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="flex items-start gap-3 p-2.5 rounded-lg transition-colors hover:bg-[var(--surface-hover)]/40">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--accent)] shrink-0 mt-0.5 shadow-sm">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--text)] leading-tight">{feature.title}</h2>
                    <p className="text-xs text-[var(--muted)] mt-0.5 leading-snug">{feature.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tech Stack Chips */}
          <div className="pt-4 border-t border-[var(--border)] flex flex-wrap items-center gap-2">
            <span className="text-xs text-[var(--subtle)] font-semibold uppercase tracking-wider mr-1">
              Stack:
            </span>
            {TECH_STACK.map((tech) => (
              <span
                key={tech}
                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--muted)]"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel: Login Card */}
      <div className="flex items-center justify-center p-6 sm:p-10 lg:p-12 w-full min-h-screen relative">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile-only branding header */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/20 text-[var(--primary-contrast)]">
              <Boxes className="w-5 h-5" />
            </div>
            <span className="font-extrabold tracking-tight text-lg text-[var(--text)] font-heading">
              AI Inventory Intelligence
            </span>
          </div>

          <form className="card login-card w-full shadow-2xl shadow-black/40 border border-[var(--border-strong)]" onSubmit={submit}>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[var(--text)]">Sign In</h2>
              <p className="muted text-sm mt-1">Access your inventory and supply chain workspace</p>
            </div>

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
                placeholder="name@company.com"
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
                  placeholder="••••••••"
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
              <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 650 }}>
                Quick Demo Fill
              </span>
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

          {/* Mobile teaser features footer */}
          <div className="lg:hidden mt-8 pt-6 border-t border-[var(--border)] text-center text-xs text-[var(--muted)] space-y-2">
            <p className="font-medium text-[var(--text)]">AI-powered supply chain &amp; inventory intelligence</p>
            <div className="flex justify-center gap-2 flex-wrap">
              {TECH_STACK.map((tech) => (
                <span key={tech} className="px-2 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border)] text-[11px]">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
