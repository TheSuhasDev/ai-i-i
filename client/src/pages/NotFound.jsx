import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div style={{ minHeight: "65vh", display: "grid", placeItems: "center", padding: "24px" }}>
      <div className="card" style={{ maxWidth: "520px", textAlign: "center", padding: "40px" }}>
        <div style={{ fontSize: "52px", fontWeight: 800, color: "var(--accent)", lineHeight: 1, marginBottom: "12px", fontFamily: "var(--font-heading)" }}>
          404
        </div>
        <h2 style={{ marginBottom: "10px" }}>Page Not Found</h2>
        <p className="muted" style={{ marginBottom: "24px", lineHeight: 1.6 }}>
          The page or inventory resource you requested does not exist or may have been moved.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <Link to="/" className="btn primary">
            Back to Dashboard
          </Link>
          <Link to="/products" className="btn">
            View Products
          </Link>
        </div>
      </div>
    </div>
  );
}
