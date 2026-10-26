import { useState } from "react";
import { Link } from "react-router-dom";
import ProductThumb from "./ProductThumb";

const ABC = [["A", "high value"], ["B", "medium"], ["C", "low value"]];
const XYZ = [["X", "predictable"], ["Y", "variable"], ["Z", "erratic"]];

export default function AbcXyzMatrix({ items = [] }) {
  const [selectedCell, setSelectedCell] = useState(null);

  const cells = {};
  items.forEach((i) => {
    const c = i.data?.classification;
    if (c) (cells[`${c.abc}${c.xyz}`] ||= []).push(i);
  });
  const max = Math.max(1, ...Object.values(cells).map((a) => a.length));

  const activeProducts = selectedCell ? cells[selectedCell] || [] : [];

  return (
    <div>
      <table className="matrix">
        <thead>
          <tr>
            <th></th>
            {XYZ.map(([k, label]) => (
              <th key={k}>{k}<br /><span className="muted small">{label}</span></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ABC.map(([a, aLabel]) => (
            <tr key={a}>
              <th>{a}<br /><span className="muted small">{aLabel}</span></th>
              {XYZ.map(([x]) => {
                const cellKey = `${a}${x}`;
                const list = cells[cellKey] || [];
                const isSelected = selectedCell === cellKey;
                const tooltipText = list.length
                  ? `${cellKey} (${list.length} products):\n` +
                    list.map((i) => `• ${i.productCode} - ${i.data?.name || i.productCode}`).join("\n")
                  : `${cellKey}: No products`;

                return (
                  <td
                    key={x}
                    onClick={() => setSelectedCell((prev) => (prev === cellKey ? null : cellKey))}
                    style={{
                      background: isSelected
                        ? "color-mix(in srgb, var(--accent) 24%, var(--surface-raised))"
                        : `color-mix(in srgb, var(--chart-1) ${list.length ? 12 + 48 * (list.length / max) : 0}%, var(--surface-raised))`,
                      cursor: list.length ? "pointer" : "default",
                      outline: isSelected ? "2px solid var(--accent-strong)" : "none",
                      transition: "all 150ms ease",
                      padding: "16px 8px",
                    }}
                    title={tooltipText}
                    role="button"
                    tabIndex={list.length ? 0 : -1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedCell((prev) => (prev === cellKey ? null : cellKey));
                      }
                    }}
                  >
                    <div className="matrix-count" style={{ fontSize: "22px", fontWeight: 700 }}>
                      {list.length}
                    </div>
                    <div className="muted small" style={{ fontSize: "11px", marginTop: "2px" }}>
                      {list.length === 1 ? "product" : "products"}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {selectedCell && activeProducts.length > 0 && (
        <div className="matrix-detail card" style={{ marginTop: "16px", padding: "14px 16px", animation: "fade-in 200ms ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontWeight: 600, fontSize: "14px" }}>
              Products in category {selectedCell} ({activeProducts.length})
            </span>
            <button
              type="button"
              className="btn small"
              onClick={() => setSelectedCell(null)}
              style={{ fontSize: "11px", padding: "2px 8px" }}
            >
              Close
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
            {activeProducts.map((i) => (
              <Link
                key={i.productCode}
                to={`/product/${i.productCode}`}
                className="chip"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 8px",
                  textDecoration: "none",
                  color: "var(--text)",
                }}
                title={i.data?.name || i.productCode}
              >
                <ProductThumb product={{ code: i.productCode, name: i.data?.name }} size="sm" />
                <span>
                  <strong>{i.productCode}</strong> - {i.data?.name || i.productCode}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
