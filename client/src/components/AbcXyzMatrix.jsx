import { useState } from "react";
import { Link } from "react-router-dom";
import ProductThumb from "./ProductThumb";
import { ChartCard } from "./charts";

const CAPTIONS = {
  AX: "High value / steady demand",
  AY: "High value / variable demand",
  AZ: "High value / erratic demand",
  BX: "Medium value / steady demand",
  BY: "Medium value / variable demand",
  BZ: "Medium value / erratic demand",
  CX: "Low value / steady demand",
  CY: "Low value / variable demand",
  CZ: "Low value / erratic demand",
};

const ABC = [["A", "High value (top 80%)"], ["B", "Medium value (next 15%)"], ["C", "Low value (bottom 5%)"]];
const XYZ = [["X", "Steady demand"], ["Y", "Variable demand"], ["Z", "Erratic demand"]];

export default function AbcXyzMatrix({ items = [] }) {
  const [selectedCell, setSelectedCell] = useState(null);

  const cells = {};
  items.forEach((i) => {
    const c = i.data?.classification;
    if (c) (cells[`${c.abc}${c.xyz}`] ||= []).push(i);
  });
  const max = Math.max(1, ...Object.values(cells).map((a) => a.length));

  const activeProducts = selectedCell ? cells[selectedCell] || [] : [];

  const axCount = (cells.AX || []).length;
  const ayCount = (cells.AY || []).length;
  const azCount = (cells.AZ || []).length;
  const totalA = axCount + ayCount + azCount;

  const takeaway = `${totalA} high-value (Class A) products generate the core of business revenue; ${axCount} have steady demand while ${azCount} require safety buffers.`;

  return (
    <ChartCard
      title="ABC-XYZ Demand & Value Matrix"
      subtitle="Groups products by revenue importance (ABC) and sales predictability (XYZ). Click any cell to inspect products."
      jargon="ABC-XYZ"
      takeaway={takeaway}
      takeawayTone="info"
      ariaLabel="ABC-XYZ classification matrix"
    >
      <div>
        <table className="matrix" style={{ width: "100%", borderCollapse: "separate", borderSpacing: "4px" }}>
          <thead>
            <tr>
              <th style={{ width: "90px" }}></th>
              {XYZ.map(([k, label]) => (
                <th key={k} style={{ textAlign: "center", padding: "6px" }}>
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text)" }}>Class {k}</div>
                  <span className="muted small" style={{ fontSize: "11px", fontWeight: 400 }}>{label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ABC.map(([a, aLabel]) => (
              <tr key={a}>
                <th style={{ textAlign: "left", padding: "8px 6px", verticalAlign: "middle" }}>
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text)" }}>Class {a}</div>
                  <span className="muted small" style={{ fontSize: "10.5px", fontWeight: 400, display: "block" }}>
                    {aLabel}
                  </span>
                </th>
                {XYZ.map(([x]) => {
                  const cellKey = `${a}${x}`;
                  const list = cells[cellKey] || [];
                  const isSelected = selectedCell === cellKey;
                  const ratio = list.length / max;

                  return (
                    <td
                      key={x}
                      onClick={() => setSelectedCell((prev) => (prev === cellKey ? null : cellKey))}
                      style={{
                        background: isSelected
                          ? "color-mix(in srgb, var(--accent, #818cf8) 28%, var(--surface-raised, #171c27))"
                          : `color-mix(in srgb, var(--chart-1, #818cf8) ${list.length ? 12 + 48 * ratio : 2}%, var(--surface-raised, #171c27))`,
                        cursor: list.length ? "pointer" : "default",
                        outline: isSelected ? "2px solid var(--accent-strong, #818cf8)" : "none",
                        transition: "all 150ms ease",
                        padding: "12px 6px",
                        textAlign: "center",
                        borderRadius: "8px",
                      }}
                      title={`${cellKey}: ${CAPTIONS[cellKey]} (${list.length} products)`}
                      role="button"
                      tabIndex={list.length ? 0 : -1}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedCell((prev) => (prev === cellKey ? null : cellKey));
                        }
                      }}
                    >
                      <div className="matrix-count" style={{ fontSize: "20px", fontWeight: 700, color: "var(--text)" }}>
                        {list.length}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px", fontWeight: 500 }}>
                        {CAPTIONS[cellKey]}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Color scale legend */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "12px",
            fontSize: "11px",
            color: "var(--muted)",
          }}
        >
          <span>Fewer products</span>
          <div
            style={{
              flex: 1,
              maxWidth: "160px",
              height: "8px",
              margin: "0 10px",
              borderRadius: "4px",
              background: "linear-gradient(to right, color-mix(in srgb, var(--chart-1) 12%, var(--surface-raised)), color-mix(in srgb, var(--chart-1) 60%, var(--surface-raised)))",
            }}
          />
          <span>More products</span>
        </div>

        {selectedCell && activeProducts.length > 0 && (
          <div
            className="matrix-detail card"
            style={{
              marginTop: "14px",
              padding: "12px 14px",
              background: "var(--surface-raised, #171c27)",
              borderRadius: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <div>
                <strong style={{ fontSize: "13px", color: "var(--text)" }}>
                  Category {selectedCell}: {CAPTIONS[selectedCell]}
                </strong>
                <span className="muted small" style={{ marginLeft: "8px" }}>
                  ({activeProducts.length} product{activeProducts.length === 1 ? "" : "s"})
                </span>
              </div>
              <button
                type="button"
                className="btn small"
                onClick={() => setSelectedCell(null)}
                style={{ fontSize: "11px", padding: "2px 8px" }}
              >
                Close
              </button>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                maxHeight: "180px",
                overflowY: "auto",
              }}
            >
              {activeProducts.map((i) => (
                <Link
                  key={i.productCode}
                  to={`/products/${i.productCode}`}
                  className="chip"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 8px",
                    textDecoration: "none",
                    color: "var(--text)",
                    background: "var(--surface)",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
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
    </ChartCard>
  );
}
