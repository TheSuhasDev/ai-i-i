import { useCallback } from "react";
import { insightService } from "../services";
import useFetch from "../hooks/useFetch";
import { num } from "../utils/format";
import Icon from "./Icon";

export default function WhyPanel({ code }) {
  const fetchExplain = useCallback(() => insightService.explain(code), [code]);
  const { data, loading, error } = useFetch(fetchExplain);
  const e = data?.data;

  if (loading) {
    return (
      <div className="card why">
        <h3>Why is the stockout risk what it is?</h3>
        <p className="muted">Calculating explanation...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="card why">
        <h3>Why is the stockout risk what it is?</h3>
        <div className="alert">{error}</div>
      </div>
    );
  }

  return (
    <div className="card why">
      <h3>Why is the stockout risk {num(e.risk_pct, 0)}%?</h3>
      <p>{e.summary}</p>
      <ul className="factors">
        {e.factors.map((f) => (
          <li key={f.group} className={f.direction}>
            <div className="factor-head">
              <span className={`factor-icon ${f.direction}`}><Icon name={f.direction === "raises" ? "alert" : "check"} size={16} /></span>
              <strong>{f.label}</strong>
              <span className="dir">{f.direction === "raises" ? "raises risk" : "lowers risk"}</span>
              <span className="muted small">{num(f.share_pct, 0)}% of the effect</span>
            </div>
            <div className={`bar contribution-bar ${f.direction}`} role="meter" aria-label={`${f.label} contribution`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={f.share_pct}>
              <div style={{ width: `${f.share_pct}%` }} />
            </div>
            <p className="muted small">{f.reason}</p>
          </li>
        ))}
      </ul>
      <p className="muted small">{e.note}</p>
    </div>
  );
}
