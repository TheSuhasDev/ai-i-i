import { useCallback } from "react";
import { insightService } from "../services";
import useFetch from "../hooks/useFetch";
import { fmtRiskPct } from "../utils/format";
import Icon from "./Icon";
import { ChartCard } from "./charts";

const PLAIN_LABELS = {
  stock: "Current inventory level",
  "stock level": "Current inventory level",
  demand: "Sales momentum & growth",
  "demand trend": "Sales momentum & growth",
  supplier: "Supplier reliability & delay history",
  lead_time: "Supplier procurement lead time",
  buffer: "Safety stock buffer",
};

export default function WhyPanel({ code }) {
  const fetchExplain = useCallback(() => insightService.explain(code), [code]);
  const { data, loading, error } = useFetch(fetchExplain);
  const e = data?.data;

  if (loading) {
    return (
      <ChartCard
        title="Why is the stockout risk what it is?"
        subtitle="Calculating explainable AI drivers..."
        loading={true}
      />
    );
  }
  if (error || !e) {
    return (
      <ChartCard
        title="Why is the stockout risk what it is?"
        subtitle="Identifies the operational drivers of stockout probability."
        error={error || "Explanation not available."}
      />
    );
  }

  const factors = e.factors || [];
  const rawTotal = factors.reduce((sum, f) => sum + (Number(f.share_pct) || 0), 0);
  const normalizedFactors = factors
    .map((f) => {
      const raw = Number(f.share_pct) || 0;
      const share = rawTotal > 0 ? (raw / rawTotal) * 100 : 0;
      const labelKey = (f.label || f.group || "").toLowerCase();
      const plainLabel = PLAIN_LABELS[labelKey] || f.label || "Inventory factor";
      return {
        ...f,
        displayLabel: plainLabel,
        displayShare: Math.round(share),
      };
    })
    .sort((a, b) => b.displayShare - a.displayShare);

  if (normalizedFactors.length > 0) {
    const diff = 100 - normalizedFactors.reduce((sum, f) => sum + f.displayShare, 0);
    if (diff !== 0) {
      const maxIdx = normalizedFactors.reduce(
        (best, f, i, arr) => (f.displayShare > arr[best].displayShare ? i : best),
        0
      );
      normalizedFactors[maxIdx].displayShare += diff;
    }
  }

  const topFactor = normalizedFactors[0];
  const takeaway = topFactor
    ? `${topFactor.displayLabel} is the primary driver, accounting for ${topFactor.displayShare}% of the evaluated risk.`
    : "Multiple balanced factors contribute to the risk score.";
  const takeawayTone = (e.risk_pct || 0) >= 70 ? "critical" : (e.risk_pct || 0) >= 30 ? "warning" : "healthy";

  return (
    <ChartCard
      title={`Why is the stockout risk ${fmtRiskPct(e.risk_pct)}?`}
      subtitle="Explainable AI breakdown showing the primary forces driving stockout probability."
      jargon="SHAP"
      takeaway={takeaway}
      takeawayTone={takeawayTone}
      ariaLabel="Explainable AI stockout risk breakdown"
    >
      <p style={{ margin: "0 0 12px 0", fontSize: "0.9rem", color: "var(--text)", lineHeight: 1.5 }}>
        {e.summary || "Summary not available."}
      </p>

      {normalizedFactors.length === 0 ? (
        <p className="muted">No primary risk factors identified.</p>
      ) : (
        <ul className="factors" style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
          {normalizedFactors.map((f) => {
            const isRaises = f.direction === "raises";
            const color = isRaises ? "var(--danger, #ef4444)" : "var(--success, #10b981)";

            return (
              <li
                key={f.group || f.displayLabel}
                className={f.direction}
                style={{
                  background: "var(--surface-raised, #171c27)",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  borderLeft: `4px solid ${color}`,
                }}
              >
                <div
                  className="factor-head"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    flexWrap: "wrap",
                    marginBottom: "6px",
                  }}
                >
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        color,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name={isRaises ? "alert" : "check"} size={16} />
                    </span>
                    <strong style={{ fontSize: "0.95rem", color: "var(--text)" }}>{f.displayLabel}</strong>
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
                    <span
                      className={`pill ${isRaises ? "status-critical" : "status-healthy"}`}
                      style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px" }}
                    >
                      {isRaises ? "Raises risk" : "Lowers risk"}
                    </span>
                    <strong style={{ fontSize: "0.95rem", color: "var(--text)" }}>{f.displayShare}% of effect</strong>
                  </div>
                </div>

                <div
                  className="bar contribution-bar"
                  role="meter"
                  aria-label={`${f.displayLabel} contribution`}
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow={f.displayShare}
                  style={{
                    width: "100%",
                    height: "8px",
                    background: "var(--border, #252b39)",
                    borderRadius: "4px",
                    overflow: "hidden",
                    margin: "6px 0",
                  }}
                >
                  <div
                    style={{
                      width: `${f.displayShare}%`,
                      height: "100%",
                      background: color,
                      borderRadius: "4px",
                      transition: "width 200ms ease",
                    }}
                  />
                </div>
                <p className="muted small" style={{ margin: "4px 0 0 0", fontSize: "0.82rem", lineHeight: 1.4 }}>
                  {f.reason}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {e.note && (
        <p className="muted small" style={{ margin: "10px 0 0 0", fontSize: "0.78rem" }}>
          {e.note}
        </p>
      )}
    </ChartCard>
  );
}
