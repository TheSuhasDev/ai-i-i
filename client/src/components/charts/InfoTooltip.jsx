import { useState } from "react";
import { JARGON_DEFINITIONS } from "./theme";

export default function InfoTooltip({ term, text }) {
  const [open, setOpen] = useState(false);
  const content = text || JARGON_DEFINITIONS[term] || term;

  if (!content) return null;

  return (
    <span
      className="chart-info-tooltip-wrap"
      style={{ position: "relative", display: "inline-flex", alignItems: "center", marginLeft: "6px" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={`Definition for ${term || "term"}`}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          background: "var(--surface-raised, #171c27)",
          border: "1px solid var(--border-strong, #363e50)",
          color: "var(--muted, #9ca3af)",
          fontSize: "10px",
          fontWeight: 700,
          cursor: "help",
          padding: 0,
          lineHeight: 1,
        }}
      >
        i
      </button>

      {open && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            zIndex: 60,
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            width: "max-content",
            maxWidth: "260px",
            padding: "8px 10px",
            borderRadius: "8px",
            background: "var(--surface, #11151e)",
            color: "var(--text, #f3f4f7)",
            border: "1px solid var(--border-strong, #363e50)",
            boxShadow: "var(--shadow-pop, 0 10px 25px rgba(0,0,0,0.5))",
            fontSize: "11.5px",
            lineHeight: 1.4,
            fontWeight: 400,
            textAlign: "left",
            pointerEvents: "none",
          }}
        >
          {term && <strong style={{ display: "block", marginBottom: "2px", color: "var(--accent, #a5b4fc)" }}>{term}</strong>}
          {content}
        </span>
      )}
    </span>
  );
}
