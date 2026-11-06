export default function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
  unit = "",
}) {
  if (!active || !payload || !payload.length) return null;

  const titleText = labelFormatter ? labelFormatter(label) : label;

  return (
    <div
      className="custom-chart-tooltip"
      style={{
        background: "var(--surface, #11151e)",
        border: "1px solid var(--border-strong, #363e50)",
        borderRadius: "10px",
        padding: "10px 12px",
        boxShadow: "var(--shadow-pop, 0 12px 30px rgba(0,0,0,0.45))",
        fontSize: "12px",
        color: "var(--text, #f3f4f7)",
        minWidth: "150px",
        maxWidth: "280px",
        pointerEvents: "none",
        zIndex: 100,
      }}
    >
      {titleText && (
        <div
          style={{
            fontWeight: 600,
            marginBottom: "6px",
            paddingBottom: "4px",
            borderBottom: "1px solid var(--border, #252b39)",
            color: "var(--text, #f3f4f7)",
          }}
        >
          {titleText}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {payload
          .filter((item) => item.value != null && item.name !== "low" && item.dataKey !== "low")
          .map((item, idx) => {
            const formatted = formatter
              ? formatter(item.value, item.name, item)
              : [`${item.value}${unit ? ` ${unit}` : ""}`, item.name];
            const [valText, nameText] = Array.isArray(formatted) ? formatted : [formatted, item.name];

            const color = item.color || item.fill || item.stroke || "var(--chart-1)";

            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--muted)" }}>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: color,
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  <span>{nameText}</span>
                </span>
                <strong style={{ color: "var(--text)", fontWeight: 600 }}>{valText}</strong>
              </div>
            );
          })}
      </div>
    </div>
  );
}
