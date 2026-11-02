import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "80vh", display: "grid", placeItems: "center", padding: "24px" }}>
          <div className="card" style={{ maxWidth: "520px", textAlign: "center", padding: "36px" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>⚠️</div>
            <h2 style={{ marginBottom: "8px" }}>Something went wrong</h2>
            <p className="muted" style={{ marginBottom: "20px" }}>
              An unexpected interface error occurred. You can retry refreshing the view or return to the dashboard.
            </p>
            {this.state.error && (
              <pre className="code-font small" style={{ background: "var(--bg)", padding: "12px", borderRadius: "8px", overflowX: "auto", textAlign: "left", marginBottom: "20px" }}>
                {String(this.state.error.message || this.state.error)}
              </pre>
            )}
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button type="button" className="btn primary" onClick={this.handleRetry}>
                Reload Application
              </button>
              <a href="/" className="btn">
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

