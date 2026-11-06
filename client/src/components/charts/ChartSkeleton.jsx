export default function ChartSkeleton({ height = 240 }) {
  return (
    <div
      role="progressbar"
      aria-label="Loading chart data"
      style={{
        width: "100%",
        height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        gap: "12px",
        padding: "16px",
        background: "var(--surface-raised, #171c27)",
        borderRadius: "12px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "16px",
          width: "40%",
          height: "14px",
          background: "var(--border, #252b39)",
          borderRadius: "4px",
          opacity: 0.6,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          height: "70%",
          gap: "12px",
        }}
      >
        {[45, 75, 55, 90, 60, 80, 40, 70].map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${h}%`,
              background: "var(--border, #252b39)",
              borderRadius: "4px 4px 0 0",
              opacity: 0.5 + (i % 3) * 0.15,
            }}
          />
        ))}
      </div>
      <div
        style={{
          width: "100%",
          height: "2px",
          background: "var(--border-strong, #363e50)",
        }}
      />
    </div>
  );
}
