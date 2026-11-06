import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNavigate } from "react-router-dom";
import { ChartCard, ChartTooltip, CHART_GRID_PROPS, X_AXIS_PROPS, Y_AXIS_PROPS } from "./charts";

const COLORS = {
  Critical: "var(--danger, #ef4444)",
  Warning: "var(--warning, #f59e0b)",
  Healthy: "var(--success, #10b981)",
};

export default function HealthChart({ items = [], onSelectStatus, selectedStatus }) {
  const navigate = useNavigate();

  const counts = {
    Critical: items.filter((i) => i.healthStatus === "Critical").length,
    Warning: items.filter((i) => i.healthStatus === "Warning").length,
    Healthy: items.filter((i) => i.healthStatus === "Healthy").length,
  };

  const data = [
    { name: "Critical", count: counts.Critical, label: "Critical Risk" },
    { name: "Warning", count: counts.Warning, label: "Needs Review" },
    { name: "Healthy", count: counts.Healthy, label: "Healthy Buffer" },
  ];

  const total = items.length || 1;
  const criticalCount = counts.Critical;
  const warningCount = counts.Warning;

  let takeaway = "Inventory levels are well-balanced across products.";
  let takeawayTone = "healthy";
  if (criticalCount > 0) {
    takeaway = `${criticalCount} product${criticalCount > 1 ? "s are" : " is"} in critical status with immediate stockout danger.`;
    takeawayTone = "critical";
  } else if (warningCount > 0) {
    takeaway = `Most products are healthy; ${warningCount} need${warningCount === 1 ? "s" : ""} monitoring before buffers run out.`;
    takeawayTone = "warning";
  }

  const handleBarClick = (entry) => {
    if (onSelectStatus) {
      onSelectStatus(entry.name);
    } else {
      navigate(`/alerts?priority=${entry.name}`);
    }
  };

  return (
    <ChartCard
      title="How healthy is our overall inventory?"
      subtitle="Products categorized by stock cover, supplier lead times, and demand risk. Click a bar to filter."
      takeaway={takeaway}
      takeawayTone={takeawayTone}
      ariaLabel="Product health distribution chart"
    >
      <div style={{ width: "100%", height: 250 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 24, right: 15, bottom: 10, left: 0 }}>
            <CartesianGrid {...CHART_GRID_PROPS} />
            <XAxis dataKey="name" {...X_AXIS_PROPS} />
            <YAxis
              allowDecimals={false}
              width={35}
              {...Y_AXIS_PROPS}
              label={{
                value: "Products",
                angle: -90,
                position: "insideLeft",
                offset: 10,
                fill: "var(--muted)",
                fontSize: 11,
                textAnchor: "middle",
              }}
            />
            <Tooltip
              content={
                <ChartTooltip
                  formatter={(value) => [
                    `${value} product${value === 1 ? "" : "s"} (${Math.round((value / total) * 100)}%)`,
                    "Count",
                  ]}
                />
              }
            />
            <Bar
              dataKey="count"
              name="Products"
              cursor="pointer"
              isAnimationActive={false}
              radius={[6, 6, 0, 0]}
              onClick={handleBarClick}
            >
              <LabelList
                dataKey="count"
                position="top"
                offset={6}
                fill="var(--text)"
                fontSize={12}
                fontWeight={600}
                formatter={(val) => (val > 0 ? val : "")}
              />
              {data.map((d) => {
                const isSelected = selectedStatus === d.name;
                return (
                  <Cell
                    key={d.name}
                    fill={COLORS[d.name]}
                    opacity={selectedStatus && !isSelected ? 0.35 : 1}
                    stroke={isSelected ? "var(--text)" : "none"}
                    strokeWidth={isSelected ? 2 : 0}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {selectedStatus && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
          <span className="muted small">Filtering list below by <strong>{selectedStatus}</strong></span>
          <button
            type="button"
            className="btn small"
            style={{ fontSize: "11px", padding: "2px 8px" }}
            onClick={() => onSelectStatus?.(null)}
          >
            Clear filter
          </button>
        </div>
      )}
    </ChartCard>
  );
}
